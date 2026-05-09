/**
 * Trip Management Service
 * Domain: Trip & Attendance
 * Responsibilities: Trip lifecycle, attendance tracking, GPS integration
 */

const pool = require("../config/db.js");
const { EventPublisher } = require("../utils/eventPublisher.js");
const { AuditLogger } = require("../utils/auditLogger.js");

class TripService {
  constructor() {
    this.eventPublisher = new EventPublisher();
    this.auditLogger = new AuditLogger();
  }

  /**
   * Get all trips with filtering
   */
  async getAllTrips(filters = {}) {
    const { status, routeId, driverUserId, tripDate, fromDate, toDate } = filters;
    
    let query = `
      SELECT 
        t.*,
        r.routeCode, r.routeName, r.startTime as routeStartTime, r.endTime as routeEndTime,
        v.capacity as vehicleCapacity, v.vehicleType,
        d.firstName as driverFirstName, d.lastName as driverLastName,
        ba.firstName as assistantFirstName, ba.lastName as assistantLastName,
        COUNT(DISTINCT tsa.id) as totalStudents,
        SUM(CASE WHEN tsa.boardingStatus = 'boarded' THEN 1 ELSE 0 END) as boardedCount,
        SUM(CASE WHEN tsa.boardingStatus = 'dropped_off' THEN 1 ELSE 0 END) as droppedCount
      FROM trips t
      JOIN routes r ON t.routeId = r.id
      JOIN vehicles v ON t.plate_number = v.plate_number
      JOIN users d ON t.driverUserId = d.id
      LEFT JOIN users ba ON t.assistantUserId = ba.id
      LEFT JOIN trip_student_attendance tsa ON t.id = tsa.tripId
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += " AND t.status = ?";
      params.push(status);
    }

    if (routeId) {
      query += " AND t.routeId = ?";
      params.push(routeId);
    }

    if (driverUserId) {
      query += " AND t.driverUserId = ?";
      params.push(driverUserId);
    }

    if (tripDate) {
      query += " AND t.tripDate = ?";
      params.push(tripDate);
    }

    if (fromDate && toDate) {
      query += " AND t.tripDate BETWEEN ? AND ?";
      params.push(fromDate, toDate);
    }

    query += ` GROUP BY t.id ORDER BY t.tripDate DESC, t.scheduledStartTime DESC`;

    const [trips] = await pool.query(query, params);
    return trips;
  }

  /**
   * Get trip by ID with full details
   */
  async getTripById(tripId) {
    const [trips] = await pool.query(
      `SELECT t.*,
        r.routeCode, r.routeName, r.startTime as routeStartTime, r.endTime as routeEndTime,
        r.totalDistanceKm,
        v.capacity as vehicleCapacity, v.vehicleType,
        d.firstName as driverFirstName, d.lastName as driverLastName, d.phoneNumber as driverPhone,
        ba.firstName as assistantFirstName, ba.lastName as assistantLastName, ba.phoneNumber as assistantPhone
      FROM trips t
      JOIN routes r ON t.routeId = r.id
      JOIN vehicles v ON t.plate_number = v.plate_number
      JOIN users d ON t.driverUserId = d.id
      LEFT JOIN users ba ON t.assistantUserId = ba.id
      WHERE t.id = ?`,
      [tripId]
    );

    if (trips.length === 0) {
      throw new Error("Trip not found");
    }

    const trip = trips[0];

    // Get student attendance
    const [attendance] = await pool.query(
      `SELECT 
        tsa.*,
        s.admissionNumber, s.firstName as studentFirstName, s.lastName as studentLastName,
        s.grade, s.stream,
        rs.locationName as stopLocation,
        pu.firstName as parentFirstName, pu.lastName as parentLastName, pu.phoneNumber as parentPhone
      FROM trip_student_attendance tsa
      JOIN students s ON tsa.studentId = s.id
      LEFT JOIN route_stops rs ON tsa.routeStopId = rs.id
      LEFT JOIN users pu ON s.parentIdType = pu.parentIdType AND s.parentIdNumber = pu.parentIdNumber
      WHERE tsa.tripId = ?
      ORDER BY s.lastName, s.firstName`,
      [tripId]
    );

    // Get trip events
    const [events] = await pool.query(
      `SELECT * FROM trip_events 
      WHERE tripId = ? 
      ORDER BY createdAt ASC`,
      [tripId]
    );

    // Get GPS locations if available
    const [locations] = await pool.query(
      `SELECT * FROM trip_locations 
      WHERE tripId = ? 
      ORDER BY recordedAt ASC`,
      [tripId]
    );

    return {
      ...trip,
      attendance,
      events,
      locations,
      attendanceSummary: {
        total: attendance.length,
        boarded: attendance.filter(a => a.boardingStatus === 'boarded').length,
        dropped: attendance.filter(a => a.boardingStatus === 'dropped_off').length,
        absent: attendance.filter(a => a.boardingStatus === 'absent').length,
        notBoarded: attendance.filter(a => a.boardingStatus === 'not_boarded').length
      }
    };
  }

  /**
   * Create trip from route assignment
   */
  async createTrip(routeAssignmentId, tripDate, createdByUserId) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Get route assignment
      const [assignments] = await connection.query(
        `SELECT ra.*, r.routeDate as assignedRouteDate, r.startTime
        FROM route_assignments ra
        JOIN routes r ON ra.routeId = r.id
        WHERE ra.id = ? AND ra.status = 'active'`,
        [routeAssignmentId]
      );

      if (assignments.length === 0) {
        throw new Error("Route assignment not found or not active");
      }

      const assignment = assignments[0];

      // Validate driver can be assigned
      const staffService = require("./staff.service.js").StaffService;
      const staffSvc = new staffService();
      const validation = await staffSvc.validateDriverAssignment(
        assignment.driverUserId,
        tripDate
      );

      if (!validation.valid) {
        throw new Error(`Driver validation failed: ${validation.errors.join(', ')}`);
      }

      // Create trip
      const [result] = await connection.query(
        `INSERT INTO trips (
          routeId, routeAssignmentId, plate_number, driverUserId, assistantUserId,
          tripDate, scheduledStartTime, status, createdByUserId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)`,
        [
          assignment.routeId, routeAssignmentId, assignment.plate_number,
          assignment.driverUserId, assignment.assistantUserId,
          tripDate, assignment.startTime, createdByUserId
        ]
      );

      const tripId = result.insertId;

      // Get students assigned to route and create attendance records
      const [students] = await connection.query(
        `SELECT studentId FROM route_student_assignments 
        WHERE routeId = ? AND status = 'active'`,
        [assignment.routeId]
      );

      for (const student of students) {
        await connection.query(
          `INSERT INTO trip_student_attendance (tripId, studentId, boardingStatus)
          VALUES (?, ?, 'not_boarded')`,
          [tripId, student.studentId]
        );
      }

      // Log event
      await connection.query(
        `INSERT INTO trip_events (tripId, eventType, description, actorUserId, actorName, actorRole)
        VALUES (?, 'scheduled', 'Trip scheduled', ?, 'System', 'system')`,
        [tripId, createdByUserId]
      );

      await connection.commit();

      // Publish event
      await this.eventPublisher.publish("trip.created", {
        tripId,
        routeId: assignment.routeId,
        routeAssignmentId,
        studentCount: students.length,
        createdBy: createdByUserId
      });

      return {
        tripId,
        routeId: assignment.routeId,
        studentCount: students.length
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Update trip status (lifecycle transitions)
   */
  async updateTripStatus(tripId, newStatus, actorUserId, actorInfo = {}) {
    const validTransitions = {
      'scheduled': ['started', 'cancelled'],
      'started': ['in_progress', 'cancelled', 'aborted'],
      'in_progress': ['completed', 'aborted'],
      'cancelled': [],
      'completed': [],
      'aborted': []
    };

    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Get current trip status
      const [trips] = await connection.query(
        "SELECT * FROM trips WHERE id = ?",
        [tripId]
      );

      if (trips.length === 0) {
        throw new Error("Trip not found");
      }

      const trip = trips[0];
      const currentStatus = trip.status;

      // Validate transition
      if (!validTransitions[currentStatus]?.includes(newStatus)) {
        throw new Error(`Invalid status transition: ${currentStatus} -> ${newStatus}`);
      }

      // Build update fields based on status
      const updateFields = { status: newStatus };
      const timestamps = {};

      switch (newStatus) {
        case 'started':
          timestamps.startedAt = new Date();
          timestamps.actualStartTime = new Date().toTimeString().slice(0, 8);
          break;
        case 'in_progress':
          timestamps.inProgressAt = new Date();
          break;
        case 'completed':
          timestamps.completedAt = new Date();
          timestamps.actualEndTime = new Date().toTimeString().slice(0, 8);
          break;
        case 'cancelled':
          timestamps.cancelledAt = new Date();
          break;
      }

      // Update trip
      await connection.query(
        `UPDATE trips SET 
          status = ?, 
          startedAt = COALESCE(?, startedAt),
          inProgressAt = COALESCE(?, inProgressAt),
          completedAt = COALESCE(?, completedAt),
          cancelledAt = COALESCE(?, cancelledAt),
          actualStartTime = COALESCE(?, actualStartTime),
          actualEndTime = COALESCE(?, actualEndTime)
        WHERE id = ?`,
        [
          newStatus,
          timestamps.startedAt || null,
          timestamps.inProgressAt || null,
          timestamps.completedAt || null,
          timestamps.cancelledAt || null,
          timestamps.actualStartTime || null,
          timestamps.actualEndTime || null,
          tripId
        ]
      );

      // Log event
      const eventDescription = `Trip ${newStatus.replace('_', ' ')}`;
      await connection.query(
        `INSERT INTO trip_events (
          tripId, eventType, description, actorUserId, actorName, actorRole,
          latitude, longitude
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tripId, newStatus, eventDescription, actorUserId,
          actorInfo.name || 'Unknown', actorInfo.role || 'Unknown',
          actorInfo.latitude || null, actorInfo.longitude || null
        ]
      );

      await connection.commit();

      // Publish event for notifications
      await this.eventPublisher.publish("trip.status_changed", {
        tripId,
        routeId: trip.routeId,
        oldStatus: currentStatus,
        newStatus,
        changedBy: actorUserId,
        timestamps
      });

      // Audit log
      await this.auditLogger.log({
        actorUserId,
        domain: "trip",
        entityType: "trip",
        entityId: String(tripId),
        action: "STATUS_CHANGE",
        actionDetails: `${currentStatus} -> ${newStatus}`
      });

      return { tripId, newStatus, previousStatus: currentStatus };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Record student attendance/boarding
   */
  async recordAttendance(tripId, studentId, boardingStatus, actorUserId, location = {}) {
    const validStatuses = ['not_boarded', 'boarded', 'dropped_off', 'absent', 'excused'];
    
    if (!validStatuses.includes(boardingStatus)) {
      throw new Error(`Invalid boarding status: ${boardingStatus}`);
    }

    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Get trip
      const [trips] = await connection.query(
        "SELECT * FROM trips WHERE id = ?",
        [tripId]
      );

      if (trips.length === 0) {
        throw new Error("Trip not found");
      }

      const trip = trips[0];

      // Validate trip status allows attendance updates
      if (!['started', 'in_progress'].includes(trip.status)) {
        throw new Error(`Cannot update attendance for trip with status: ${trip.status}`);
      }

      // Build update fields
      const updateFields = {
        boardingStatus,
        verifiedByDriverId: actorUserId
      };

      const timestamps = {};
      const locationFields = {};

      if (boardingStatus === 'boarded') {
        timestamps.boardedAt = new Date();
        locationFields.boardingLatitude = location.latitude;
        locationFields.boardingLongitude = location.longitude;
      } else if (boardingStatus === 'dropped_off') {
        timestamps.droppedOffAt = new Date();
        locationFields.dropoffLatitude = location.latitude;
        locationFields.dropoffLongitude = location.longitude;
      }

      await connection.query(
        `UPDATE trip_student_attendance SET
          boardingStatus = ?,
          boardedAt = COALESCE(?, boardedAt),
          droppedOffAt = COALESCE(?, droppedOffAt),
          boardingLatitude = COALESCE(?, boardingLatitude),
          boardingLongitude = COALESCE(?, boardingLongitude),
          dropoffLatitude = COALESCE(?, dropoffLatitude),
          dropoffLongitude = COALESCE(?, dropoffLongitude),
          verifiedByDriverId = ?
        WHERE tripId = ? AND studentId = ?`,
        [
          boardingStatus,
          timestamps.boardedAt || null,
          timestamps.droppedOffAt || null,
          locationFields.boardingLatitude || null,
          locationFields.boardingLongitude || null,
          locationFields.dropoffLatitude || null,
          locationFields.dropoffLongitude || null,
          actorUserId,
          tripId, studentId
        ]
      );

      // Update trip counts
      await connection.query(
        `UPDATE trips SET
          boardedCount = (SELECT COUNT(*) FROM trip_student_attendance WHERE tripId = ? AND boardingStatus = 'boarded'),
          droppedOffCount = (SELECT COUNT(*) FROM trip_student_attendance WHERE tripId = ? AND boardingStatus = 'dropped_off'),
          noShowCount = (SELECT COUNT(*) FROM trip_student_attendance WHERE tripId = ? AND boardingStatus IN ('absent', 'not_boarded'))
        WHERE id = ?`,
        [tripId, tripId, tripId, tripId]
      );

      // Log event
      const eventDescription = `Student ${boardingStatus.replace('_', ' ')}`;
      await connection.query(
        `INSERT INTO trip_events (
          tripId, eventType, description, actorUserId, latitude, longitude
        ) VALUES (?, 'attendance_updated', ?, ?, ?, ?)`,
        [tripId, eventDescription, actorUserId, location.latitude, location.longitude]
      );

      await connection.commit();

      // Publish event
      await this.eventPublisher.publish("trip.attendance_updated", {
        tripId,
        studentId,
        boardingStatus,
        recordedBy: actorUserId,
        location
      });

      return { tripId, studentId, boardingStatus };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Record GPS location
   */
  async recordLocation(tripId, locationData, recordedByUserId) {
    const {
      latitude,
      longitude,
      accuracyMeters,
      altitude,
      speedKmh,
      heading,
      recordedAt
    } = locationData;

    const [result] = await pool.query(
      `INSERT INTO trip_locations (
        tripId, latitude, longitude, accuracyMeters, altitude, speedKmh, heading, recordedAt, recordedByUserId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tripId, latitude, longitude, accuracyMeters, altitude, speedKmh, heading, recordedAt || new Date(), recordedByUserId]
    );

    return { locationId: result.insertId };
  }

  /**
   * Get upcoming trips for a driver
   */
  async getDriverTrips(driverUserId, fromDate = null, toDate = null) {
    const startDate = fromDate || new Date().toISOString().split('T')[0];
    const endDate = toDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [trips] = await pool.query(
      `SELECT 
        t.*,
        r.routeCode, r.routeName, r.startTime as routeStartTime, r.endTime as routeEndTime,
        v.vehicleType, v.capacity,
        COUNT(DISTINCT tsa.id) as totalStudents
      FROM trips t
      JOIN routes r ON t.routeId = r.id
      JOIN vehicles v ON t.plate_number = v.plate_number
      LEFT JOIN trip_student_attendance tsa ON t.id = tsa.tripId
      WHERE t.driverUserId = ?
        AND t.tripDate BETWEEN ? AND ?
      GROUP BY t.id
      ORDER BY t.tripDate ASC, t.scheduledStartTime ASC`,
      [driverUserId, startDate, endDate]
    );

    return trips;
  }

  /**
   * Get trip statistics
   */
  async getTripStatistics(fromDate, toDate) {
    const [stats] = await pool.query(
      `SELECT 
        COUNT(*) as totalTrips,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedTrips,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelledTrips,
        SUM(CASE WHEN status = 'aborted' THEN 1 ELSE 0 END) as abortedTrips,
        AVG(totalStudents) as avgStudentsPerTrip,
        AVG(boardedCount) as avgBoardedPerTrip,
        SUM(totalStudents) as totalStudentsTransported
      FROM trips
      WHERE tripDate BETWEEN ? AND ?`,
      [fromDate, toDate]
    );

    const [attendanceStats] = await pool.query(
      `SELECT 
        COUNT(*) as totalRecords,
        SUM(CASE WHEN boardingStatus = 'boarded' THEN 1 ELSE 0 END) as totalBoarded,
        SUM(CASE WHEN boardingStatus = 'dropped_off' THEN 1 ELSE 0 END) as totalDroppedOff,
        SUM(CASE WHEN boardingStatus = 'absent' THEN 1 ELSE 0 END) as totalAbsent
      FROM trip_student_attendance tsa
      JOIN trips t ON tsa.tripId = t.id
      WHERE t.tripDate BETWEEN ? AND ?`,
      [fromDate, toDate]
    );

    return {
      tripStats: stats[0],
      attendanceStats: attendanceStats[0]
    };
  }
}

module.exports = { TripService };
