/**
 * Transport Manager Routes - Comprehensive Domain Endpoints
 * Consolidates all transport management operations
 */

const express = require("express");
const router = express.Router();
const { authenticate, authorizeRoles } = require("../middlewares/auth.middleware.js");
const { FleetService } = require("../services/fleet.service.js");
const { StaffService } = require("../services/staff.service.js");
const { RouteService } = require("../services/route.service.js");
const { TripService } = require("../services/trip.service.js");
const { AuditLogger } = require("../utils/auditLogger.js");

// All routes require Transport Manager or School Admin role
router.use(authenticate, authorizeRoles("Transport Manager", "School Admin"));

const fleetService = new FleetService();
const staffService = new StaffService();
const routeService = new RouteService();
const tripService = new TripService();
const auditLogger = new AuditLogger();

// ============================================================================
// FLEET MANAGEMENT ENDPOINTS
// ============================================================================

// GET /api/transport-manager/fleet/vehicles - List all vehicles
router.get("/fleet/vehicles", async (req, res) => {
  try {
    const vehicles = await fleetService.getAllVehicles(req.query);
    res.json({ success: true, data: vehicles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/transport-manager/fleet/vehicles/:plateNumber - Get vehicle details
router.get("/fleet/vehicles/:plateNumber", async (req, res) => {
  try {
    const vehicle = await fleetService.getVehicleByPlate(req.params.plateNumber);
    res.json({ success: true, data: vehicle });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

// POST /api/transport-manager/fleet/vehicles - Create vehicle
router.post("/fleet/vehicles", async (req, res) => {
  try {
    const result = await fleetService.createVehicle(req.body, req.user.sub);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PATCH /api/transport-manager/fleet/vehicles/:plateNumber - Update vehicle
router.patch("/fleet/vehicles/:plateNumber", async (req, res) => {
  try {
    const result = await fleetService.updateVehicle(
      req.params.plateNumber,
      req.body,
      req.user.sub
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/transport-manager/fleet/vehicles/:plateNumber/assign-driver
router.post("/fleet/vehicles/:plateNumber/assign-driver", async (req, res) => {
  try {
    const result = await fleetService.assignDriver(
      req.params.plateNumber,
      req.body.driverUserId,
      req.body,
      req.user.sub
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/transport-manager/fleet/fuel-logs - Record fuel log
router.post("/fleet/fuel-logs", async (req, res) => {
  try {
    const result = await fleetService.recordFuelLog(req.body, req.user.sub);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/transport-manager/fleet/maintenance - Create maintenance record
router.post("/fleet/maintenance", async (req, res) => {
  try {
    const result = await fleetService.createMaintenanceRecord(req.body, req.user.sub);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/transport-manager/fleet/compliance-summary
router.get("/fleet/compliance-summary", async (req, res) => {
  try {
    const summary = await fleetService.getComplianceSummary();
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// STAFF MANAGEMENT ENDPOINTS
// ============================================================================

// GET /api/transport-manager/staff - List all staff
router.get("/staff", async (req, res) => {
  try {
    const staff = await staffService.getAllStaff(req.query);
    res.json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/transport-manager/staff/:userId - Get staff details
router.get("/staff/:userId", async (req, res) => {
  try {
    const staff = await staffService.getStaffById(req.params.userId);
    res.json({ success: true, data: staff });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

// POST /api/transport-manager/staff - Create staff member
router.post("/staff", async (req, res) => {
  try {
    const result = await staffService.createStaff(req.body, req.user.sub);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PATCH /api/transport-manager/staff/:userId - Update staff
router.patch("/staff/:userId", async (req, res) => {
  try {
    const result = await staffService.updateStaff(
      req.params.userId,
      req.body,
      req.user.sub
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/transport-manager/staff/:userId/licenses - Add driver license
router.post("/staff/:userId/licenses", async (req, res) => {
  try {
    const result = await staffService.addDriverLicense(
      req.params.userId,
      req.body,
      req.user.sub
    );
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/transport-manager/staff/license-alerts
router.get("/staff/license-alerts", async (req, res) => {
  try {
    const alerts = await staffService.getLicenseAlerts(req.query.days || 30);
    res.json({ success: true, data: alerts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/transport-manager/staff/performance-summary
router.get("/staff/performance-summary", async (req, res) => {
  try {
    const summary = await staffService.getPerformanceSummary(req.query.month);
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// ROUTE MANAGEMENT ENDPOINTS
// ============================================================================

// GET /api/transport-manager/routes - List all routes
router.get("/routes", async (req, res) => {
  try {
    const routes = await routeService.getAllRoutes(req.query);
    res.json({ success: true, data: routes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/transport-manager/routes/:routeId - Get route details
router.get("/routes/:routeId", async (req, res) => {
  try {
    const route = await routeService.getRouteById(req.params.routeId);
    res.json({ success: true, data: route });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

// POST /api/transport-manager/routes - Create route
router.post("/routes", async (req, res) => {
  try {
    const result = await routeService.createRoute(req.body, req.user.sub);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/transport-manager/routes/:routeId/assign-vehicle-staff
router.post("/routes/:routeId/assign-vehicle-staff", async (req, res) => {
  try {
    const result = await routeService.assignVehicleAndStaff(
      req.params.routeId,
      req.body,
      req.user.sub
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/transport-manager/routes/:routeId/students - Assign students
router.post("/routes/:routeId/students", async (req, res) => {
  try {
    const result = await routeService.assignStudents(
      req.params.routeId,
      req.body.studentIds,
      req.body.stopAssignments,
      req.user.sub
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/transport-manager/routes/:routeId/students/:studentId
router.delete("/routes/:routeId/students/:studentId", async (req, res) => {
  try {
    const result = await routeService.removeStudentFromRoute(
      req.params.routeId,
      req.params.studentId,
      req.body.removalReason,
      req.user.sub
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/transport-manager/routes/available-for-student/:studentId
router.get("/routes/available-for-student/:studentId", async (req, res) => {
  try {
    const routes = await routeService.getAvailableRoutes(
      req.params.studentId,
      req.query.date
    );
    res.json({ success: true, data: routes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// TRIP MANAGEMENT ENDPOINTS
// ============================================================================

// GET /api/transport-manager/trips - List all trips
router.get("/trips", async (req, res) => {
  try {
    const trips = await tripService.getAllTrips(req.query);
    res.json({ success: true, data: trips });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/transport-manager/trips/:tripId - Get trip details
router.get("/trips/:tripId", async (req, res) => {
  try {
    const trip = await tripService.getTripById(req.params.tripId);
    res.json({ success: true, data: trip });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

// POST /api/transport-manager/trips - Create trip
router.post("/trips", async (req, res) => {
  try {
    const result = await tripService.createTrip(
      req.body.routeAssignmentId,
      req.body.tripDate,
      req.user.sub
    );
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PATCH /api/transport-manager/trips/:tripId/status - Update trip status
router.patch("/trips/:tripId/status", async (req, res) => {
  try {
    const result = await tripService.updateTripStatus(
      req.params.tripId,
      req.body.status,
      req.user.sub,
      {
        name: `${req.user.firstName} ${req.user.lastName}`,
        role: req.user.role,
        latitude: req.body.latitude,
        longitude: req.body.longitude
      }
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PATCH /api/transport-manager/trips/:tripId/attendance/:studentId
router.patch("/trips/:tripId/attendance/:studentId", async (req, res) => {
  try {
    const result = await tripService.recordAttendance(
      req.params.tripId,
      req.params.studentId,
      req.body.boardingStatus,
      req.user.sub,
      {
        latitude: req.body.latitude,
        longitude: req.body.longitude
      }
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/transport-manager/trips/statistics
router.get("/trips/statistics", async (req, res) => {
  try {
    const stats = await tripService.getTripStatistics(
      req.query.fromDate,
      req.query.toDate
    );
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// AUDIT & COMPLIANCE ENDPOINTS
// ============================================================================

// GET /api/transport-manager/audit/entity/:entityType/:entityId
router.get("/audit/entity/:entityType/:entityId", async (req, res) => {
  try {
    const logs = await auditLogger.getEntityAuditTrail(
      req.params.entityType,
      req.params.entityId,
      req.query
    );
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/transport-manager/audit/compliance
router.get("/audit/compliance", async (req, res) => {
  try {
    const logs = await auditLogger.getComplianceAudit(req.query);
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/transport-manager/audit/stats
router.get("/audit/stats", async (req, res) => {
  try {
    const stats = await auditLogger.getAuditStats(
      req.query.fromDate,
      req.query.toDate
    );
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
