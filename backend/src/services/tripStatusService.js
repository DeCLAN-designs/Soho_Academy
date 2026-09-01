const pool = require("../config/db.js");

/**
 * Trip Status Service
 * 
 * Provides live trip progress tracking and status aggregation
 * for Transport Manager dashboards and real-time monitoring.
 */

/**
 * Get live trip progress for a specific date
 * 
 * @param {Object} options - Query options
 * @param {string} options.date - Target date (YYYY-MM-DD format)
 * @param {string} options.tripType - Filter by trip type ('Morning', 'Evening')
 * @param {number} options.routeId - Filter by route ID
 * @returns {Object} Trip progress summary
 */
const getLiveTripProgress = async ({ date, tripType, routeId } = {}) => {
  const targetDate = date || new Date().toISOString().slice(0, 10);
  
  let whereClause = 'DATE(tm.departure_time) = ?';
  const params = [targetDate];
  
  if (tripType) {
    const timeCondition = tripType === 'Morning'
      ? "TIME(tm.departure_time) < '12:00:00'"
      : "TIME(tm.departure_time) >= '12:00:00'";
    whereClause += ` AND ${timeCondition}`;
  }
  
  if (routeId) {
    whereClause += ' AND tm.route_id = ?';
    params.push(routeId);
  }
  
  const [trips] = await pool.query(
    `SELECT 
      tm.id,
      tm.trip_id,
      tm.route_id,
      r.route_name,
      tm.vehicle_plate,
      tm.driver_name,
      tm.assistant_name,
      tm.departure_time,
      tm.expected_return_time,
      tm.status,
      tm.session,
      tm.stops_completed,
      tm.total_stops,
      CASE WHEN TIME(tm.departure_time) < '12:00:00' THEN 'Morning' ELSE 'Evening' END AS trip_type
    FROM trip_monitoring tm
    INNER JOIN routes r ON r.id = tm.route_id
    WHERE ${whereClause}
    ORDER BY tm.departure_time ASC`,
    params
  );
  
  // Get attendance summary for each trip
  const tripProgress = await Promise.all(trips.map(async (trip) => {
    const [attendanceStats] = await pool.query(
      `SELECT 
        COUNT(*) as total_students,
        SUM(CASE WHEN boarding_status = 'Boarded' THEN 1 ELSE 0 END) as boarded,
        SUM(CASE WHEN boarding_status = 'Absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN boarding_status = 'Missed Pickup' THEN 1 ELSE 0 END) as missed_pickup,
        SUM(CASE WHEN boarding_status = 'Parent Pickup' THEN 1 ELSE 0 END) as parent_pickup,
        SUM(CASE WHEN dropoff_status = 'Dropped Off' THEN 1 ELSE 0 END) as dropped_off,
        SUM(CASE WHEN dropoff_status = 'Pending' THEN 1 ELSE 0 END) as pending_dropoff
      FROM student_attendance
      WHERE trip_id = ?`,
      [trip.id]
    );
    
    const stats = attendanceStats[0];
    const boarded = stats.boarded || 0;
    const total = stats.total_students || 0;
    const progress = total > 0 ? Math.round((boarded / total) * 100) : 0;
    
    return {
      tripId: trip.id,
      tripCode: trip.trip_id,
      routeName: trip.route_name,
      vehiclePlate: trip.vehicle_plate,
      driverName: trip.driver_name,
      assistantName: trip.assistant_name,
      departureTime: trip.departure_time,
      expectedReturnTime: trip.expected_return_time,
      status: trip.status,
      session: trip.session,
      tripType: trip.trip_type,
      stopsCompleted: trip.stops_completed,
      totalStops: trip.total_stops,
      progress: {
        totalStudents: total,
        boarded: boarded,
        absent: stats.absent || 0,
        missedPickup: stats.missed_pickup || 0,
        parentPickup: stats.parent_pickup || 0,
        droppedOff: stats.dropped_off || 0,
        pendingDropoff: stats.pending_dropoff || 0,
        percentage: progress,
        remaining: total - boarded
      }
    };
  }));
  
  // Calculate overall summary
  const summary = tripProgress.reduce((acc, trip) => ({
    totalTrips: acc.totalTrips + 1,
    totalStudents: acc.totalStudents + trip.progress.totalStudents,
    totalBoarded: acc.totalBoarded + trip.progress.boarded,
    totalDroppedOff: acc.totalDroppedOff + trip.progress.droppedOff,
    totalRemaining: acc.totalRemaining + trip.progress.remaining,
    activeTrips: acc.activeTrips + (trip.status === 'On Time' || trip.status === 'Delayed' ? 1 : 0),
    completedTrips: acc.completedTrips + (trip.status === 'Completed' ? 1 : 0)
  }), {
    totalTrips: 0,
    totalStudents: 0,
    totalBoarded: 0,
    totalDroppedOff: 0,
    totalRemaining: 0,
    activeTrips: 0,
    completedTrips: 0
  });
  
  const overallProgress = summary.totalStudents > 0 
    ? Math.round((summary.totalBoarded / summary.totalStudents) * 100) 
    : 0;
  
  return {
    date: targetDate,
    summary: {
      ...summary,
      overallProgress
    },
    trips: tripProgress
  };
};

/**
 * Get detailed attendance for a specific trip
 * 
 * @param {number} tripId - Trip ID
 * @returns {Object} Detailed attendance data
 */
const getTripAttendanceDetails = async (tripId) => {
  const [attendance] = await pool.query(
    `SELECT 
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
    ORDER BY sa.id ASC`,
    [tripId]
  );
  
  const [trip] = await pool.query(
    `SELECT 
      tm.*,
      r.route_name,
      r.route_id AS route_code
    FROM trip_monitoring tm
    INNER JOIN routes r ON r.id = tm.route_id
    WHERE tm.id = ?`,
    [tripId]
  );
  
  if (trip.length === 0) {
    throw new Error('Trip not found');
  }
  
  const summary = attendance.reduce((acc, record) => ({
    total: acc.total + 1,
    boarded: acc.boarded + (record.boarding_status === 'Boarded' ? 1 : 0),
    absent: acc.absent + (record.boarding_status === 'Absent' ? 1 : 0),
    missedPickup: acc.missedPickup + (record.boarding_status === 'Missed Pickup' ? 1 : 0),
    parentPickup: acc.parentPickup + (record.boarding_status === 'Parent Pickup' ? 1 : 0),
    droppedOff: acc.droppedOff + (record.dropoff_status === 'Dropped Off' ? 1 : 0),
    pendingDropoff: acc.pendingDropoff + (record.dropoff_status === 'Pending' ? 1 : 0)
  }), {
    total: 0,
    boarded: 0,
    absent: 0,
    missedPickup: 0,
    parentPickup: 0,
    droppedOff: 0,
    pendingDropoff: 0
  });
  
  return {
    trip: trip[0],
    attendance: attendance,
    summary,
    progress: summary.total > 0 ? Math.round((summary.boarded / summary.total) * 100) : 0
  };
};

/**
 * Get aggregate attendance statistics for a date range
 * 
 * @param {Object} options - Query options
 * @param {string} options.startDate - Start date
 * @param {string} options.endDate - End date
 * @param {string} options.tripType - Filter by trip type
 * @returns {Object} Aggregated statistics
 */
const getAttendanceStatistics = async ({ startDate, endDate, tripType } = {}) => {
  const start = startDate || new Date().toISOString().slice(0, 10);
  const end = endDate || start;
  
  let whereClause = 'attendance_date BETWEEN ? AND ?';
  const params = [start, end];
  
  if (tripType) {
    whereClause += ' AND trip_type = ?';
    params.push(tripType);
  }
  
  const [stats] = await pool.query(
    `SELECT 
      attendance_date,
      trip_type,
      COUNT(*) as total_students,
      SUM(CASE WHEN boarding_status = 'Boarded' THEN 1 ELSE 0 END) as boarded,
      SUM(CASE WHEN boarding_status = 'Absent' THEN 1 ELSE 0 END) as absent,
      SUM(CASE WHEN boarding_status = 'Missed Pickup' THEN 1 ELSE 0 END) as missed_pickup,
      SUM(CASE WHEN boarding_status = 'Parent Pickup' THEN 1 ELSE 0 END) as parent_pickup,
      SUM(CASE WHEN dropoff_status = 'Dropped Off' THEN 1 ELSE 0 END) as dropped_off
    FROM student_attendance
    WHERE ${whereClause}
    GROUP BY attendance_date, trip_type
    ORDER BY attendance_date DESC, trip_type`,
    params
  );
  
  return stats.map(row => ({
    date: row.attendance_date,
    tripType: row.trip_type,
    totalStudents: row.total_students,
    boarded: row.boarded || 0,
    absent: row.absent || 0,
    missedPickup: row.missed_pickup || 0,
    parentPickup: row.parent_pickup || 0,
    droppedOff: row.dropped_off || 0,
    attendanceRate: row.total_students > 0 ? Math.round((row.boarded / row.total_students) * 100) : 0
  }));
};

/**
 * Get real-time dashboard metrics for Transport Manager
 * 
 * @param {string} date - Target date (defaults to today)
 * @returns {Object} Dashboard metrics
 */
const getDashboardMetrics = async (date = null) => {
  const targetDate = date || new Date().toISOString().slice(0, 10);
  
  // Get operational metrics
  const [operations] = await pool.query(
    `SELECT 
      COUNT(DISTINCT tm.id) as total_trips,
      COUNT(DISTINCT tm.vehicle_plate) as active_vehicles,
      COUNT(DISTINCT CASE WHEN tm.status = 'On Time' OR tm.status = 'Delayed' THEN tm.id END) as active_trips,
      COUNT(DISTINCT CASE WHEN tm.status = 'Completed' THEN tm.id END) as completed_trips
    FROM trip_monitoring tm
    WHERE DATE(tm.departure_time) = ?`,
    [targetDate]
  );
  
  // Get student metrics
  const [students] = await pool.query(
    `SELECT 
      COUNT(DISTINCT sa.student_id) as total_students_tracked,
      SUM(CASE WHEN sa.boarding_status = 'Boarded' THEN 1 ELSE 0 END) as total_boarded,
      SUM(CASE WHEN sa.boarding_status = 'Absent' THEN 1 ELSE 0 END) as total_absent,
      SUM(CASE WHEN sa.dropoff_status = 'Dropped Off' THEN 1 ELSE 0 END) as total_dropped_off
    FROM student_attendance sa
    WHERE sa.attendance_date = ?`,
    [targetDate]
  );
  
  // Get route metrics
  const [routes] = await pool.query(
    `SELECT 
      COUNT(DISTINCT tm.route_id) as active_routes,
      COUNT(DISTINCT CASE WHEN tm.status = 'Completed' THEN tm.route_id END) as completed_routes
    FROM trip_monitoring tm
    WHERE DATE(tm.departure_time) = ?`,
    [targetDate]
  );
  
  // Get staff metrics
  const [staff] = await pool.query(
    `SELECT 
      COUNT(DISTINCT tm.driver_name) as active_drivers,
      COUNT(DISTINCT tm.assistant_name) as active_assistants
    FROM trip_monitoring tm
    WHERE DATE(tm.departure_time) = ?
      AND (tm.driver_name IS NOT NULL OR tm.assistant_name IS NOT NULL)`,
    [targetDate]
  );
  
  const ops = operations[0];
  const stud = students[0];
  const rts = routes[0];
  const stf = staff[0];
  
  // Calculate attendance rate
  const attendanceRate = stud.total_students_tracked > 0 
    ? Math.round((stud.total_boarded / stud.total_students_tracked) * 100) 
    : 0;
  
  return {
    date: targetDate,
    operations: {
      totalTrips: ops.total_trips || 0,
      activeVehicles: ops.active_vehicles || 0,
      activeTrips: ops.active_trips || 0,
      completedTrips: ops.completed_trips || 0
    },
    students: {
      totalTracked: stud.total_students_tracked || 0,
      totalBoarded: stud.total_boarded || 0,
      totalAbsent: stud.total_absent || 0,
      totalDroppedOff: stud.total_dropped_off || 0,
      attendanceRate
    },
    routes: {
      activeRoutes: rts.active_routes || 0,
      completedRoutes: rts.completed_routes || 0
    },
    staff: {
      activeDrivers: stf.active_drivers || 0,
      activeAssistants: stf.active_assistants || 0
    }
  };
};

module.exports = {
  getLiveTripProgress,
  getTripAttendanceDetails,
  getAttendanceStatistics,
  getDashboardMetrics
};