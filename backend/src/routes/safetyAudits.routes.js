const express = require("express");
const {
  getSafetyAudits,
  createSafetyAudit,
  updateSafetyAudit,
  deleteSafetyAudit,
} = require("../controllers/safetyAudits.controller.js");
const { authenticate, authorizeRoles } = require("../middlewares/auth.middleware.js");

const router = express.Router();

// Transport Manager and School Admin endpoints
router.use(authenticate);
router.get("/", authorizeRoles("Transport Manager", "School Admin"), getSafetyAudits);
router.post("/", authorizeRoles("Transport Manager", "School Admin"), createSafetyAudit);
router.patch("/:id", authorizeRoles("Transport Manager", "School Admin"), updateSafetyAudit);
router.delete("/:id", authorizeRoles("Transport Manager", "School Admin"), deleteSafetyAudit);

module.exports = router;
