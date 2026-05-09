/**
 * Route Management Service
 * Domain: Route Management
 * Responsibilities: Route creation, stops, assignments, capacity management
 */

const pool = require("../config/db.js");
const { EventPublisher } = require("../utils/eventPublisher.js");
const { AuditLogger } = require("../utils/auditLogger.js");

class RouteService {
  constructor() {
    this.eventPublisher = new EventPublisher();
    this.auditLogger = new AuditLogger();
  }

  /**
   * Get all routes with filtering
   */
  async getAllRoutes(filters = {}) {
    const { status, routeDate, search, isFull } = filters;
    
    let query = `
      SELECT 
        r.*,
        ra.plate_number,
        ra.driverUserId,
        ra.assistantUserId,
        ra.status as assignmentStatus,
        v.capacity as vehicleCapacity,
        v.vehicleType,
        d.firstName as driverFirstName,
        d.lastName as driverLastName,
        ba.firstName as assistantFirstName,
        ba.lastName as assistantLastName,
        COUNT(DISTINCT rsa.studentId) as assignedStudentCount
      FROM routes r
      LEFT JOIN route_assignments ra ON r.id = ra.routeId AND ra.status = 'active'
      LEFT JOIN vehicles v ON ra.plate_number = v.plate_number
      LEFT JOIN users d ON ra.driverUserId = d.id
      LEFT JOIN users ba ON ra.assistantUserId = ba.id
      LEFT JOIN route_student_assignments rsa ON r.id = rsa.routeId AND rsa.status = 'active'
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += " AND r.status = ?";
      params.push(status);
    }

    if (routeDate) {
      query += " AND r.routeDate = ?";
      params.push(routeDate);
    }

    if (isFull !== undefined) {
      query += " AND r.isFull = ?";
      params.push(isFull);
    }

    if (search) {
      query += ` AND (r.routeCode LIKE ? OR r.routeName LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += ` GROUP BY r.id ORDER BY r.routeDate DESC, r.startTime ASC`;

    const [routes] = await pool.query(query, params);
    return routes;
  }

  /**
   * Get route by ID with full details
   */
  async getRouteById(routeId) {
    const [routes] = await pool.query(
      `SELECT r.*,
        ra.id as assignmentId, ra.plate_number, ra.driverUserId, ra.assistantUserId,
        ra.status as assignmentStatus, ra.assignedAt,
        v.capacity as vehicleCapacity, v.vehicleType, v.status as vehicleStatus,
        d.firstName as driverFirstName, d.lastName as driverLastName, d.phoneNumber as driverPhone,
        ba.firstName as assistantFirstName, ba.lastName as assistantLastName
      FROM routes r
      LEFT JOIN route_assignments ra ON r.id = ra.routeId AND ra.status = 'active'
      LEFT JOIN vehicles v ON ra.plate_number = v.plate_number
      LEFT JOIN users d ON ra.driverUserId = d.id
      LEFT JOIN users ba ON ra.assistantUserId = ba.id
      WHERE r.id = ?`,
      [routeId]
    );

    if (routes.length === 0) {
      throw new Error("Route not found");
    }

    const route = routes[0];

    // Get stops
    const [stops] = await pool.query(
      `SELECT * FROM route_stops WHERE routeId = ? ORDER BY stopOrder ASC`,
      [routeId]
    );

    // Get assigned students with pickup/dropoff stops
    const [students] = await pool.query(
      `SELECT 
        rsa.*,
        s.admissionNumber, s.firstName as studentFirstName, s.lastName as studentLastName,
        s.grade, s.stream, s.parentContact,
        pu.firstName as parentFirstName, pu.lastName as parentLastName, pu.phoneNumber as parentPhone,
        ps.locationName as pickupLocation,
        ds.locationName as dropoffLocation
      FROM route_student_assignments rsa
      JOIN students s ON rsa.studentId = s.id
      LEFT JOIN users pu ON s.parentIdType = pu.parentIdType AND s.parentIdNumber = pu.parentIdNumber
      LEFT JOIN route_stops ps ON rsa.pickupStopId = ps.id
      LEFT JOIN route_stops ds ON rsa.dropoffStopId = ds.id
      WHERE rsa.routeId = ? AND rsa.status = 'active'`,
      [routeId]
    );

    // Get recent trips
    const [trips] = await pool.query(
      `SELECT t.*,
        COUNT(tsa.id) as totalStudents,
        SUM(CASE WHEN tsa.boardingStatus = 'boarded' THEN 1 ELSE 0 END) as boardedCount,
        SUM(CASE WHEN tsa.boardingStatus = 'dropped_off' THEN 1 ELSE 0 END) as droppedCount
      FROM trips t
      LEFT JOIN trip_student_attendance tsa ON t.id = tsa.tripId
      WHERE t.routeId = ?
      GROUP BY t.id
      ORDER BY t.tripDate DESC, t.scheduledStartTime DESC
      LIMIT 10`,
      [routeId]
    );

    return {
      ...route,
      stops,
      students,
      trips,
      capacityUtilization: route.vehicleCapacity ? (students.length / route.vehicleCapacity) * 100 : 0
    };
  }

  /**
   * Create new route with stops
   */
  async createRoute(routeData, createdByUserId) {
    const {
      routeCode,
      routeName,
      description,
      routeType = 'combined',
      routeDate,
      startTime,
      endTime,
      estimatedDurationMinutes,
      totalDistanceKm,
      stops
    } = routeData;

    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Check if route code exists
      const [existing] = await connection.query(
        "SELECT id FROM routes WHERE routeCode = ?",
        [routeCode]
      );

      if (existing.length > 0) {
        throw new Error("Route code already exists");
      }

      // Create route
      const [routeResult] = await connection.query(
        `INSERT INTO routes (
          routeCode, routeName, description, routeType, routeDate, startTime, endTime,
          estimatedDurationMinutes, totalDistanceKm, createdByUserId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          routeCode, routeName, description, routeType, routeDate, startTime, endTime,
          estimatedDurationMinutes, totalDistanceKm, createdByUserId
        ]
      );

      const routeId = routeResult.insertId;

      // Create stops
      if (stops && stops.length > 0) {
        for (let i = 0; i < stops.length; i++) {
          const stop = stops[i];
          await connection.query(
            `INSERT INTO route_stops (
              routeId, stopType, stopOrder, locationName, address, latitude, longitude,
              geofenceRadiusMeters, scheduledTime, timeWindowMinutes, isMandatory
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              routeId, stop.stopType, i + 1, stop.locationName, stop.address,
              stop.latitude, stop.longitude, stop.geofenceRadiusMeters || 100,
              stop.scheduledTime, stop.timeWindowMinutes || 5, stop.isMandatory !== false
            ]
          );
        }
      }

      await connection.commit();

      // Publish event
      await this.eventPublisher.publish("route.created", {
        routeId,
        routeCode,
        routeDate,
        stopCount: stops?.length || 0,
        createdBy: createdByUserId
      });

      // Audit log
      await this.auditLogger.log({
        actorUserId: createdByUserId,
        domain: "route",
        entityType: "route",
        entityId: String(routeId),
        action: "CREATE",
        newStateJson: routeData
      });

      return { routeId, routeCode };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Assign vehicle and staff to route
   */
  async assignVehicleAndStaff(routeId, assignmentData, createdByUserId) {
    const {
      plate_number,
      driverUserId,
      assistantUserId
    } = assignmentData;

    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Get route details
      const [route] = await connection.query(
        "SELECT * FROM routes WHERE id = ?",
        [routeId]
      );

      if (route.length === 0) {
        throw new Error("Route not found");
      }

      // Check if route already has active assignment
      const [existing] = await connection.query(
        "SELECT id FROM route_assignments WHERE routeId = ? AND status = 'active'",
        [routeId]
      );

      if (existing.length > 0) {
        throw new Error("Route already has an active assignment. Please deactivate first.");
      }

      // Validate vehicle
      const [vehicle] = await connection.query(
        `SELECT * FROM vehicles WHERE plate_number = ?`,
        [plate_number]
      );

      if (vehicle.length === 0) {
        throw new Error("Vehicle not found");
      }

      if (!vehicle[0].isCompliant) {
        throw new Error("Vehicle is not compliant (insurance or inspection expired)");
      }

      if (vehicle[0].status === 'breakdown' || vehicle[0].status === 'retired') {
        throw new Error(`Vehicle status is ${vehicle[0].status}`);
      }

      // Validate driver
      const staffService = require("./staff.service.js").StaffService;
      const staffSvc = new staffService();
      const driverValidation = await staffSvc.validateDriverAssignment(
        driverUserId,
        route[0].routeDate
      );

      if (!driverValidation.valid) {
        throw new Error(`Driver validation failed: ${driverValidation.errors.join(', ')}`);
      }

      // Check vehicle availability
      const [vehicleConflicts] = await connection.query(
        `SELECT ra.*, r.routeCode, r.routeDate
        FROM route_assignments ra
        JOIN routes r ON ra.routeId = r.id
        WHERE ra.plate_number = ?
          AND ra.status = 'active'
          AND r.routeDate = ?
          AND r.id != ?`,
        [plate_number, route[0].routeDate, routeId]
      );

      if (vehicleConflicts.length > 0) {
        throw new Error(`Vehicle already assigned to route ${vehicleConflicts[0].routeCode} on ${route[0].routeDate}`);
      }

      // Create assignment
      const [result] = await connection.query(
        `INSERT INTO route_assignments (
          routeId, plate_number, driverUserId, assistantUserId, createdByUserId
        ) VALUES (?, ?, ?, ?, ?)`,
        [routeId, plate_number, driverUserId, assistantUserId || null, createdByUserId]
      );

      // Update route max capacity from vehicle
      await connection.query(
        "UPDATE routes SET maxCapacity = ? WHERE id = ?",
        [vehicle[0].capacity, routeId]
      );

      await connection.commit();

      // Publish event
      await this.eventPublisher.publish("route.assigned", {
        routeId,
        assignmentId: result.insertId,
        plate_number,
        driverUserId,
        assistantUserId,
        createdBy: createdByUserId
      });

      return { assignmentId: result.insertId };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Assign students to route
   */
  async assignStudents(routeId, studentIds, stopAssignments, assignedByUserId) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Get route capacity info
      const [route] = await connection.query(
        `SELECT r.maxCapacity, r.currentStudentCount, r.isFull, ra.plate_number
        FROM routes r
        LEFT JOIN route_assignments ra ON r.id = ra.routeId AND ra.status = 'active'
        WHERE r.id = ?`,
        [routeId]
      );

      if (route.length === 0) {
        throw new Error("Route not found");
      }

      if (route[0].isFull) {
        throw new Error("Route is at full capacity");
      }

      const availableCapacity = route[0].maxCapacity - route[0].currentStudentCount;

      if (studentIds.length > availableCapacity) {
        throw new Error(`Cannot assign ${studentIds.length} students. Only ${availableCapacity} spots available.`);
      }

      const assignedStudents = [];
      const errors = [];

      for (const studentId of studentIds) {
        try {
          // Check if student already assigned to another active route
          const [existing] = await connection.query(
            `SELECT rsa.*, r.routeCode
            FROM route_student_assignments rsa
            JOIN routes r ON rsa.routeId = r.id
            WHERE rsa.studentId = ? AND rsa.status = 'active' AND rsa.routeId != ?`,
            [studentId, routeId]
          );

          if (existing.length > 0) {
            errors.push(`Student ${studentId} already assigned to route ${existing[0].routeCode}`);
            continue;
          }

          // Check if already assigned to this route
          const [existingThisRoute] = await connection.query(
            `SELECT id FROM route_student_assignments 
            WHERE routeId = ? AND studentId = ? AND status = 'active'`,
            [routeId, studentId]
          );

          if (existingThisRoute.length > 0) {
            continue; // Already assigned, skip
          }

          const stopInfo = stopAssignments?.find(s => s.studentId === studentId);

          await connection.query(
            `INSERT INTO route_student_assignments (
              routeId, studentId, pickupStopId, dropoffStopId, assignedByUserId
            ) VALUES (?, ?, ?, ?, ?)`,
            [
              routeId, studentId,
              stopInfo?.pickupStopId || null,
              stopInfo?.dropoffStopId || null,
              assignedByUserId
            ]
          );

          assignedStudents.push(studentId);
        } catch (err) {
          errors.push(`Failed to assign student ${studentId}: ${err.message}`);
        }
      }

      // Update route student count
      await connection.query(
        `UPDATE routes SET currentStudentCount = (
          SELECT COUNT(*) FROM route_student_assignments 
          WHERE routeId = ? AND status = 'active'
        ) WHERE id = ?`,
        [routeId, routeId]
      );

      await connection.commit();

      // Publish event
      if (assignedStudents.length > 0) {
        await this.eventPublisher.publish("route.students_assigned", {
          routeId,
          studentCount: assignedStudents.length,
          studentIds: assignedStudents,
          assignedBy: assignedByUserId
        });
      }

      return {
        assignedCount: assignedStudents.length,
        assignedStudents,
        errors
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Remove student from route
   */
  async removeStudentFromRoute(routeId, studentId, removalReason, removedByUserId) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      await connection.query(
        `UPDATE route_student_assignments 
        SET status = 'removed', removalReason = ?, removedAt = NOW()
        WHERE routeId = ? AND studentId = ? AND status = 'active'`,
        [removalReason, routeId, studentId]
      );

      // Update route student count
      await connection.query(
        `UPDATE routes SET currentStudentCount = (
          SELECT COUNT(*) FROM route_student_assignments 
          WHERE routeId = ? AND status = 'active'
        ) WHERE id = ?`,
        [routeId, routeId]
      );

      await connection.commit();

      // Audit log
      await this.auditLogger.log({
        actorUserId: removedByUserId,
        domain: "route",
        entityType: "route_student_assignment",
        entityId: `${routeId}-${studentId}`,
        action: "REMOVE",
        actionDetails: removalReason
      });

      return { removed: true };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get available routes for student assignment
   */
  async getAvailableRoutes(studentId, routeDate = null) {
    const dateFilter = routeDate || new Date().toISOString().split('T')[0];

    const [routes] = await pool.query(
      `SELECT 
        r.*,
        ra.plate_number,
        v.capacity, v.vehicleType,
        (r.maxCapacity - r.currentStudentCount) as availableSpots,
        COUNT(DISTINCT rs.id) as stopCount
      FROM routes r
      LEFT JOIN route_assignments ra ON r.id = ra.routeId AND ra.status = 'active'
      LEFT JOIN vehicles v ON ra.plate_number = v.plate_number
      LEFT JOIN route_stops rs ON r.id = rs.routeId
      WHERE r.status = 'active'
        AND r.routeDate >= ?
        AND r.isFull = FALSE
        AND r.id NOT IN (
          SELECT routeId FROM route_student_assignments 
          WHERE studentId = ? AND status = 'active'
        )
      GROUP BY r.id
      ORDER BY r.routeDate ASC, r.startTime ASC`,
      [dateFilter, studentId]
    );

    return routes;
  }
}

module.exports = { RouteService };
