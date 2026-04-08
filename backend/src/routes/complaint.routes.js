const express = require("express");
const {
  createReport,
  getFormMeta,
  getReports,
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

router.use(authenticate, authorizeRoles("Driver"));

router.get("/meta", getFormMeta);
router.get("/reports", getReports);

router.post(
  "/reports",
  uploadComplaintAttachment,
  createComplaintReportValidator,
  validate,
  createReport
);

module.exports = router;
