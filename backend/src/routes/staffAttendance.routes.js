const express = require("express");
const {
  getTodayOverview,
  getTrips,
  getTripAttendance,
  patchAttendance,
} = require("../controllers/staffAttendance.controller.js");
const {
  authenticate,
  authorizeRoles,
} = require("../middlewares/auth.middleware.js");

const router = express.Router();

const staffAuth = [authenticate, authorizeRoles("Driver", "Bus Assistant")];

router.get("/overview/today", ...staffAuth, getTodayOverview);
router.get("/trips", ...staffAuth, getTrips);
router.get("/trips/:tripId/attendance", ...staffAuth, getTripAttendance);
router.patch("/attendance/:attendanceId", ...staffAuth, patchAttendance);

module.exports = router;
