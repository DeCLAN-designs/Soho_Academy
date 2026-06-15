const express = require("express");
const {
  getAllTrips,
  getAttendanceAnalyticsHandler,
  getAttendanceByTrip,
  getAttendanceSummaryReport,
  getStudentAttendanceReportHandler,
  getTripsForDate,
  patchAttendanceRecord,
  postBulkAttendanceUpdate,
} = require("../controllers/studentAttendance.controller.js");
const { authenticate } = require("../middlewares/auth.middleware.js");

const router = express.Router();

router.use(authenticate);

router.get("/attendance/trips", getTripsForDate);
router.get("/trips", getAllTrips);
router.get("/attendance/trip/:tripId", getAttendanceByTrip);
router.patch("/attendance/:id", patchAttendanceRecord);
router.post("/attendance/bulk", postBulkAttendanceUpdate);
router.get("/attendance/summary", getAttendanceSummaryReport);
router.get("/attendance/student/:studentId", getStudentAttendanceReportHandler);
router.get("/attendance/analytics", getAttendanceAnalyticsHandler);

module.exports = router;
