const pool = require("../config/db.js");
const { getTodayDateInTimezone } = require("../utils/date.js");
const { getAssignmentForRouteAndPeriod } = require('./vehicleRouteAssignment.service');
const { EventPublisher } = require('../utils/eventPublisher');
const eventPublisher = new EventPublisher();
const { attendanceUpdates } = require('../utils/metrics');

const UTC_TIMEZONE = "+00:00";
const DB_TIMEZONE = process.env.DB_TIMEZONE || "+03:00";
const localDepartureTime = `CONVERT_TZ(tm.departure_time, '${UTC_TIMEZONE}', '${DB_TIMEZONE}')`;

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
  const targetDate = formatDateRange(date) || getTodayDateInTimezone();
  const params = [targetDate];
  const tripTypeFilter = tripType
    ? `AND CASE WHEN TIME(${localDepartureTime}) < '12:00:00' THEN 'Morning' ELSE 'Evening' END = ?`
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
        CASE WHEN TIME(${localDepartureTime}) < '12:00:00' THEN 'Morning' ELSE 'Evening' END AS trip_type
      FROM trip_monitoring tm
      INNER JOIN routes r ON r.id = tm.route_id
      WHERE DATE(${localDepartureTime}) = ?
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
  try { attendanceUpdates.inc(); } catch (e) {}
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

  // Optimistic locking: attempt update with updatedAt match
  const maxAttempts = 3;
  let attempt = 0;
  let lastError = null;

  while (attempt < maxAttempts) {
    attempt++;

    // Get current row for audit and concurrency control
    const [rows] = await pool.query("SELECT * FROM student_attendance WHERE id = ? LIMIT 1", [id]);
    if (rows.length === 0) {
      const error = new Error("Attendance record not found.");
      error.code = "ATTENDANCE_NOT_FOUND";
      throw error;
    }

    const currentRow = rows[0];
    const currentUpdatedAt = currentRow.updatedAt;

    // Permission check: only assigned driver or assistant for the trip may update attendance
    if (payload.confirmed_by_user_id) {
      try {
        const [tripRow] = await pool.query("SELECT route_id, departure_time FROM trip_monitoring WHERE id = ? LIMIT 1", [currentRow.trip_id]);
        if ((tripRow || []).length === 1) {
          const trip = tripRow[0];
          const tripDate = new Date(trip.departure_time).toISOString().slice(0,10);
          const hours = new Date(trip.departure_time).getHours();
          const timePeriod = hours < 12 ? 'Morning' : 'Evening';
          const assignment = await getAssignmentForRouteAndPeriod({ routeId: trip.route_id, timePeriod, date: tripDate });
          if (assignment) {
            const actorId = Number(payload.confirmed_by_user_id);
            if (actorId !== Number(assignment.driverUserId) && actorId !== Number(assignment.assistantUserId)) {
              const err = new Error('User is not authorized to update this attendance record.');
              err.code = 'FORBIDDEN';
              throw err;
            }
          }
        }
      } catch (err) {
        if (err.code === 'FORBIDDEN') throw err;
        // If assignment lookup fails, allow update but log a warning
        console.warn('Failed to verify attendance update permissions:', err);
      }
    }

    // Build conditional update using current updatedAt to detect concurrent modifications
    const conditionalSql = `UPDATE student_attendance SET ${updates.join(", ")} WHERE id = ? AND updatedAt = ?`;
    const conditionalValues = values.slice(0, values.length - 1).concat([id, currentUpdatedAt]);

    const [result] = await pool.query(conditionalSql, conditionalValues);
    // result.affectedRows may be 0 if updatedAt changed concurrently
    if (result.affectedRows === 1) {
      try {
        // Fetch new state
        const [newRows] = await pool.query("SELECT * FROM student_attendance WHERE id = ? LIMIT 1", [id]);
        const newRow = newRows[0];

        // Write audit log for attendance change
        try {
          await pool.query(
            `INSERT INTO audit_logs (actorUserId, domain, entityType, entityId, action, previousStateJson, newStateJson) VALUES (?, 'attendance', 'student_attendance', ?, ?, ?, ?)`,
            [payload.confirmed_by_user_id || null, id, 'attendance_update', JSON.stringify(currentRow), JSON.stringify(newRow)]
          );
        } catch (err) {
          console.warn('Failed to write attendance audit log', err);
        }

        // Publish attendance_marked event for real-time updates (event store + Redis pub/sub)
        try {
          await eventPublisher.publish('attendance_marked', {
            tripId: newRow.trip_id,
            studentId: newRow.student_id,
            boardingStatus: newRow.boarding_status,
            dropoffStatus: newRow.dropoff_status,
            confirmedBy: payload.confirmed_by_user_id || null,
            tripType: newRow.trip_type,
            attendanceDate: newRow.attendance_date,
          });
        } catch (err) {
          console.warn('Failed to publish attendance_marked event to event store', err);
        }

        try {
          const realtime = require('../utils/realtime');
          await realtime.publish('attendance_marked', {
            tripId: newRow.trip_id,
            studentId: newRow.student_id,
            boardingStatus: newRow.boarding_status,
            dropoffStatus: newRow.dropoff_status,
            confirmedBy: payload.confirmed_by_user_id || null,
            tripType: newRow.trip_type,
            attendanceDate: newRow.attendance_date,
          });
        } catch (err) {
          console.warn('Failed to publish attendance_marked event to realtime channel', err);
        }
        // Recalculate and cache progress for this trip
        try {
          const progressService = require('./progress.service');
          await progressService.updateProgressForTrip(newRow.trip_id);
        } catch (err) {
          console.warn('Failed to update cached trip progress', err);
        }

        const tripIdResult = await pool.query("SELECT trip_id FROM student_attendance WHERE id = ?", [id]);
        const tripId = tripIdResult[0][0]?.trip_id;
        const records = await listAttendanceForTrip(tripId);

        return records.find((record) => record.id === Number(id)) || records[0] || null;
      } catch (err) {
        lastError = err;
        break;
      }
    }

    // Conflict detected — retry with exponential backoff
    lastError = new Error('CONFLICT: Attendance record was modified concurrently');
    lastError.code = 'ATTENDANCE_CONFLICT';
    const backoffMs = Math.pow(2, attempt) * 100;
    await new Promise((r) => setTimeout(r, backoffMs));
  }

  throw lastError;
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
  const startDate = formatDateRange(from) || getTodayDateInTimezone();
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
  const targetDate = formatDateRange(date) || getTodayDateInTimezone();

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
