const pool = require("../config/db.js");
const {
  listAttendanceForTrip,
  updateAttendanceRecord,
} = require("./studentAttendance.service.js");

const normalizePlate = (value) =>
  String(value || "")
    .replace(/\s+/g, "")
    .toUpperCase();

const getStaffIdentity = async (userId) => {
  const [rows] = await pool.query(
    `
      SELECT id, firstName, lastName, role, numberPlate
      FROM users
      WHERE id = ?
      LIMIT 1
    `,
    [userId]
  );

  if (rows.length === 0) {
    const error = new Error("Staff user not found.");
    error.code = "USER_NOT_FOUND";
    throw error;
  }

  const user = rows[0];
  const role = String(user.role || "").trim();

  if (!["Driver", "Bus Assistant"].includes(role)) {
    const error = new Error("Only drivers and bus assistants can access staff attendance.");
    error.code = "INVALID_STAFF_ROLE";
    throw error;
  }

  return {
    userId: user.id,
    fullName: [user.firstName, user.lastName].filter(Boolean).join(" ").trim(),
    role,
    numberPlate: normalizePlate(user.numberPlate),
  };
};

const getStaffTripAccessClause = (staff, tableAlias = "tm") => {
  const normalizedPlate = staff.numberPlate || "";

  if (staff.role === "Driver") {
    return {
      clause: `(
        ${tableAlias}.driver_name = ?
        OR REPLACE(UPPER(${tableAlias}.vehicle_plate), ' ', '') = ?
      )`,
      params: [staff.fullName, normalizedPlate],
    };
  }

  return {
    clause: `(
      ${tableAlias}.assistant_name = ?
      OR REPLACE(UPPER(${tableAlias}.vehicle_plate), ' ', '') = ?
    )`,
    params: [staff.fullName, normalizedPlate],
  };
};

const listStaffTripsForDate = async ({ userId, date, tripType }) => {
  const staff = await getStaffIdentity(userId);
  const targetDate =
    date && !Number.isNaN(new Date(date).getTime())
      ? new Date(date).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

  const access = getStaffTripAccessClause(staff);
  const params = [targetDate, ...access.params];
  const tripTypeFilter = tripType
    ? "AND CASE WHEN TIME(tm.departure_time) < '12:00:00' THEN 'Morning' ELSE 'Evening' END = ?"
    : "";

  if (tripType) {
    params.push(tripType);
  }

  const [rows] = await pool.query(
    `
      SELECT
        tm.id,
        tm.trip_id,
        tm.route_id,
        r.route_id AS route_code,
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
        AND ${access.clause}
      ${tripTypeFilter}
      ORDER BY tm.departure_time ASC
    `,
    params
  );

  return rows.map((row) => ({
    id: row.id,
    tripId: row.trip_id,
    routeId: row.route_id,
    routeCode: row.route_code,
    routeName: row.route_name,
    vehiclePlate: row.vehicle_plate,
    driverName: row.driver_name,
    assistantName: row.assistant_name,
    departureTime: row.departure_time,
    status: row.status,
    tripType: row.trip_type,
    stopsCompleted: row.stops_completed,
    totalStops: row.total_stops,
  }));
};

const assertStaffCanAccessTrip = async ({ userId, tripId }) => {
  const staff = await getStaffIdentity(userId);
  const access = getStaffTripAccessClause(staff);

  const [rows] = await pool.query(
    `
      SELECT tm.id
      FROM trip_monitoring tm
      WHERE tm.id = ?
        AND ${access.clause}
      LIMIT 1
    `,
    [tripId, ...access.params]
  );

  if (rows.length === 0) {
    const error = new Error("Trip not found or not assigned to this staff member.");
    error.code = "TRIP_ACCESS_DENIED";
    throw error;
  }

  return staff;
};

const getStaffAttendanceForTrip = async ({ userId, tripId }) => {
  await assertStaffCanAccessTrip({ userId, tripId });
  const attendance = await listAttendanceForTrip(tripId);

  const summary = {
    total: attendance.length,
    boarded: attendance.filter((record) => record.boarding_status === "Boarded").length,
    absent: attendance.filter((record) => record.boarding_status === "Absent").length,
    missedPickup: attendance.filter((record) => record.boarding_status === "Missed Pickup")
      .length,
    parentPickup: attendance.filter((record) => record.boarding_status === "Parent Pickup")
      .length,
    droppedOff: attendance.filter((record) => record.dropoff_status === "Dropped Off").length,
    pendingDropoff: attendance.filter((record) => record.dropoff_status === "Pending").length,
  };

  return { attendance, summary };
};

const updateStaffAttendanceRecord = async ({ userId, attendanceId, payload }) => {
  const [attendanceRows] = await pool.query(
    "SELECT trip_id FROM student_attendance WHERE id = ? LIMIT 1",
    [attendanceId]
  );

  if (attendanceRows.length === 0) {
    const error = new Error("Attendance record not found.");
    error.code = "ATTENDANCE_NOT_FOUND";
    throw error;
  }

  await assertStaffCanAccessTrip({
    userId,
    tripId: Number(attendanceRows[0].trip_id),
  });

  return updateAttendanceRecord({
    id: attendanceId,
    payload: {
      ...(payload || {}),
      confirmed_by_user_id: userId,
    },
  });
};

const getStaffTodaySummary = async ({ userId }) => {
  const trips = await listStaffTripsForDate({ userId });
  let totalStudents = 0;
  let boarded = 0;
  let droppedOff = 0;
  let pending = 0;

  for (const trip of trips) {
    const { summary } = await getStaffAttendanceForTrip({
      userId,
      tripId: trip.id,
    });
    totalStudents += summary.total;
    boarded += summary.boarded;
    droppedOff += summary.droppedOff;
    pending += summary.pendingDropoff;
  }

  return {
    trips,
    summary: {
      tripCount: trips.length,
      totalStudents,
      boarded,
      droppedOff,
      pendingDropoff: pending,
    },
  };
};

module.exports = {
  getStaffTodaySummary,
  getStaffAttendanceForTrip,
  listStaffTripsForDate,
  updateStaffAttendanceRecord,
};
