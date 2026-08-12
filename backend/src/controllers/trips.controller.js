const {
  listTripsForDate,
  listOrRecoverTripsForDate,
  getTripById,
  createTrip,
} = require("../services/trips.service.js");
const { generateDailyTrips } = require("../jobs/dailyTrips.job.js");
const { validateTripById } = require('../services/tripValidation.service');
const { transitionTripStatus } = require('../services/tripState.service');

const handleTripsError = (res, error, defaultMessage) => {
  if (
    error &&
    [
      "ROUTE_REQUIRED",
      "DEPARTURE_TIME_REQUIRED",
      "EXPECTED_RETURN_TIME_REQUIRED",
      "INVALID_DEPARTURE_TIME",
      "INVALID_EXPECTED_RETURN_TIME",
      "INVALID_RETURN_TIME_SEQUENCE",
      "ROUTE_INACTIVE",
    ].includes(error.code)
  ) {
    return res.status(400).json({ success: false, message: error.message });
  }

  if (error && error.code === 'TRANSPORT_NOT_ENABLED') {
    return res.status(400).json({ success: false, message: error.message });
  }

  if (error && error.code === "ROUTE_NOT_FOUND") {
    return res.status(404).json({ success: false, message: error.message });
  }

  console.error(defaultMessage, error);
  return res.status(500).json({ success: false, message: defaultMessage });
};

const getTripsByDate = async (req, res) => {
  try {
    const date = req.params.date || req.query.date;
    // Use self-healing recovery when requesting today's trips
    const targetDate = date || new Date().toISOString().slice(0,10);
    let trips;
    const todayStr = new Date().toISOString().slice(0,10);
    if (targetDate === todayStr) {
      trips = await listOrRecoverTripsForDate(targetDate);
    } else {
      trips = await listTripsForDate(targetDate);
    }

    return res.status(200).json({ success: true, data: trips });
  } catch (error) {
    return handleTripsError(res, error, "Failed to retrieve trips.");
  }
};

const getTripDetails = async (req, res) => {
  try {
    const tripId = Number(req.params.tripId);
    if (Number.isNaN(tripId)) {
      return res.status(400).json({ success: false, message: "Invalid trip ID." });
    }

    const trip = await getTripById({ id: tripId });
    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found." });
    }

    return res.status(200).json({ success: true, data: trip });
  } catch (error) {
    return handleTripsError(res, error, "Failed to retrieve trip details.");
  }
};

const getTripValidity = async (req, res) => {
  try {
    const tripId = Number(req.params.tripId);
    if (Number.isNaN(tripId)) return res.status(400).json({ success: false, message: 'Invalid trip id' });
    const report = await validateTripById(tripId);
    return res.status(200).json({ success: true, data: report });
  } catch (err) {
    console.error('Failed to validate trip', err);
    return res.status(500).json({ success: false, message: 'Failed to validate trip' });
  }
};

const postTrip = async (req, res) => {
  try {
    const createdTrip = await createTrip({ payload: req.body || {} });
    return res.status(201).json({
      success: true,
      message: "Trip created successfully and attendance generated.",
      data: createdTrip,
    });
  } catch (error) {
    return handleTripsError(res, error, "Failed to create trip.");
  }
};

const generateTodayTrips = async (req, res) => {
  try {
    const userId = req.user ? Number(req.user.sub) : null;
    await generateDailyTrips({ date: undefined });

    // Audit who initiated the manual generation
    try {
      await require('../config/db.js').query(
        `INSERT INTO audit_logs (actorUserId, domain, entityType, entityId, action, previousStateJson, newStateJson) VALUES (?, 'transport', 'trip', 0, ?, NULL, ?)` ,
        [userId, 'manual_trip_generation_initiated', JSON.stringify({ initiatedBy: userId, timestamp: new Date().toISOString() })]
      );
    } catch (err) {
      console.warn('Failed to write manual generation audit log', err);
    }

    return res.status(200).json({ success: true, message: 'Manual trip generation initiated. Missing trips will be created.' });
  } catch (error) {
    console.error('Failed to run manual trip generation', error);
    return res.status(500).json({ success: false, message: 'Failed to generate trips.' });
  }
};

// Controller wrapper for trip status transition route
const transitionTripStatusHandler = async (req, res) => {
  try {
    const tripId = Number(req.params.tripId);
    const { status } = req.body || {};
    if (Number.isNaN(tripId) || !status) return res.status(400).json({ success: false, message: 'tripId and status required' });
    const actorUserId = req.user ? Number(req.user.sub) : null;

    // RBAC: determine who can perform which transitions
    const role = req.user ? req.user.role : null;
    const adminRoles = ['Admin', 'Transport Manager'];
    const inTripRoles = ['Driver', 'Assistant', 'Bus Assistant'];

    const preTripOnly = ['Ready', 'Cancelled']; // set before trip starts
    const driverOrInTrip = ['In Progress', 'Delayed', 'Returned']; // during/after trip
    const adminOnly = ['Archived'];

    if (preTripOnly.includes(status) && !adminRoles.includes(role)) {
      return res.status(403).json({ success: false, message: 'Only Admin or Transport Manager may perform this action' });
    }

    if (driverOrInTrip.includes(status) && !(adminRoles.includes(role) || inTripRoles.includes(role))) {
      return res.status(403).json({ success: false, message: 'Only Driver/Assistant or Admin/Transport Manager may perform this action' });
    }

    if (adminOnly.includes(status) && !adminRoles.includes(role)) {
      return res.status(403).json({ success: false, message: 'Only Admin or Transport Manager may archive trips' });
    }

    const updated = await transitionTripStatus({ tripId, targetStatus: status, actorUserId });
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    if (err && err.code === 'TRIP_NOT_FOUND') return res.status(404).json({ success: false, message: err.message });
    if (err && err.code === 'INVALID_TRANSITION') return res.status(400).json({ success: false, message: err.message });
    if (err && err.code === 'VEHICLE_REQUIRED') return res.status(400).json({ success: false, message: err.message });
    if (err && err.code === 'DRIVER_REQUIRED') return res.status(400).json({ success: false, message: err.message });
    return res.status(500).json({ success: false, message: 'Failed to change trip status' });
  }
};

module.exports = {
  getTripsByDate,
  getTripDetails,
  postTrip,
  generateTodayTrips,
  getTripValidity,
  // status transitions
  transitionTripStatus: transitionTripStatusHandler,
};
