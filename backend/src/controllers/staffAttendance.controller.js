const {
  getStaffAttendanceForTrip,
  getStaffTodaySummary,
  listStaffTripsForDate,
  updateStaffAttendanceRecord,
} = require("../services/staffAttendance.service.js");

const getTodayOverview = async (req, res) => {
  try {
    const userId = Number(req.user.sub);
    const overview = await getStaffTodaySummary({ userId });

    return res.status(200).json({
      success: true,
      message: "Staff trip overview retrieved successfully.",
      data: overview,
    });
  } catch (error) {
    if (error && error.code === "INVALID_STAFF_ROLE") {
      return res.status(403).json({
        success: false,
        message: "You do not have permission for this resource.",
      });
    }

    console.error("Get staff today overview error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve staff trip overview.",
    });
  }
};

const getTrips = async (req, res) => {
  try {
    const userId = Number(req.user.sub);
    const trips = await listStaffTripsForDate({
      userId,
      date: req.query.date,
      tripType: req.query.tripType,
    });

    return res.status(200).json({
      success: true,
      message: "Staff trips retrieved successfully.",
      data: { trips },
    });
  } catch (error) {
    if (error && error.code === "INVALID_STAFF_ROLE") {
      return res.status(403).json({
        success: false,
        message: "You do not have permission for this resource.",
      });
    }

    console.error("Get staff trips error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve staff trips.",
    });
  }
};

const getTripAttendance = async (req, res) => {
  try {
    const userId = Number(req.user.sub);
    const tripId = Number(req.params.tripId);
    const detail = await getStaffAttendanceForTrip({ userId, tripId });

    return res.status(200).json({
      success: true,
      message: "Trip attendance retrieved successfully.",
      data: detail,
    });
  } catch (error) {
    if (error && error.code === "TRIP_ACCESS_DENIED") {
      return res.status(403).json({
        success: false,
        message: "Trip not found or not assigned to your account.",
      });
    }

    if (error && error.code === "INVALID_STAFF_ROLE") {
      return res.status(403).json({
        success: false,
        message: "You do not have permission for this resource.",
      });
    }

    console.error("Get staff trip attendance error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve trip attendance.",
    });
  }
};

const patchAttendance = async (req, res) => {
  try {
    const userId = Number(req.user.sub);
    const attendanceId = Number(req.params.attendanceId);
    const attendance = await updateStaffAttendanceRecord({
      userId,
      attendanceId,
      payload: req.body || {},
    });

    return res.status(200).json({
      success: true,
      message: "Attendance updated successfully.",
      data: { attendance },
    });
  } catch (error) {
    if (error && error.code === "ATTENDANCE_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found.",
      });
    }

    if (error && error.code === "TRIP_ACCESS_DENIED") {
      return res.status(403).json({
        success: false,
        message: "Trip not found or not assigned to your account.",
      });
    }

    if (error && error.code === "NO_ATTENDANCE_FIELDS") {
      return res.status(400).json({
        success: false,
        message: "No attendance fields were provided to update.",
      });
    }

    console.error("Patch staff attendance error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update attendance record.",
    });
  }
};

module.exports = {
  getTodayOverview,
  getTrips,
  getTripAttendance,
  patchAttendance,
};
