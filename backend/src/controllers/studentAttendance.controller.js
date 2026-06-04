const {
  bulkUpdateAttendance,
  getAttendanceAnalytics: getAnalytics,
  getAttendanceSummary,
  getStudentAttendanceReport: getStudentReport,
  listAttendanceForTrip,
  listTripsForDate,
  updateAttendanceRecord,
} = require("../services/studentAttendance.service.js");

const handleAttendanceError = (res, error, defaultMessage) => {
  if (error && error.code === "NO_ATTENDANCE_FIELDS") {
    return res.status(400).json({ success: false, message: "No attendance fields were provided to update." });
  }

  if (error && error.code === "NO_ATTENDANCE_RECORDS") {
    return res.status(400).json({ success: false, message: "At least one attendance record is required." });
  }

  console.error(defaultMessage, error);

  return res.status(500).json({ success: false, message: defaultMessage });
};

const getTripsForDate = async (req, res) => {
  try {
    const trips = await listTripsForDate({ date: req.query.date, tripType: req.query.trip_type });

    return res.status(200).json({ success: true, data: trips });
  } catch (error) {
    return handleAttendanceError(res, error, "Failed to fetch trips.");
  }
};

const getAllTrips = async (req, res) => {
  try {
    const trips = await listTripsForDate({ date: req.query.date, tripType: req.query.trip_type });

    return res.status(200).json({ success: true, data: trips });
  } catch (error) {
    return handleAttendanceError(res, error, "Failed to fetch trips.");
  }
};

const getAttendanceByTrip = async (req, res) => {
  try {
    const attendance = await listAttendanceForTrip(Number(req.params.tripId));

    return res.status(200).json({ success: true, data: attendance });
  } catch (error) {
    return handleAttendanceError(res, error, "Failed to fetch attendance records.");
  }
};

const patchAttendanceRecord = async (req, res) => {
  try {
    const attendance = await updateAttendanceRecord({ id: Number(req.params.id), payload: req.body || {} });

    return res.status(200).json({ success: true, message: "Attendance updated successfully.", data: attendance });
  } catch (error) {
    return handleAttendanceError(res, error, "Failed to update attendance record.");
  }
};

const postBulkAttendanceUpdate = async (req, res) => {
  try {
    const attendance = await bulkUpdateAttendance(req.body || []);

    return res.status(200).json({ success: true, message: "Attendance records updated successfully.", data: attendance });
  } catch (error) {
    return handleAttendanceError(res, error, "Failed to bulk update attendance records.");
  }
};

const getAttendanceSummaryReport = async (req, res) => {
  try {
    const summary = await getAttendanceSummary({
      from: req.query.from,
      to: req.query.to,
      routeId: req.query.route_id,
    });

    return res.status(200).json({ success: true, data: summary });
  } catch (error) {
    return handleAttendanceError(res, error, "Failed to generate attendance summary.");
  }
};

const getStudentAttendanceReportHandler = async (req, res) => {
  try {
    const report = await getStudentReport(Number(req.params.studentId));

    return res.status(200).json({ success: true, data: report });
  } catch (error) {
    return handleAttendanceError(res, error, "Failed to fetch student attendance report.");
  }
};

const getAttendanceAnalyticsHandler = async (req, res) => {
  try {
    const analytics = await getAnalytics({ date: req.query.date });

    return res.status(200).json({ success: true, data: analytics });
  } catch (error) {
    return handleAttendanceError(res, error, "Failed to fetch attendance analytics.");
  }
};

module.exports = {
  getAllTrips,
  getAttendanceAnalyticsHandler,
  getAttendanceByTrip,
  getAttendanceSummaryReport,
  getStudentAttendanceReportHandler,
  getTripsForDate,
  patchAttendanceRecord,
  postBulkAttendanceUpdate,
};
