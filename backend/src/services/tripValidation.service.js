const pool = require('../config/db');

/**
 * Validate trip integrity and return a human-readable report
 * Rules covered:
 * - Route exists and active
 * - Trip session/date allowed by transport calendar
 * - Vehicle/driver/assistant presence (best-effort)
 * - Students snapshot consistency
 * - Unique constraint by route/date/session (duplicate detection)
 */
const transportCalendarService = require('./transportCalendar.service');

const validateTripById = async (tripId) => {
  const report = { valid: true, issues: [] };

  if (!tripId || Number.isNaN(Number(tripId))) {
    report.valid = false;
    report.issues.push('Invalid trip id');
    return report;
  }

  const [rows] = await pool.query(`SELECT tm.*, r.route_name, r.route_id AS route_code FROM trip_monitoring tm LEFT JOIN routes r ON r.id = tm.route_id WHERE tm.id = ? LIMIT 1`, [tripId]);
  if (!rows || rows.length === 0) {
    report.valid = false;
    report.issues.push('Trip not found');
    return report;
  }

  const trip = rows[0];

  // Check route
  if (!trip.route_id) {
    report.valid = false;
    report.issues.push('Trip has no route assigned');
  } else {
    const [rrows] = await pool.query('SELECT * FROM routes WHERE id = ? AND deleted_at IS NULL LIMIT 1', [trip.route_id]);
    if (!rrows || rrows.length === 0) {
      report.valid = false;
      report.issues.push('Assigned route not found or inactive');
    } else if (rrows[0].status !== 'Active') {
      report.valid = false;
      report.issues.push(`Assigned route status is ${rrows[0].status}`);
    }
  }

  // Transport calendar check (date/session)
  try {
    const tripDate = new Date(trip.departure_time).toISOString().slice(0,10);
    const cal = await transportCalendarService.isTransportDay(tripDate);
    if (!cal.transportEnabled) {
      report.valid = false;
      report.issues.push('Transport is disabled on trip date according to calendar');
    }
  } catch (err) {
    report.issues.push('Transport calendar check failed: ' + String(err));
  }

  // Check snapshots existence
  if (!trip.route_snapshot) report.issues.push('Missing route snapshot');
  if (!trip.students_snapshot) report.issues.push('Missing students snapshot');
  if (!trip.vehicle_snapshot) report.issues.push('Missing vehicle snapshot');

  // Duplicate detection via session/date/route
  try {
    const dateOnly = new Date(trip.departure_time).toISOString().slice(0,10);
    const timeCondition = trip.session === 'Morning' ? "TIME(departure_time) < '12:00:00'" : "TIME(departure_time) >= '12:00:00'";
    const [dups] = await pool.query(`SELECT id FROM trip_monitoring WHERE route_id = ? AND DATE(departure_time) = ? AND ${timeCondition} AND id <> ? LIMIT 1`, [trip.route_id, dateOnly, trip.id]);
    if (dups && dups.length > 0) {
      report.valid = false;
      report.issues.push('Duplicate trip detected for same route/date/session');
    }
  } catch (err) {
    report.issues.push('Duplicate check failed: ' + String(err));
  }

  // Check student attendance entries exist for this trip
  try {
    const [atts] = await pool.query('SELECT COUNT(1) AS cnt FROM student_attendance WHERE trip_id = ?', [tripId]);
    if (!atts || atts.length === 0 || Number(atts[0].cnt) === 0) {
      report.issues.push('No student attendance snapshots found for trip');
    }
  } catch (err) {
    report.issues.push('Attendance lookup failed: ' + String(err));
  }

  // Final validity: valid if no issues with 'valid' implications
  if (report.issues.length > 0) report.valid = false;
  return report;
};

module.exports = { validateTripById };
