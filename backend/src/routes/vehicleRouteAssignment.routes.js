const express = require("express");
const {
  getAllAssignments,
  getVehicleAssignments,
  getRouteAssignment,
  postAssignment,
  patchAssignment,
  deleteAssignmentHandler,
  getAssignmentHistoryHandler,
} = require("../controllers/vehicleRouteAssignment.controller.js");
const {
  authenticate,
  authorizeRoles,
} = require("../middlewares/auth.middleware.js");

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Transport Manager routes (full access)
const tmAuth = [authorizeRoles("Transport Manager")];

// Get all assignments for a date
router.get("/", ...tmAuth, getAllAssignments);

// Get assignments for a specific vehicle
router.get("/vehicle/:vehiclePlate", ...tmAuth, getVehicleAssignments);

// Get assignment for a specific route and time period
router.get("/route/:routeId", ...tmAuth, getRouteAssignment);

// Get assignment history
router.get("/history", ...tmAuth, getAssignmentHistoryHandler);

// Create a new assignment
router.post("/", ...tmAuth, postAssignment);

// Update an assignment
router.patch("/:id", ...tmAuth, patchAssignment);

// Delete (deactivate) an assignment
router.delete("/:id", ...tmAuth, deleteAssignmentHandler);

module.exports = router;
