const {
  getAssignmentsForDate,
  getAssignmentsForVehicle,
  getAssignmentForRouteAndPeriod,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getAssignmentHistory,
} = require("../services/vehicleRouteAssignment.service.js");

const getAllAssignments = async (req, res) => {
  try {
    const { date } = req.query;
    const assignments = await getAssignmentsForDate({ date });

    return res.status(200).json({
      success: true,
      message: "Assignments retrieved successfully.",
      data: assignments,
    });
  } catch (error) {
    console.error("Get assignments error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve assignments.",
    });
  }
};

const getVehicleAssignments = async (req, res) => {
  try {
    const { vehiclePlate } = req.params;
    const { date } = req.query;
    const assignments = await getAssignmentsForVehicle({ vehiclePlate, date });

    return res.status(200).json({
      success: true,
      message: "Vehicle assignments retrieved successfully.",
      data: assignments,
    });
  } catch (error) {
    console.error("Get vehicle assignments error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve vehicle assignments.",
    });
  }
};

const getRouteAssignment = async (req, res) => {
  try {
    const { routeId } = req.params;
    const { timePeriod, date } = req.query;
    const assignment = await getAssignmentForRouteAndPeriod({ 
      routeId: Number(routeId), 
      timePeriod, 
      date 
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "No active assignment found for this route and time period.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Assignment retrieved successfully.",
      data: assignment,
    });
  } catch (error) {
    console.error("Get route assignment error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve route assignment.",
    });
  }
};

const postAssignment = async (req, res) => {
  try {
    const userId = req.user ? Number(req.user.sub) : null;
    const assignment = await createAssignment({
      payload: req.body,
      userId,
    });

    return res.status(201).json({
      success: true,
      message: "Assignment created successfully.",
      data: assignment,
    });
  } catch (error) {
    if (error && error.code === "VEHICLE_PLATE_REQUIRED") {
      return res.status(400).json({
        success: false,
        message: "Vehicle plate is required.",
      });
    }

    if (error && error.code === "ROUTE_ID_REQUIRED") {
      return res.status(400).json({
        success: false,
        message: "Route ID is required.",
      });
    }

    if (error && error.code === "INVALID_TIME_PERIOD") {
      return res.status(400).json({
        success: false,
        message: "Valid time period (Morning, Evening, or Both) is required.",
      });
    }

    console.error("Create assignment error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create assignment.",
    });
  }
};

const patchAssignment = async (req, res) => {
  try {
    const userId = req.user ? Number(req.user.sub) : null;
    const { id } = req.params;
    const assignment = await updateAssignment({
      id: Number(id),
      payload: req.body,
      userId,
    });

    return res.status(200).json({
      success: true,
      message: "Assignment updated successfully.",
      data: assignment,
    });
  } catch (error) {
    if (error && error.code === "ASSIGNMENT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Assignment not found.",
      });
    }

    console.error("Update assignment error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update assignment.",
    });
  }
};

const deleteAssignmentHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deleteAssignment({ id: Number(id) });

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    if (error && error.code === "ASSIGNMENT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Assignment not found.",
      });
    }

    console.error("Delete assignment error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete assignment.",
    });
  }
};

const getAssignmentHistoryHandler = async (req, res) => {
  try {
    const { assignmentId, vehiclePlate } = req.query;
    const { limit } = req.query;
    const history = await getAssignmentHistory({
      assignmentId: assignmentId ? Number(assignmentId) : undefined,
      vehiclePlate,
      limit: limit ? Number(limit) : 50,
    });

    return res.status(200).json({
      success: true,
      message: "Assignment history retrieved successfully.",
      data: history,
    });
  } catch (error) {
    console.error("Get assignment history error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve assignment history.",
    });
  }
};

module.exports = {
  getAllAssignments,
  getVehicleAssignments,
  getRouteAssignment,
  postAssignment,
  patchAssignment,
  deleteAssignmentHandler,
  getAssignmentHistoryHandler,
};
