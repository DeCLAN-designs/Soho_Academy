const express = require("express");
const {
  getViolations,
  createViolation,
  updateViolation,
  deleteViolation,
} = require("../controllers/violations.controller.js");
const { authenticate, authorizeRoles } = require("../middlewares/auth.middleware.js");

const router = express.Router();

// Transport Manager and School Admin endpoints
router.use(authenticate);
router.get("/", authorizeRoles("Transport Manager", "School Admin"), getViolations);
router.post("/", authorizeRoles("Transport Manager", "School Admin"), createViolation);
router.patch("/:id", authorizeRoles("Transport Manager", "School Admin"), updateViolation);
router.delete("/:id", authorizeRoles("Transport Manager", "School Admin"), deleteViolation);

module.exports = router;
