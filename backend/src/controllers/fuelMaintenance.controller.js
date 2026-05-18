const {
  createFuelMaintenanceRequest,
  deleteFuelMaintenanceRequest,
  getFuelMaintenanceRequestById,
  listFuelMaintenanceRequests,
  updateFuelMaintenanceRequest,
  updateFuelMaintenanceRequestStatus,
} = require("../services/fuelMaintenance.service.js");

const handleRequestError = (res, error, fallbackMessage) => {
  if (error && error.code === "REQUEST_NOT_FOUND") {
    return res.status(404).json({
      success: false,
      message: "Fuel and maintenance request was not found.",
    });
  }

  if (error && error.code === "REQUEST_FORBIDDEN") {
    return res.status(403).json({
      success: false,
      message: "You do not have permission for this request.",
    });
  }

  if (error && error.code === "REQUEST_LOCKED") {
    return res.status(409).json({
      success: false,
      message: "Only pending requests can be changed.",
    });
  }

  if (error && error.code === "INVALID_REQUEST_STATUS") {
    return res.status(400).json({
      success: false,
      message: "Invalid request status.",
    });
  }

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

  console.error("Fuel and maintenance request error:", error);

  return res.status(500).json({
    success: false,
    message: fallbackMessage,
  });
};

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
    return handleRequestError(
      res,
      error,
      "Failed to create fuel and maintenance request."
    );
  }
};

const getRequests = async (req, res) => {
  try {
    const requests = await listFuelMaintenanceRequests({
      userId: Number(req.user.sub),
      role: req.user.role,
    });

    return res.status(200).json({
      success: true,
      message: "Fuel and maintenance requests retrieved successfully.",
      data: {
        requests,
      },
    });
  } catch (error) {
    return handleRequestError(
      res,
      error,
      "Failed to fetch fuel and maintenance requests."
    );
  }
};

const getRequest = async (req, res) => {
  try {
    const request = await getFuelMaintenanceRequestById({
      requestId: Number(req.params.id),
      userId: Number(req.user.sub),
      role: req.user.role,
    });

    return res.status(200).json({
      success: true,
      message: "Fuel and maintenance request retrieved successfully.",
      data: {
        request,
      },
    });
  } catch (error) {
    return handleRequestError(
      res,
      error,
      "Failed to fetch fuel and maintenance request."
    );
  }
};

const updateRequest = async (req, res) => {
  try {
    const request = await updateFuelMaintenanceRequest({
      requestId: Number(req.params.id),
      payload: req.body || {},
      userId: Number(req.user.sub),
      role: req.user.role,
    });

    return res.status(200).json({
      success: true,
      message: "Fuel and maintenance request updated successfully.",
      data: {
        request,
      },
    });
  } catch (error) {
    return handleRequestError(
      res,
      error,
      "Failed to update fuel and maintenance request."
    );
  }
};

const updateRequestStatus = async (req, res) => {
  try {
    const request = await updateFuelMaintenanceRequestStatus({
      requestId: Number(req.params.id),
      status: req.body?.status,
      userId: Number(req.user.sub),
      role: req.user.role,
    });

    return res.status(200).json({
      success: true,
      message: "Fuel and maintenance request status updated successfully.",
      data: {
        request,
      },
    });
  } catch (error) {
    return handleRequestError(
      res,
      error,
      "Failed to update fuel and maintenance request status."
    );
  }
};

const deleteRequest = async (req, res) => {
  try {
    const request = await deleteFuelMaintenanceRequest({
      requestId: Number(req.params.id),
      userId: Number(req.user.sub),
      role: req.user.role,
    });

    return res.status(200).json({
      success: true,
      message: "Fuel and maintenance request deleted successfully.",
      data: {
        request,
      },
    });
  } catch (error) {
    return handleRequestError(
      res,
      error,
      "Failed to delete fuel and maintenance request."
    );
  }
};

module.exports = {
  createRequest,
  deleteRequest,
  getRequest,
  getRequests,
  updateRequest,
  updateRequestStatus,
};
