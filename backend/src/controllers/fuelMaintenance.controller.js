const {
  createFuelMaintenanceRequest,
  listFuelMaintenanceRequestsByUser,
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

    if (error && error.code === "INVALID_CONFIRMED_BY") {
      return res.status(400).json({
        success: false,
        message: "confirmedBy must be one of: Erick, Douglas, James.",
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

module.exports = {
  createRequest,
  getRequests,
};
