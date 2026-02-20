const express = require("express");
const {
  createRequest,
  getRequests,
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

router.use(authenticate, authorizeRoles("Driver"));

router.get("/requests", getRequests);

router.post(
  "/requests",
  createFuelMaintenanceRequestValidator,
  validate,
  createRequest
);

module.exports = router;
