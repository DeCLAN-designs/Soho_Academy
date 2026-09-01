const pool = require("../config/db.js");
const { getAssignmentsForDate } = require('./vehicleRouteAssignment.service.js');
const transportCalendarService = require('./transportCalendar.service.js');
const { normalizeDate, getTodayDateInTimezone } = require('../utils/date.js');

/**
 * Centralized Trip Generation Service
 * 
 * This service provides a single, idempotent trip generation engine that:
 * 1. Validates transport availability
 * 2. Checks all prerequisites
 * 3. Creates trips and attendance records atomically
 * 4. Prevents duplicates via database constraints
 * 5. Provides consistent behavior for cron, API, and CLI
 */

/**
 * Generate trips for a specific date
 * 
 * @param {Object} options - Generation options
 * @param {string} options.date - Target date (YYYY-MM-DD format)
 * @param {boolean} options.force - Force regeneration even if trips exist
 * @param {number} options.userId - User ID initiating manual generation
 * @param {string} options.generationSource - Source of generation ('cron', 'api', 'cli')
 * @returns {Object} Generation result with statistics
 */
const generateTripsForDate = async ({ date, force = false, userId = null, generationSource = 'cli' }) => {
  const targetDate = normalizeDate(date) || getTodayDateInTimezone();
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Step 1: Validate transport availability
    const transportCheck = await transportCalendarService.isTransportDay(targetDate);
    if (!transportCheck.transportEnabled) {
      await connection.rollback();
      return {
        success: true,
        message: `Transport disabled for ${targetDate} (${transportCheck.source}). Skipping generation.`,
        stats: {
          date: targetDate,
          transportEnabled: false,
          source: transportCheck.source,
          tripsCreated: 0,
          tripsSkipped: 0,
          attendanceCreated: 0,
          assignmentsProcessed: 0
        }
      };
    }
    
    // Step 2: Get active vehicle-route assignments
    const assignments = await getAssignmentsForDate({ date: targetDate });
    if (assignments.length === 0) {
      await connection.rollback();
      return {
        success: true,
        message: `No active vehicle-route assignments found for ${targetDate}. Skipping generation.`,
        stats: {
          date: targetDate,
          transportEnabled: true,
          assignmentsProcessed: 0,
          tripsCreated: 0,
          tripsSkipped: 0,
          attendanceCreated: 0
        }
      };
    }
    
    // Step 3: Process each assignment
    let tripsCreated = 0;
    let tripsSkipped = 0;
    let attendanceCreated = 0;
    let assignmentsProcessed = 0;
    const duplicatePreventions = [];
    
    for (const assignment of assignments) {
      assignmentsProcessed++;
      
      // Determine time periods to generate
      const timePeriods = assignment.timePeriod === 'Both' 
        ? ['Morning', 'Evening'] 
        : [assignment.timePeriod];
      
      for (const period of timePeriods) {
        const departureTime = period === 'Morning' ? '06:30:00' : '15:30:00';
        const returnTime = period === 'Morning' ? '08:30:00' : '17:30:00';
        const tripDateTime = `${targetDate} ${departureTime}`;
        
        // Check for existing trip (idempotency check)
        const timeCondition = period === 'Morning'
          ? "TIME(departure_time) < '12:00:00'"
          : "TIME(departure_time) >= '12:00:00'";
        
        const [existingTrip] = await connection.query(
          `SELECT id FROM trip_monitoring
           WHERE route_id = ? AND DATE(departure_time) = ? AND ${timeCondition}
           LIMIT 1`,
          [assignment.routeId, targetDate]
        );
        
        if (existingTrip.length > 0 && !force) {
          tripsSkipped++;
          duplicatePreventions.push({
            routeId: assignment.routeId,
            routeName: assignment.routeName,
            period,
            reason: 'existing_trip',
            existingTripId: existingTrip[0].id
          });
          continue;
        }
        
        // If force and trip exists, delete old trip and attendance first
        if (existingTrip.length > 0 && force) {
          await connection.query(
            `DELETE FROM student_attendance WHERE trip_id = ?`,
            [existingTrip[0].id]
          );
          await connection.query(
            `DELETE FROM trip_monitoring WHERE id = ?`,
            [existingTrip[0].id]
          );
        }
        
        // Step 4: Get student assignments for this route
        const [studentAssignments] = await connection.query(
          `SELECT student_id, stop_id, trip_type
           FROM student_route_assignment
           WHERE route_id = ?
             AND status = 'Active'
             AND effective_from <= ?
             AND (effective_to IS NULL OR effective_to >= ?)
             AND (trip_type = ? OR trip_type = 'Both')`,
          [assignment.routeId, targetDate, targetDate, period]
        );
        
        // Step 5: Create trip with attendance atomically
        const tripId = await createTripWithAttendance(connection, {
          routeId: assignment.routeId,
          vehiclePlate: assignment.vehiclePlate,
          driverName: assignment.driverName || '',
          assistantName: assignment.assistantName || null,
          departureTime: tripDateTime,
          expectedReturnTime: `${targetDate} ${returnTime}`,
          period,
          studentAssignments,
          userId,
          generationSource,
          targetDate
        });
        
        tripsCreated++;
        attendanceCreated += studentAssignments.length;
      }
    }
    
    await connection.commit();
    
    return {
      success: true,
      message: `Trip generation completed for ${targetDate}`,
      stats: {
        date: targetDate,
        transportEnabled: true,
        assignmentsProcessed,
        tripsCreated,
        tripsSkipped,
        attendanceCreated,
        duplicatePreventions
      }
    };
    
  } catch (error) {
    await connection.rollback();
    console.error(`Trip generation failed for ${targetDate}:`, error);
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Create a trip and its attendance records atomically
 * 
 * @param {Object} connection - Database connection (transaction)
 * @param {Object} tripData - Trip configuration
 * @returns {number} Created trip ID
 */
const createTripWithAttendance = async (connection, {
  routeId,
  vehiclePlate,
  driverName,
  assistantName,
  departureTime,
  expectedReturnTime,
  period,
  studentAssignments,
  userId,
  generationSource = 'cli',
  targetDate
}) => {
  const { v4: uuidv4 } = require('uuid');
  
  // Get route details for snapshot
  const [routes] = await connection.query(
    "SELECT * FROM routes WHERE id = ? AND deleted_at IS NULL LIMIT 1",
    [routeId]
  );
  
  if (routes.length === 0) {
    throw new Error(`Route ${routeId} not found or inactive`);
  }
  
  const route = routes[0];
  if (route.status !== "Active") {
    throw new Error(`Route ${routeId} is not active`);
  }
  
  // Create trip record
  const tripUuid = uuidv4();
  const insertValues = [
    null, // trip_id generated by DB
    tripUuid,
    route.id,
    period,
    departureTime,
    expectedReturnTime,
    vehiclePlate,
    driverName,
    assistantName,
    "Not Started",
    route.total_stops || 0,
    `Automated ${period} Trip`,
    JSON.stringify({
      id: route.id,
      route_code: route.route_id,
      route_name: route.route_name,
      total_stops: route.total_stops,
      status: route.status
    }),
    JSON.stringify(studentAssignments.map(sa => ({
      studentId: sa.student_id,
      stopId: sa.stop_id,
      tripType: sa.trip_type
    }))),
    1,
    userId,
    generationSource
  ];
  
  const [tripResult] = await connection.query(
    `INSERT INTO trip_monitoring (
      trip_id,
      trip_uuid,
      route_id,
      session,
      departure_time,
      expected_return_time,
      vehicle_plate,
      driver_name,
      assistant_name,
      status,
      total_stops,
      notes,
      route_snapshot,
      students_snapshot,
      version,
      created_by_user_id,
      generation_source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    insertValues
  );
  
  const tripId = tripResult.insertId;
  
  // Create attendance records for each student
  if (studentAssignments.length > 0) {
    const attendanceValues = studentAssignments.map(sa => [
      sa.student_id,
      sa.stop_id,
      tripId,
      period,
      'Absent', // Default boarding status
      'Pending', // Default dropoff status
      targetDate, // attendance_date
      null, // boarded_at
      null, // dropped_off_at
      userId, // confirmed_by_user_id
      null // notes
    ]);
    
    const placeholders = attendanceValues.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const flatValues = attendanceValues.flat();
    
    await connection.query(
      `INSERT INTO student_attendance (
        student_id, stop_id, trip_id, trip_type,
        boarding_status, dropoff_status, attendance_date,
        boarded_at, dropped_off_at, confirmed_by_user_id, notes
      ) VALUES ${placeholders}`,
      flatValues
    );
  }
  
  return tripId;
};

/**
 * Generate trips for a date range
 * 
 * @param {Object} options - Range generation options
 * @param {string} options.startDate - Start date (YYYY-MM-DD)
 * @param {string} options.endDate - End date (YYYY-MM-DD)
 * @param {boolean} options.force - Force regeneration
 * @param {number} options.userId - User ID
 * @param {string} options.generationSource - Source of generation
 * @returns {Object} Generation results for each date
 */
const generateTripsForRange = async ({ startDate, endDate, force = false, userId = null, generationSource = 'cli' }) => {
  const normalizedStart = normalizeDate(startDate);
  const normalizedEnd = normalizeDate(endDate);
  
  if (!normalizedStart || !normalizedEnd) {
    throw new Error('Invalid startDate or endDate. Expected YYYY-MM-DD.');
  }
  
  const start = new Date(normalizedStart);
  const end = new Date(normalizedEnd);
  
  if (start > end) {
    throw new Error('startDate must be before or equal to endDate.');
  }
  
  const results = [];
  let current = new Date(start);
  
  while (current <= end) {
    const dateString = current.toISOString().slice(0, 10);
    const result = await generateTripsForDate({ date: dateString, force, userId, generationSource });
    results.push(result);
    current.setDate(current.getDate() + 1);
  }
  
  return {
    success: true,
    message: `Trip generation completed for range ${normalizedStart} to ${normalizedEnd}`,
    results,
    summary: {
      totalDates: results.length,
      totalTripsCreated: results.reduce((sum, r) => sum + r.stats.tripsCreated, 0),
      totalAttendanceCreated: results.reduce((sum, r) => sum + r.stats.attendanceCreated, 0),
      totalTripsSkipped: results.reduce((sum, r) => sum + r.stats.tripsSkipped, 0)
    }
  };
};

/**
 * Validate trip generation prerequisites for a date
 * 
 * @param {string} date - Target date
 * @returns {Object} Validation result
 */
const validateTripGenerationPrerequisites = async (date) => {
  const targetDate = normalizeDate(date) || getTodayDateInTimezone();
  
  const checks = {
    transportAvailable: false,
    assignmentsExist: false,
    studentsAssigned: false,
    routesActive: false,
    vehiclesAvailable: false,
    details: {}
  };
  
  try {
    // Check transport availability
    const transportCheck = await transportCalendarService.isTransportDay(targetDate);
    checks.transportAvailable = transportCheck.transportEnabled;
    checks.details.transport = transportCheck;
    
    if (!checks.transportAvailable) {
      return {
        valid: false,
        reason: 'Transport not available',
        checks
      };
    }
    
    // Check assignments
    const assignments = await getAssignmentsForDate({ date: targetDate });
    checks.assignmentsExist = assignments.length > 0;
    checks.details.assignments = assignments;
    
    if (!checks.assignmentsExist) {
      return {
        valid: false,
        reason: 'No active vehicle-route assignments',
        checks
      };
    }
    
    // Check student assignments
    let totalStudents = 0;
    for (const assignment of assignments) {
      const [students] = await pool.query(
        `SELECT COUNT(*) as count FROM student_route_assignment
         WHERE route_id = ? AND status = 'Active'
         AND effective_from <= ? AND (effective_to IS NULL OR effective_to >= ?)`,
        [assignment.routeId, targetDate, targetDate]
      );
      totalStudents += students[0].count;
    }
    
    checks.studentsAssigned = totalStudents > 0;
    checks.details.totalStudents = totalStudents;
    
    // Check route status
    const activeRoutes = assignments.filter(a => a.routeName).length;
    checks.routesActive = activeRoutes > 0;
    checks.details.activeRoutes = activeRoutes;
    
    // Check vehicle status
    const activeVehicles = assignments.filter(a => a.vehiclePlate).length;
    checks.vehiclesAvailable = activeVehicles > 0;
    checks.details.activeVehicles = activeVehicles;
    
    return {
      valid: checks.transportAvailable && checks.assignmentsExist,
      reason: checks.transportAvailable && checks.assignmentsExist 
        ? 'All prerequisites met' 
        : 'Some prerequisites not met',
      checks
    };
    
  } catch (error) {
    console.error('Prerequisite validation error:', error);
    return {
      valid: false,
      reason: 'Validation error',
      error: error.message,
      checks
    };
  }
};

module.exports = {
  generateTripsForDate,
  generateTripsForRange,
  validateTripGenerationPrerequisites,
  createTripWithAttendance
};