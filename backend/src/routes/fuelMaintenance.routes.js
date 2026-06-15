const express = require("express");
const {
  createRequest,
  deleteRequest,
  getRequest,
  getRequests,
  updateRequest,
  updateRequestStatus,
  getAllRequests,
  confirmRequest,
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
// Driver/Bus Assistant endpoints
router.use(authenticate, authorizeRoles("Driver", "Bus Assistant", "Transport Manager"));

router.get(
  "/requests",
  authorizeRoles("Driver", "Bus Assistant", "Transport Manager", "School Admin"),
  getRequests
);

router.get(
  "/requests/:id",
  authorizeRoles("Driver", "Bus Assistant", "Transport Manager", "School Admin"),
  fuelMaintenanceRequestIdValidator,
  validate,
  getRequest
);

router.post(
  "/requests",
  authorizeRoles("Driver", "Bus Assistant"),
  createFuelMaintenanceRequestValidator,
  validate,
  createRequest
);

router.put(
  "/requests/:id",
  authorizeRoles("Driver", "Bus Assistant", "Transport Manager", "School Admin"),
  fuelMaintenanceRequestIdValidator,
  updateFuelMaintenanceRequestValidator,
  validate,
  updateRequest
);

router.patch(
  "/requests/:id/status",
  authorizeRoles("Transport Manager", "School Admin"),
  fuelMaintenanceRequestIdValidator,
  updateFuelMaintenanceStatusValidator,
  validate,
  updateRequestStatus
);

router.delete(
  "/requests/:id",
  authorizeRoles("Driver", "Bus Assistant", "Transport Manager", "School Admin"),
  fuelMaintenanceRequestIdValidator,
  validate,
  deleteRequest
// Transport Manager endpoints
router.get("/all", authorizeRoles("Transport Manager"), getAllRequests);

router.post(
  "/:requestId/confirm",
  authorizeRoles("Transport Manager"),
  confirmRequest
);

module.exports = router;
