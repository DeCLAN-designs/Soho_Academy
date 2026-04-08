const express = require("express");
const {
  createReport,
  getReports,
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

router.use(authenticate, authorizeRoles("Driver"));

router.get("/reports", getReports);

router.post(
  "/reports",
  uploadIncidentImages,
  createIncidentReportValidator,
  validate,
  createReport
);

module.exports = router;
