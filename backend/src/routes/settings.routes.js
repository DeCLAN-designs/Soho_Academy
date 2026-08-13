const express = require("express");
const {
  getSettings,
  updateSetting,
  updateMultipleSettings,
} = require("../controllers/settings.controller.js");
const { authenticate, authorizeRoles } = require("../middlewares/auth.middleware.js");

const router = express.Router();

// Transport Manager and School Admin endpoints
router.use(authenticate);
router.get("/", authorizeRoles("Transport Manager", "School Admin"), getSettings);
router.patch("/", authorizeRoles("Transport Manager", "School Admin"), updateSetting);
router.patch("/bulk", authorizeRoles("Transport Manager", "School Admin"), updateMultipleSettings);

module.exports = router;
