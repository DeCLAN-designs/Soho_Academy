const pool = require("../config/db.js");

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
const listTripsForDate = async (date) => {
  const targetDate = date || new Date().toISOString().slice(0, 10);

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

    // 2. Insert into trip_monitoring
    const [tripResult] = await connection.query(
      `
        INSERT INTO trip_monitoring (
          route_id,
          vehicle_plate,
          driver_name,
          assistant_name,
          departure_time,
          expected_return_time,
          status,
          total_stops,
          notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        route.id,
        route.vehicle_plate,
        route.assigned_driver,
        route.assigned_assistant || null,
        departureDate,
        expectedReturnDate,
        payload.status || "Not Started",
        route.total_stops || 0,
        payload.notes || null,
      ]
    );

    const tripId = tripResult.insertId;

    // 3. Retrieve student route assignments
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

    // Derive trip direction ('Morning' or 'Evening') from departure time
    // Morning is before 12:00, Evening is at or after 12:00
    const hours = departureDate.getHours();
    const tripType = hours < 12 ? "Morning" : "Evening";
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
};
