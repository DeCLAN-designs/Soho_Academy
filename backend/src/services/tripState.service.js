const pool = require('../config/db');

// Define allowed transitions and simple guard checks
const ALLOWED_TRANSITIONS = {
  'Not Started': ['Ready'],
  'Ready': ['In Progress', 'Cancelled'],
  'In Progress': ['Returned', 'Delayed'],
  'Delayed': ['In Progress', 'Returned'],
  'Returned': ['Archived'],
  'Cancelled': ['Archived'],
};

const isTransitionAllowed = (from, to) => {
  if (from === to) return true;
  const allowed = ALLOWED_TRANSITIONS[from] || [];
  return allowed.includes(to);
};

const transitionTripStatus = async ({ tripId, targetStatus, actorUserId }) => {
  if (!tripId) throw new Error('tripId required');
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const [rows] = await connection.query('SELECT * FROM trip_monitoring WHERE id = ? LIMIT 1', [tripId]);
    if (!rows || rows.length === 0) {
      const err = new Error('Trip not found');
      err.code = 'TRIP_NOT_FOUND';
      throw err;
    }
    const trip = rows[0];
    const current = trip.status || 'Not Started';

    if (!isTransitionAllowed(current, targetStatus)) {
      const err = new Error(`Invalid status transition: ${current} -> ${targetStatus}`);
      err.code = 'INVALID_TRANSITION';
      throw err;
    }

    // Simple guards
    if (targetStatus === 'Ready') {
      if (!trip.vehicle_plate) {
        const err = new Error('Cannot mark Ready: vehicle not assigned');
        err.code = 'VEHICLE_REQUIRED';
        throw err;
      }
      if (!trip.driver_name) {
        const err = new Error('Cannot mark Ready: driver not assigned');
        err.code = 'DRIVER_REQUIRED';
        throw err;
      }
    }

    if (targetStatus === 'In Progress') {
      if (current !== 'Ready' && current !== 'Delayed') {
        const err = new Error('Trip must be Ready or Delayed before marking In Progress');
        err.code = 'MUST_BE_READY';
        throw err;
      }
    }

    if (targetStatus === 'Returned') {
      if (current !== 'In Progress' && current !== 'Delayed') {
        const err = new Error('Trip must be In Progress or Delayed before marking Returned');
        err.code = 'MUST_BE_IN_PROGRESS';
        throw err;
      }
    }

    // Perform update
    await connection.query('UPDATE trip_monitoring SET status = ?, updated_at = NOW() WHERE id = ?', [targetStatus, tripId]);

    // Write audit log
    try {
      await connection.query(
        `INSERT INTO audit_logs (actorUserId, domain, entityType, entityId, action, previousStateJson, newStateJson) VALUES (?, 'transport', 'trip', ?, ?, ?, ?)` ,
        [actorUserId || null, tripId, 'trip_status_changed', JSON.stringify({ previous: current }), JSON.stringify({ new: targetStatus })]
      );
    } catch (e) {
      console.warn('Failed to write audit log for status change', e);
    }

    await connection.commit();

    const [updatedRows] = await pool.query('SELECT * FROM trip_monitoring WHERE id = ? LIMIT 1', [tripId]);
    return updatedRows[0];
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

module.exports = { transitionTripStatus, isTransitionAllowed };
