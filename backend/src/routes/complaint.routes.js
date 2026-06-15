const express = require("express");
const {
  createReport,
  getFormMeta,
  getReports,
  updateStatus,
  getAllReports,
} = require("../controllers/complaint.controller.js");
const {
  authenticate,
  authorizeRoles,
} = require("../middlewares/auth.middleware.js");
const {
  uploadComplaintAttachment,
} = require("../middlewares/complaintUpload.middleware.js");
const {
  createComplaintReportValidator,
  validate,
} = require("../validators/complaint.validators.js");

const router = express.Router();

// Driver and Bus Assistant endpoints
router.use(authenticate);
router.get("/meta", authorizeRoles("Driver", "Bus Assistant"), getFormMeta);
router.get("/reports", authorizeRoles("Driver", "Bus Assistant"), getReports);
router.use(authenticate, authorizeRoles("Driver", "Bus Assistant", "Transport Manager", "School Admin"));

router.get("/meta", getFormMeta);
router.get("/reports", getReports);

router.post(
  "/reports",
  authorizeRoles("Driver", "Bus Assistant"),
  uploadComplaintAttachment,
  createComplaintReportValidator,
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
