const {
  createStop,
  deleteStop,
  listStops,
  updateStop,
  updateStopSequence,
} = require("../services/stops.service.js");

const handleStopError = (res, error, fallbackMessage) => {
  if (error && error.code === "STOP_NAME_REQUIRED") {
    return res.status(400).json({ message: "stopName is required." });
  }

  if (error && error.code === "ADDRESS_REQUIRED") {
    return res.status(400).json({ message: "address is required." });
  }

  if (error && error.code === "INVALID_STOP_TYPE") {
    return res.status(400).json({ message: "Stop type must be Pickup, Dropoff, or Both." });
  }

  if (error && error.code === "INVALID_STOP_STATUS") {
    return res.status(400).json({ message: "Status must be Active or Inactive." });
  }

  if (error && error.code === "INVALID_SEQUENCE_ORDER") {
    return res.status(400).json({ message: "Sequence order must be a positive integer." });
  }

  if (error && error.code === "ROUTE_ID_REQUIRED") {
    return res.status(400).json({ message: "routeId is required." });
  }

  if (error && error.code === "ROUTE_NOT_FOUND") {
    return res.status(404).json({ message: "Route not found." });
  }

  if (error && error.code === "STOP_NOT_FOUND") {
    return res.status(404).json({ message: "Stop not found." });
  }

  console.error(fallbackMessage, error);
  return res.status(500).json({ message: fallbackMessage });
};

const getStops = async (_req, res) => {
  try {
    const stops = await listStops();
    return res.status(200).json({
      success: true,
      message: "Stops retrieved successfully.",
      data: { stops },
    });
  } catch (error) {
    return handleStopError(res, error, "Failed to fetch stops.");
  }
};

const postStop = async (req, res) => {
  try {
    const stop = await createStop({ payload: req.body || {} });
    return res.status(201).json({
      success: true,
      message: "Stop created successfully.",
      data: { stop },
    });
  } catch (error) {
    return handleStopError(res, error, "Failed to create stop.");
  }
};

const putStop = async (req, res) => {
  try {
    const stop = await updateStop({
      id: Number(req.params.id),
      payload: req.body || {},
    });
    return res.status(200).json({
      success: true,
      message: "Stop updated successfully.",
      data: { stop },
    });
  } catch (error) {
    return handleStopError(res, error, "Failed to update stop.");
  }
};

const patchStopSequence = async (req, res) => {
  try {
    const stop = await updateStopSequence({
      id: Number(req.params.id),
      sequenceOrder: req.body?.sequence_order,
    });
    return res.status(200).json({
      success: true,
      message: "Stop sequence updated successfully.",
      data: { stop },
    });
  } catch (error) {
    return handleStopError(res, error, "Failed to update stop sequence.");
  }
};

const deleteStopById = async (req, res) => {
  try {
    await deleteStop({ id: Number(req.params.id) });
    return res.status(200).json({
      success: true,
      message: "Stop deleted successfully.",
      data: {},
    });
  } catch (error) {
    return handleStopError(res, error, "Failed to delete stop.");
  }
};

module.exports = {
  deleteStopById,
  getStops,
  patchStopSequence,
  postStop,
  putStop,
};
