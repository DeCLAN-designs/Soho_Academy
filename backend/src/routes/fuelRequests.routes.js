const express = require("express");
const {
  createRequest,
  deleteRequest,
  getRequest,
  getRequests,
  getRequestsByStatus,
  updateRequest,
  updateRequestStatus,
} = require("../controllers/fuelMaintenance.controller.js");
const {
  createFuelMaintenanceRequestValidator,
  fuelMaintenanceRequestIdValidator,
  updateFuelMaintenanceRequestValidator,
  updateFuelMaintenanceStatusValidator,
  validate,
} = require("../validators/fuelMaintenance.validators.js");
const {
  authenticate,
  authorizeRoles,
} = require("../middlewares/auth.middleware.js");

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  authorizeRoles("Driver", "Bus Assistant", "Transport Manager", "School Admin"),
  getRequests
);

router.get(
  "/status/:status",
  authorizeRoles("Driver", "Bus Assistant", "Transport Manager", "School Admin"),
  getRequestsByStatus
);

router.post(
  "/",
  authorizeRoles("Driver", "Bus Assistant"),
  createFuelMaintenanceRequestValidator,
  validate,
  createRequest
);

router.patch(
  "/:id/status",
  authorizeRoles("Transport Manager", "School Admin"),
  fuelMaintenanceRequestIdValidator,
  updateFuelMaintenanceStatusValidator,
  validate,
  updateRequestStatus
);

module.exports = router;
