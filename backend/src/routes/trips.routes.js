const express = require("express");
const {
  getTripsByDate,
  getTripDetails,
  postTrip,
} = require("../controllers/trips.controller.js");
const { getTripProgress } = require('../controllers/progress.controller');
const { authenticate } = require("../middlewares/auth.middleware.js");
const { authorizeRoles } = require("../middlewares/auth.middleware.js");

const router = express.Router();

router.get("/trips/date/:date", authenticate, getTripsByDate);
router.get("/trips/:tripId", authenticate, getTripDetails);
router.get('/trips/:tripId/validate', authenticate, require('../controllers/trips.controller.js').getTripValidity);
router.post("/trips", authenticate, postTrip);
// Change trip status (guarded transitions)
router.post(
  '/trips/:tripId/status',
  authenticate,
  authorizeRoles('Admin', 'Transport Manager', 'Driver', 'Assistant', 'Bus Assistant'),
  require('../controllers/trips.controller.js').transitionTripStatus
);
// Manual recovery/emergency generation - Admins and Transport Managers only
router.post("/trips/generate/today", authenticate, authorizeRoles('Admin', 'Transport Manager'), require("../controllers/trips.controller.js").generateTodayTrips);
// Get cached trip progress (fast)
router.get('/trips/:tripId/progress', authenticate, getTripProgress);

module.exports = router;
