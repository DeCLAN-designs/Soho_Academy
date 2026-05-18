const express = require("express");
const {
  createReport,
  getReports,
  updateStatus,
  getAllReports,
} = require("../controllers/incident.controller.js");
const {
  authenticate,
  authorizeRoles,
} = require("../middlewares/auth.middleware.js");
const { uploadIncidentImages } = require("../middlewares/incidentUpload.middleware.js");
const {
  createIncidentReportValidator,
  validate,
} = require("../validators/incident.validators.js");

const router = express.Router();

// Driver and Bus Assistant endpoints
router.use(authenticate);
router.get("/reports", authorizeRoles("Driver", "Bus Assistant"), getReports);

router.post(
  "/reports",
  authorizeRoles("Driver", "Bus Assistant"),
  uploadIncidentImages,
  createIncidentReportValidator,
  validate,
  createReport
);

// Transport Manager and School Admin endpoints
router.get("/all/reports", authorizeRoles("Transport Manager", "School Admin"), getAllReports);
router.patch(
  "/reports/:id/status",
  authorizeRoles("Transport Manager", "School Admin"),
  updateStatus
);

module.exports = router;
