const pool = require("../config/db.js");

const normalizeDate = (value) => {
  if (!value) return null;

  const normalized = new Date(value);
  if (Number.isNaN(normalized.getTime())) {
    return null;
  }

  return normalized.toISOString().slice(0, 10);
};

const formatDateRange = (value) => normalizeDate(value) || null;

const listTripsForDate = async ({ date, tripType } = {}) => {
  const targetDate = formatDateRange(date) || new Date().toISOString().slice(0, 10);
  const params = [targetDate];
  const tripTypeFilter = tripType
    ? "AND CASE WHEN TIME(tm.departure_time) < '12:00:00' THEN 'Morning' ELSE 'Evening' END = ?"
    : "";

  if (tripType) params.push(tripType);

  const [rows] = await pool.query(
    `
      SELECT
        tm.id,
        tm.trip_id,
        tm.route_id,
        r.route_name,
        tm.vehicle_plate,
        tm.driver_name,
        tm.assistant_name,
        tm.departure_time,
        tm.status,
        tm.stops_completed,
        tm.total_stops,
        CASE WHEN TIME(tm.departure_time) < '12:00:00' THEN 'Morning' ELSE 'Evening' END AS trip_type
      FROM trip_monitoring tm
      INNER JOIN routes r ON r.id = tm.route_id
      WHERE DATE(tm.departure_time) = ?
      ${tripTypeFilter}
      ORDER BY tm.departure_time ASC
    `,
    params
  );

  return rows.map((row) => ({
    id: row.id,
    trip_id: row.trip_id,
    route_name: row.route_name,
    route_id: row.route_id,
    vehicle_plate: row.vehicle_plate,
    driver_name: row.driver_name,
    assistant_name: row.assistant_name,
    departure_time: row.departure_time,
    status: row.status,
    trip_type: row.trip_type,
    stops_completed: row.stops_completed,
    total_stops: row.total_stops,
  }));
};

const listAttendanceForTrip = async (tripId) => {
  const [rows] = await pool.query(
    `
      SELECT
        sa.id,
        sa.student_id,
        CONCAT(s.firstName, ' ', s.lastName) AS student_name,
        s.admissionNumber AS admission_number,
        s.grade,
        s.stream,
        st.stop_name,
        sa.stop_id,
        sa.trip_id,
        sa.trip_type,
        sa.boarding_status,
        sa.dropoff_status,
        sa.boarded_at,
        sa.dropped_off_at,
        CONCAT(u.firstName, ' ', u.lastName) AS confirmed_by,
        sa.notes,
        sa.attendance_date
      FROM student_attendance sa
      INNER JOIN students s ON s.id = sa.student_id
      INNER JOIN stops st ON st.id = sa.stop_id
      LEFT JOIN users u ON u.id = sa.confirmed_by_user_id
      WHERE sa.trip_id = ?
      ORDER BY sa.id ASC
    `,
    [tripId]
  );

  return rows;
};

const updateAttendanceRecord = async ({ id, payload }) => {
  const updates = [];
  const values = [];

  if (Object.prototype.hasOwnProperty.call(payload, "boarding_status")) {
    updates.push("boarding_status = ?");
    values.push(payload.boarding_status);

    if (payload.boarding_status === "Boarded") {
      updates.push("boarded_at = COALESCE(boarded_at, NOW())");
    } else {
      updates.push("boarded_at = NULL");
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, "dropoff_status")) {
    updates.push("dropoff_status = ?");
    values.push(payload.dropoff_status);

    if (payload.dropoff_status === "Dropped Off") {
      updates.push("dropped_off_at = COALESCE(dropped_off_at, NOW())");
    } else {
      updates.push("dropped_off_at = NULL");
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, "notes")) {
    updates.push("notes = ?");
    values.push(payload.notes ?? null);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "confirmed_by_user_id")) {
    updates.push("confirmed_by_user_id = ?");
    values.push(payload.confirmed_by_user_id ?? null);
  }

  if (updates.length === 0) {
    const error = new Error("No attendance fields were provided to update.");
    error.code = "NO_ATTENDANCE_FIELDS";
    throw error;
  }

  values.push(id);

  await pool.query(
    `UPDATE student_attendance SET ${updates.join(", ")} WHERE id = ?`,
    values
  );

  const tripIdResult = await pool.query("SELECT trip_id FROM student_attendance WHERE id = ?", [id]);
  const tripId = tripIdResult[0][0]?.trip_id;
  const records = await listAttendanceForTrip(tripId);

  return records.find((record) => record.id === Number(id)) || records[0] || null;
};

const bulkUpdateAttendance = async (records) => {
  if (!Array.isArray(records) || records.length === 0) {
    const error = new Error("At least one attendance record is required.");
    error.code = "NO_ATTENDANCE_RECORDS";
    throw error;
  }

  const results = [];

  for (const record of records) {
    const updated = await updateAttendanceRecord({
      id: Number(record.id),
      payload: record,
    });
    results.push(updated);
  }

  return results.flat();
};

const getAttendanceSummary = async ({ from, to, routeId }) => {
  const startDate = formatDateRange(from) || new Date().toISOString().slice(0, 10);
  const endDate = formatDateRange(to) || startDate;

  const params = [startDate, endDate];
  let routeFilter = "";

  if (routeId) {
    routeFilter = " AND sa.trip_id IN (SELECT id FROM trip_monitoring WHERE route_id = ?)";
    params.push(Number(routeId));
  }

  const [rows] = await pool.query(
    `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN sa.boarding_status = 'Boarded' THEN 1 ELSE 0 END) AS boarded,
        SUM(CASE WHEN sa.boarding_status = 'Absent' THEN 1 ELSE 0 END) AS absent,
        SUM(CASE WHEN sa.boarding_status = 'Missed Pickup' THEN 1 ELSE 0 END) AS missed_pickup,
        SUM(CASE WHEN sa.boarding_status = 'Parent Pickup' THEN 1 ELSE 0 END) AS parent_pickup,
        SUM(CASE WHEN sa.dropoff_status = 'Dropped Off' THEN 1 ELSE 0 END) AS dropped_off,
        SUM(CASE WHEN sa.dropoff_status = 'Pending' THEN 1 ELSE 0 END) AS pending_dropoff
      FROM student_attendance sa
      WHERE sa.attendance_date BETWEEN ? AND ?
      ${routeFilter}
    `,
    params
  );

  return {
    from: startDate,
    to: endDate,
    route_id: routeId ? Number(routeId) : null,
    total: Number(rows[0]?.total || 0),
    boarded: Number(rows[0]?.boarded || 0),
    absent: Number(rows[0]?.absent || 0),
    missed_pickup: Number(rows[0]?.missed_pickup || 0),
    parent_pickup: Number(rows[0]?.parent_pickup || 0),
    dropped_off: Number(rows[0]?.dropped_off || 0),
    pending_dropoff: Number(rows[0]?.pending_dropoff || 0),
  };
};

const getStudentAttendanceReport = async (studentId) => {
  const [rows] = await pool.query(
    `
      SELECT
        sa.id,
        sa.trip_id,
        sa.attendance_date,
        sa.trip_type,
        sa.boarding_status,
        sa.dropoff_status,
        sa.boarded_at,
        sa.dropped_off_at,
        sa.notes,
        tm.trip_id AS trip_code,
        r.route_name,
        st.stop_name
      FROM student_attendance sa
      INNER JOIN trip_monitoring tm ON tm.id = sa.trip_id
      INNER JOIN routes r ON r.id = tm.route_id
      INNER JOIN stops st ON st.id = sa.stop_id
      WHERE sa.student_id = ?
      ORDER BY sa.attendance_date DESC, sa.id DESC
    `,
    [studentId]
  );

  return rows;
};

const getAttendanceAnalytics = async ({ date } = {}) => {
  const targetDate = formatDateRange(date) || new Date().toISOString().slice(0, 10);

  const [rows] = await pool.query(
    `
      SELECT
        COUNT(*) AS total_records,
        SUM(CASE WHEN sa.boarding_status = 'Boarded' THEN 1 ELSE 0 END) AS boarded,
        SUM(CASE WHEN sa.boarding_status = 'Absent' THEN 1 ELSE 0 END) AS absent,
        SUM(CASE WHEN sa.boarding_status = 'Missed Pickup' THEN 1 ELSE 0 END) AS missed_pickup,
        SUM(CASE WHEN sa.boarding_status = 'Parent Pickup' THEN 1 ELSE 0 END) AS parent_pickup,
        SUM(CASE WHEN sa.dropoff_status = 'Dropped Off' THEN 1 ELSE 0 END) AS dropped_off,
        SUM(CASE WHEN sa.dropoff_status = 'Pending' THEN 1 ELSE 0 END) AS pending_dropoff
      FROM student_attendance sa
      WHERE sa.attendance_date = ?
    `,
    [targetDate]
  );

  const [tripRows] = await pool.query(
    `
      SELECT
        tm.id,
        tm.trip_id,
        r.route_name,
        tm.status,
        COUNT(sa.id) AS records
      FROM trip_monitoring tm
      INNER JOIN routes r ON r.id = tm.route_id
      LEFT JOIN student_attendance sa ON sa.trip_id = tm.id AND sa.attendance_date = ?
      WHERE DATE(tm.departure_time) = ?
      GROUP BY tm.id, tm.trip_id, r.route_name, tm.status
      ORDER BY tm.departure_time ASC
    `,
    [targetDate, targetDate]
  );

  return {
    date: targetDate,
    totals: {
      total_records: Number(rows[0]?.total_records || 0),
      boarded: Number(rows[0]?.boarded || 0),
      absent: Number(rows[0]?.absent || 0),
      missed_pickup: Number(rows[0]?.missed_pickup || 0),
      parent_pickup: Number(rows[0]?.parent_pickup || 0),
      dropped_off: Number(rows[0]?.dropped_off || 0),
      pending_dropoff: Number(rows[0]?.pending_dropoff || 0),
    },
    trips: tripRows,
  };
};

module.exports = {
  bulkUpdateAttendance,
  getAttendanceAnalytics,
  getAttendanceSummary,
  getStudentAttendanceReport,
  listAttendanceForTrip,
  listTripsForDate,
  updateAttendanceRecord,
};
