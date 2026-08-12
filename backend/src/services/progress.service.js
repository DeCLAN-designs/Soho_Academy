const pool = require('../config/db.js');
const realtime = require('../utils/realtime');

/**
 * Aggregate attendance counts for a trip and cache the progress in Redis.
 */
const updateProgressForTrip = async (tripId) => {
  if (!tripId) return null;

  // Get attendance aggregates
  const [rows] = await pool.query(
    `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN boarding_status = 'Boarded' THEN 1 ELSE 0 END) AS boarded,
        SUM(CASE WHEN boarding_status = 'Absent' THEN 1 ELSE 0 END) AS absent,
        SUM(CASE WHEN dropoff_status = 'Dropped Off' THEN 1 ELSE 0 END) AS dropped_off,
        SUM(CASE WHEN dropoff_status = 'Pending' THEN 1 ELSE 0 END) AS pending_dropoff
      FROM student_attendance
      WHERE trip_id = ?
    `,
    [tripId]
  );

  const data = rows[0] || { total: 0, boarded: 0, absent: 0, dropped_off: 0, pending_dropoff: 0 };

  // Get trip meta
  const [tripRows] = await pool.query(
    `SELECT id, trip_id AS tripCode, route_id, driver_name, assistant_name, vehicle_plate, departure_time, status FROM trip_monitoring WHERE id = ? LIMIT 1`,
    [tripId]
  );
  const trip = tripRows[0] || null;

  const progress = {
    tripId: tripId,
    tripCode: trip ? trip.tripCode : null,
    routeId: trip ? trip.route_id : null,
    vehiclePlate: trip ? trip.vehicle_plate : null,
    driverName: trip ? trip.driver_name : null,
    assistantName: trip ? trip.assistant_name : null,
    departureTime: trip ? trip.departure_time : null,
    status: trip ? trip.status : null,
    totals: {
      total: Number(data.total || 0),
      boarded: Number(data.boarded || 0),
      absent: Number(data.absent || 0),
      dropped_off: Number(data.dropped_off || 0),
      pending_dropoff: Number(data.pending_dropoff || 0),
    }
  };

  // Compute percentages
  progress.totals.pickupPercentage = progress.totals.total > 0 ? Math.round((progress.totals.boarded / progress.totals.total) * 100) : 0;
  progress.totals.dropoffPercentage = progress.totals.total > 0 ? Math.round((progress.totals.dropped_off / progress.totals.total) * 100) : 0;

  // Cache in Redis for fast reads
  try {
    await realtime.setTripProgress(tripId, progress);
  } catch (err) {
    console.warn('Failed to cache trip progress', err);
  }

  return progress;
};

const getProgressForTrip = async (tripId) => {
  const cached = await realtime.getTripProgress(tripId);
  if (cached) return cached;
  return updateProgressForTrip(tripId);
};

module.exports = { updateProgressForTrip, getProgressForTrip };
