const pool = require("../config/db.js");
const { randomUUID } = require('crypto');
const uuidv4 = randomUUID;

const mapTripRow = (row) => ({
  id: row.id,
  tripId: row.trip_id,
  routeId: row.route_id,
  routeName: row.route_name || "",
  routeCode: row.route_code || "",
  vehiclePlate: row.vehicle_plate,
  driverName: row.driver_name,
  assistantName: row.assistant_name,
  departureTime: row.departure_time,
  expectedReturnTime: row.expected_return_time,
  actualReturnTime: row.actual_return_time,
  status: row.status,
  stopsCompleted: row.stops_completed,
  totalStops: row.total_stops,
  delayReason: row.delay_reason,
  delayMinutes: row.delay_minutes,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/**
 * List all trips for a specific date.
 */
const transportCalendarService = require('./transportCalendar.service');

// Ensure `scheduler_logs` table exists before attempting writes.
let _schedulerLogsEnsured = false;
const ensureSchedulerLogsTable = async () => {
  if (_schedulerLogsEnsured) return;
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS scheduler_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        job_name VARCHAR(100) NOT NULL,
        run_date DATETIME NOT NULL,
        status ENUM('SUCCESS','FAILED','SKIPPED') NOT NULL DEFAULT 'SUCCESS',
        details JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
      `
    );
    _schedulerLogsEnsured = true;
  } catch (err) {
    // If we can't create the table, just mark as not ensured and let callers handle insert errors.
    console.warn('Could not ensure scheduler_logs table exists', err);
  }
};

const listTripsForDate = async (date) => {
  const targetDate = date || new Date().toISOString().slice(0, 10);

  // Check transport availability for the date
  try {
    const { transportEnabled } = await transportCalendarService.isTransportDay(targetDate);
    if (!transportEnabled) {
      return [];
    }
  } catch (err) {
    // If calendar check fails, default to no trips to be safe
    return [];
  }

  const [rows] = await pool.query(
    `
      SELECT
        tm.*,
        r.route_name,
        r.route_id AS route_code
      FROM trip_monitoring tm
      LEFT JOIN routes r ON r.id = tm.route_id
      WHERE DATE(tm.departure_time) = ?
      ORDER BY tm.departure_time ASC, tm.id ASC
    `,
    [targetDate]
  );

  return rows.map(mapTripRow);
};

// Self-healing: if today's trips are requested and none exist, attempt automatic generation
const listOrRecoverTripsForDate = async (date) => {
  const targetDate = date || new Date().toISOString().slice(0, 10);

  // First attempt to list existing trips
  const trips = await listTripsForDate(targetDate);
  if (trips.length > 0) return trips;

  // Only auto-recover for today's date
  const todayStr = new Date().toISOString().slice(0, 10);
  if (targetDate !== todayStr) return trips;

  // Attempt recovery using generator
  try {
    const { generateDailyTrips } = require('../jobs/dailyTrips.job');
    await generateDailyTrips({ date: targetDate });

    // Log recovery action
    try {
      await ensureSchedulerLogsTable();
      await pool.query(
        `INSERT INTO scheduler_logs (job_name, run_date, status, details) VALUES (?, NOW(), 'SUCCESS', ?)`,
        ['self_healing_recovery', JSON.stringify({ date: targetDate, triggeredBy: 'self_heal' })]
      );
    } catch (err) {
      console.warn('Failed to write scheduler recovery log', err);
    }
  } catch (err) {
    console.error('Self-healing trip generation failed', err);
    try {
      await ensureSchedulerLogsTable();
      await pool.query(
        `INSERT INTO scheduler_logs (job_name, run_date, status, details) VALUES (?, NOW(), 'FAILED', ?)`,
        ['self_healing_recovery', JSON.stringify({ date: targetDate, error: String(err) })]
      );
    } catch (e) {
      console.warn('Failed to write scheduler failure log', e);
    }
  }

  // Re-query trips after attempted recovery
  const [newRows] = await pool.query(
    `
      SELECT
        tm.*,
        r.route_name,
        r.route_id AS route_code
      FROM trip_monitoring tm
      LEFT JOIN routes r ON r.id = tm.route_id
      WHERE DATE(tm.departure_time) = ?
      ORDER BY tm.departure_time ASC, tm.id ASC
    `,
    [targetDate]
  );

  return newRows.map(mapTripRow);
};

/**
 * Retrieve a specific trip by its numeric ID.
 */
const getTripById = async ({ id }) => {
  const [rows] = await pool.query(
    `
      SELECT
        tm.*,
        r.route_name,
        r.route_id AS route_code
      FROM trip_monitoring tm
      LEFT JOIN routes r ON r.id = tm.route_id
      WHERE tm.id = ?
      LIMIT 1
    `,
    [id]
  );

  return rows.length > 0 ? mapTripRow(rows[0]) : null;
};

/**
 * Create a new trip in trip_monitoring and generate attendance snapshots
 * for all active student route assignments in a single transaction.
 */
const createTrip = async ({ payload }) => {
  const routeId = Number(payload.routeId || payload.route_id);
  if (!routeId) {
    const error = new Error("Route ID is required.");
    error.code = "ROUTE_REQUIRED";
    throw error;
  }

  if (!payload.departureTime) {
    const error = new Error("Departure time is required.");
    error.code = "DEPARTURE_TIME_REQUIRED";
    throw error;
  }

  if (!payload.expectedReturnTime) {
    const error = new Error("Expected return time is required.");
    error.code = "EXPECTED_RETURN_TIME_REQUIRED";
    throw error;
  }

  const departureDate = new Date(payload.departureTime);
  const expectedReturnDate = new Date(payload.expectedReturnTime);

  if (Number.isNaN(departureDate.getTime())) {
    const error = new Error("Invalid departure time.");
    error.code = "INVALID_DEPARTURE_TIME";
    throw error;
  }

  if (Number.isNaN(expectedReturnDate.getTime())) {
    const error = new Error("Invalid expected return time.");
    error.code = "INVALID_EXPECTED_RETURN_TIME";
    throw error;
  }

  if (expectedReturnDate <= departureDate) {
    const error = new Error("Expected return time must be after departure time.");
    error.code = "INVALID_RETURN_TIME_SEQUENCE";
    throw error;
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // Check transport availability for the trip date
    const { isTransportDay } = require('./transportCalendar.service');
    const tripDateStr = departureDate.toISOString().slice(0, 10);
    const transportCheck = await isTransportDay(tripDateStr);
    if (!transportCheck.transportEnabled) {
      const error = new Error('Transport not enabled for the selected date.');
      error.code = 'TRANSPORT_NOT_ENABLED';
      throw error;
    }
    // 1. Fetch and validate Route details
    const [routes] = await connection.query(
      "SELECT * FROM routes WHERE id = ? AND deleted_at IS NULL LIMIT 1",
      [routeId]
    );

    if (routes.length === 0) {
      const error = new Error("Route not found or is inactive.");
      error.code = "ROUTE_NOT_FOUND";
      throw error;
    }

    const route = routes[0];
    if (route.status !== "Active") {
      const error = new Error("Cannot create a trip for an inactive or draft route.");
      error.code = "ROUTE_INACTIVE";
      throw error;
    }

    // Pre-fetch student route assignments so we can snapshot students for immutability
    const [allAssignments] = await connection.query(
      `
        SELECT student_id, stop_id, trip_type
        FROM student_route_assignment
        WHERE route_id = ?
          AND status = 'Active'
          AND effective_from <= DATE(?)
          AND (effective_to IS NULL OR effective_to >= DATE(?))
      `,
      [route.id, departureDate, departureDate]
    );

    // Determine trip session and filter assignments matching this trip
    const tripHoursLocal = departureDate.getHours();
    const tripSession = tripHoursLocal < 12 ? 'Morning' : 'Evening';
    const matchingAssignmentsPre = allAssignments.filter((asg) => {
      if (tripSession === 'Morning') return asg.trip_type === 'Morning' || asg.trip_type === 'Both';
      return asg.trip_type === 'Evening' || asg.trip_type === 'Both';
    });

    const studentsSnapshot = matchingAssignmentsPre.map((asg) => ({ studentId: asg.student_id, stopId: asg.stop_id, tripType: asg.trip_type }));
    const routeSnapshot = {
      id: route.id,
      routeCode: route.route_id,
      routeName: route.route_name,
      totalStops: route.total_stops,
      status: route.status,
    };
    const vehicleSnapshot = { plate: payload.vehiclePlate || route.vehicle_plate };
    const driverSnapshot = { name: payload.driverName || route.assigned_driver };
    const assistantSnapshot = { name: payload.assistantName || route.assigned_assistant || null };


    // 2. Prevent duplicate trip generation: check by route + date + session
    const tripHours = departureDate.getHours();
    const tripType = tripHours < 12 ? "Morning" : "Evening";
    const dateOnly = departureDate.toISOString().slice(0, 10);

    const timeCondition = tripType === 'Morning'
      ? "TIME(departure_time) < '12:00:00'"
      : "TIME(departure_time) >= '12:00:00'";

    const [existing] = await connection.query(
      `SELECT id FROM trip_monitoring WHERE route_id = ? AND DATE(departure_time) = ? AND ${timeCondition} LIMIT 1`,
      [route.id, dateOnly]
    );

    if (existing.length > 0) {
      // Already generated for this route/date/session — return existing trip to ensure idempotency
      const [rows] = await connection.query(
        `SELECT tm.*, r.route_name, r.route_id AS route_code FROM trip_monitoring tm LEFT JOIN routes r ON r.id = tm.route_id WHERE tm.id = ? LIMIT 1`,
        [existing[0].id]
      );

      // Insert audit log noting generation was skipped due to existing trip
      try {
        await connection.query(
          `INSERT INTO audit_logs (actorUserId, domain, entityType, entityId, action, previousStateJson, newStateJson) VALUES (?, 'transport', 'trip', ?, ?, NULL, ?)`,
          [null, existing[0].id, 'trip_generation_skipped', JSON.stringify({ reason: 'duplicate_detected', routeId: route.id, date: dateOnly, session: tripType })]
        );
      } catch (err) {
        // non-fatal logging failure
        console.warn('Failed to write audit skip log', err);
      }

      await connection.commit();
      return mapTripRow(rows[0]);
    }

    // 3. Insert into trip_monitoring with immutable JSON snapshots and session/version
    const tripUuid = uuidv4();
    const [tripResult] = await connection.query(
      `
        INSERT INTO trip_monitoring (
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
          vehicle_snapshot,
          driver_snapshot,
          assistant_snapshot,
          version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        null, // trip_id is generated by DB trigger
        tripUuid,
        route.id,
        tripType,
        departureDate,
        expectedReturnDate,
        payload.vehiclePlate || route.vehicle_plate,
        payload.driverName || route.assigned_driver,
        payload.assistantName || route.assigned_assistant || null,
        payload.status || "Not Started",
        route.total_stops || 0,
        payload.notes || null,
        JSON.stringify(routeSnapshot),
        JSON.stringify(studentsSnapshot),
        JSON.stringify(vehicleSnapshot),
        JSON.stringify(driverSnapshot),
        JSON.stringify(assistantSnapshot),
        1,
      ]
    );

    const tripId = tripResult.insertId;

    // 4. Retrieve student route assignments
    const [assignments] = await connection.query(
      `
        SELECT student_id, stop_id, trip_type
        FROM student_route_assignment
        WHERE route_id = ?
          AND status = 'Active'
          AND effective_from <= DATE(?)
          AND (effective_to IS NULL OR effective_to >= DATE(?))
      `,
      [route.id, departureDate, departureDate]
    );

    // attendanceDate (for snapshots)
    const attendanceDate = departureDate.toISOString().slice(0, 10);

    // Filter assignments that match the trip's direction
    const matchingAssignments = assignments.filter((asg) => {
      if (tripType === "Morning") {
        return asg.trip_type === "Morning" || asg.trip_type === "Both";
      } else {
        return asg.trip_type === "Evening" || asg.trip_type === "Both";
      }
    });

    // 4. Batch insert student attendance snapshots
    if (matchingAssignments.length > 0) {
      const attendanceValues = matchingAssignments.map((asg) => [
        tripId,
        asg.student_id,
        asg.stop_id,
        tripType,
        "Absent",  // Default boarding status
        "Pending", // Default dropoff status
        attendanceDate,
      ]);

      await connection.query(
        `
          INSERT INTO student_attendance (
            trip_id,
            student_id,
            stop_id,
            trip_type,
            boarding_status,
            dropoff_status,
            attendance_date
          ) VALUES ?
        `,
        [attendanceValues]
      );
    }

    await connection.commit();

    // Retrieve and return the created trip details
    const [createdTrips] = await connection.query(
      `
        SELECT
          tm.*,
          r.route_name,
          r.route_id AS route_code
        FROM trip_monitoring tm
        LEFT JOIN routes r ON r.id = tm.route_id
        WHERE tm.id = ?
        LIMIT 1
      `,
      [tripId]
    );

    // Write audit log for created trip (immutable record)
    try {
      await pool.query(
        `INSERT INTO audit_logs (actorUserId, domain, entityType, entityId, action, previousStateJson, newStateJson) VALUES (?, 'transport', 'trip', ?, ?, NULL, ?)` ,
        [null, tripId, 'trip_created', JSON.stringify(createdTrips[0])]
      );
    } catch (err) {
      console.warn('Failed to write audit log for trip creation', err);
    }

    return mapTripRow(createdTrips[0]);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  listTripsForDate,
  getTripById,
  createTrip,
  listOrRecoverTripsForDate,
};
