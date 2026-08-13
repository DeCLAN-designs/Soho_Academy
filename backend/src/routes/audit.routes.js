const express = require("express");
const { getAuditLogs } = require("../controllers/audit.controller.js");
const { authenticate, authorizeRoles } = require("../middlewares/auth.middleware.js");

const router = express.Router();

// Transport Manager and School Admin endpoints
router.use(authenticate);
router.get("/logs", authorizeRoles("Transport Manager", "School Admin"), getAuditLogs);

module.exports = router;
