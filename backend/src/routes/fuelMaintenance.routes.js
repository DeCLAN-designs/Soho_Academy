const express = require("express");
const {
  createRequest,
  getRequests,
  getAllRequests,
  confirmRequest,
} = require("../controllers/fuelMaintenance.controller.js");
const {
  createFuelMaintenanceRequestValidator,
  validate,
} = require("../validators/fuelMaintenance.validators.js");
const {
  authenticate,
  authorizeRoles,
} = require("../middlewares/auth.middleware.js");

const router = express.Router();

// Driver/Bus Assistant endpoints
router.use(authenticate, authorizeRoles("Driver", "Bus Assistant", "Transport Manager"));

router.get("/requests", getRequests);

router.post(
  "/requests",
  authorizeRoles("Driver", "Bus Assistant"),
  createFuelMaintenanceRequestValidator,
  validate,
  createRequest
);

// Transport Manager endpoints
router.get("/all", authorizeRoles("Transport Manager"), getAllRequests);

router.post(
  "/:requestId/confirm",
  authorizeRoles("Transport Manager"),
  confirmRequest
);

module.exports = router;
