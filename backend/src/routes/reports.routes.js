const express = require("express");
const {
  getOperationalReports,
  getFinancialReports,
  getComplianceReports,
  getStaffReports,
} = require("../controllers/reports.controller.js");
const { authenticate, authorizeRoles } = require("../middlewares/auth.middleware.js");

const router = express.Router();

// Transport Manager and School Admin endpoints
router.use(authenticate);
router.get("/operational", authorizeRoles("Transport Manager", "School Admin"), getOperationalReports);
router.get("/financial", authorizeRoles("Transport Manager", "School Admin"), getFinancialReports);
router.get("/compliance", authorizeRoles("Transport Manager", "School Admin"), getComplianceReports);
router.get("/staff", authorizeRoles("Transport Manager", "School Admin"), getStaffReports);

module.exports = router;
