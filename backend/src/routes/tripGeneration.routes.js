const express = require("express");
const router = express.Router();
const { authenticate, authorizeRoles } = require("../middlewares/auth.middleware.js");
const {
  generateTripsForDateHandler,
  generateTripsForRangeHandler,
  validatePrerequisitesHandler,
  getLiveProgressHandler,
  getTripAttendanceHandler,
  getDashboardMetricsHandler
} = require("../controllers/tripGeneration.controller.js");

// All routes require authentication
router.use(authenticate);

// Transport Manager and School Admin for generation operations
const adminAuth = [authorizeRoles("Transport Manager", "School Admin")];

// =============================================
// Trip Generation Endpoints
// =============================================

// Validate prerequisites for trip generation
router.get("/validate", ...adminAuth, validatePrerequisitesHandler);

// Generate trips for a specific date
router.post("/generate", ...adminAuth, generateTripsForDateHandler);

// Generate trips for a date range
router.post("/generate-range", ...adminAuth, generateTripsForRangeHandler);

// =============================================
// Trip Status & Progress Endpoints
// =============================================

// Get live trip progress (Transport Manager only)
router.get("/progress", ...adminAuth, getLiveProgressHandler);

// Get specific trip attendance details (Transport Manager only)
router.get("/trips/:tripId/attendance", ...adminAuth, getTripAttendanceHandler);

// Get dashboard metrics (Transport Manager only)
router.get("/dashboard-metrics", ...adminAuth, getDashboardMetricsHandler);

module.exports = router;