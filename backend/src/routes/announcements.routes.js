const express = require("express");
const {
  getAnnouncements,
  getPublicAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} = require("../controllers/announcements.controller.js");
const { authenticate, authorizeRoles } = require("../middlewares/auth.middleware.js");

const router = express.Router();

// Public read endpoint - all authenticated users can view published announcements
// Must be defined BEFORE the root route to avoid role authorization
router.get("/public", authenticate, getPublicAnnouncements);

// Transport Manager and School Admin endpoints - require authentication AND role authorization
router.get("/", authenticate, authorizeRoles("Transport Manager", "School Admin"), getAnnouncements);
router.post("/", authenticate, authorizeRoles("Transport Manager", "School Admin"), createAnnouncement);
router.patch("/:id", authenticate, authorizeRoles("Transport Manager", "School Admin"), updateAnnouncement);
router.delete("/:id", authenticate, authorizeRoles("Transport Manager", "School Admin"), deleteAnnouncement);

module.exports = router;
