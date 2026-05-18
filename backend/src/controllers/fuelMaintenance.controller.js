const {
  createFuelMaintenanceRequest,
  listFuelMaintenanceRequestsByUser,
  listAllFuelMaintenanceRequests,
  confirmFuelMaintenanceRequest,
} = require("../services/fuelMaintenance.service.js");

const createRequest = async (req, res) => {
  try {
    const request = await createFuelMaintenanceRequest({
      payload: req.body || {},
      createdByUserId: Number(req.user.sub),
    });

    return res.status(201).json({
      success: true,
      message: "Fuel and maintenance request created successfully.",
      data: {
        request,
      },
    });
  } catch (error) {
    if (error && error.code === "NUMBER_PLATE_NOT_FOUND") {
      return res.status(400).json({
        success: false,
        message:
          "Selected number plate is not available. Choose an active number plate.",
      });
    }

    if (error && error.code === "AMOUNT_REQUIRED_FOR_FUEL") {
      return res.status(400).json({
        success: false,
        message: "amount is required when requestType is Fuel.",
      });
    }

    if (error && error.code === "INVALID_AMOUNT_FOR_FUEL") {
      return res.status(400).json({
        success: false,
        message: "amount must be greater than zero for Fuel requests.",
      });
    }

    if (error && error.code === "DRIVER_NUMBER_PLATE_NOT_ASSIGNED") {
      return res.status(400).json({
        success: false,
        message: "No number plate is assigned to this driver account.",
      });
    }

    if (error && error.code === "DRIVER_NUMBER_PLATE_MISMATCH") {
      return res.status(403).json({
        success: false,
        message:
          "Drivers can only submit requests for their assigned number plate.",
      });
    }

    console.error("Create fuel and maintenance request error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create fuel and maintenance request.",
    });
  }
};

const getRequests = async (req, res) => {
  try {
    const requests = await listFuelMaintenanceRequestsByUser({
      createdByUserId: Number(req.user.sub),
    });

    return res.status(200).json({
      success: true,
      message: "Fuel and maintenance requests retrieved successfully.",
      data: {
        requests,
      },
    });
  } catch (error) {
    console.error("Get fuel and maintenance requests error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch fuel and maintenance requests.",
    });
  }
};

const getAllRequests = async (req, res) => {
  try {
    const { status, numberPlate, limit = 100, offset = 0 } = req.query;

    const requests = await listAllFuelMaintenanceRequests({
      status: status || null,
      numberPlate: numberPlate || null,
      limit: Math.min(Number(limit), 200),
      offset: Number(offset),
    });

    return res.status(200).json({
      success: true,
      message: "All fuel and maintenance requests retrieved successfully.",
      data: {
        requests,
      },
    });
  } catch (error) {
    console.error("Get all fuel and maintenance requests error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch fuel and maintenance requests.",
    });
  }
};

const confirmRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { confirmationStatus = "CONFIRMED" } = req.body;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: "requestId is required.",
      });
    }

    const updatedRequest = await confirmFuelMaintenanceRequest({
      requestId: Number(requestId),
      confirmedByUserId: Number(req.user.sub),
      confirmationStatus: String(confirmationStatus).toUpperCase(),
    });

    return res.status(200).json({
      success: true,
      message: `Fuel and maintenance request ${confirmationStatus.toLowerCase()} successfully.`,
      data: {
        request: updatedRequest,
      },
    });
  } catch (error) {
    if (error.code === "REQUEST_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Fuel and maintenance request not found.",
      });
    }

    if (error.code === "INVALID_CONFIRMATION_STATUS") {
      return res.status(400).json({
        success: false,
        message: "Invalid confirmation status. Use CONFIRMED or REJECTED.",
      });
    }

    if (error.code === "UNAUTHORIZED_CONFIRMATION") {
      return res.status(403).json({
        success: false,
        message: "Only Transport Managers can confirm requests.",
      });
    }

    console.error("Confirm fuel and maintenance request error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to confirm fuel and maintenance request.",
    });
  }
};

module.exports = {
  createRequest,
  getRequests,
  getAllRequests,
  confirmRequest,
};
