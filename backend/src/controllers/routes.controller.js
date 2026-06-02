const {
  createRoute,
  deleteRoute,
  listRoutes,
  updateRoute,
  updateRouteStatus,
} = require("../services/routes.service.js");

const handleRouteError = (res, error, fallbackMessage) => {
  if (error && error.code === "ROUTE_NAME_REQUIRED") {
    return res.status(400).json({ message: "routeName is required." });
  }

  if (error && error.code === "INVALID_ROUTE_STATUS") {
    return res.status(400).json({ message: "Status must be Active, Inactive, or Draft." });
  }

  if (error && error.code === "ROUTE_NOT_FOUND") {
    return res.status(404).json({ message: "Route not found." });
  }

  if (error && error.code === "ROUTE_ID_EXISTS") {
    return res.status(409).json({ message: "Route ID already exists." });
  }

  console.error(fallbackMessage, error);
  return res.status(500).json({ message: fallbackMessage });
};

const getRoutes = async (_req, res) => {
  try {
    const routes = await listRoutes();
    return res.status(200).json({
      success: true,
      message: "Routes retrieved successfully.",
      data: { routes },
    });
  } catch (error) {
    return handleRouteError(res, error, "Failed to fetch routes.");
  }
};

const postRoute = async (req, res) => {
  try {
    const route = await createRoute({ payload: req.body || {} });
    return res.status(201).json({
      success: true,
      message: "Route created successfully.",
      data: { route },
    });
  } catch (error) {
    return handleRouteError(res, error, "Failed to create route.");
  }
};

const putRoute = async (req, res) => {
  try {
    const route = await updateRoute({
      id: Number(req.params.id),
      payload: req.body || {},
    });
    return res.status(200).json({
      success: true,
      message: "Route updated successfully.",
      data: { route },
    });
  } catch (error) {
    return handleRouteError(res, error, "Failed to update route.");
  }
};

const patchRouteStatus = async (req, res) => {
  try {
    const route = await updateRouteStatus({
      id: Number(req.params.id),
      status: req.body?.status,
    });
    return res.status(200).json({
      success: true,
      message: "Route status updated successfully.",
      data: { route },
    });
  } catch (error) {
    return handleRouteError(res, error, "Failed to update route status.");
  }
};

const deleteRouteById = async (req, res) => {
  try {
    await deleteRoute({ id: Number(req.params.id) });
    return res.status(200).json({
      success: true,
      message: "Route deleted successfully.",
      data: {},
    });
  } catch (error) {
    return handleRouteError(res, error, "Failed to delete route.");
  }
};

module.exports = {
  getRoutes,
  postRoute,
  putRoute,
  patchRouteStatus,
  deleteRouteById,
};
