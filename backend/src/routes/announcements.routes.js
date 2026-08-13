const express = require("express");
const {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} = require("../controllers/announcements.controller.js");
const { authenticate, authorizeRoles } = require("../middlewares/auth.middleware.js");

const router = express.Router();

// Transport Manager and School Admin endpoints
router.use(authenticate);
router.get("/", authorizeRoles("Transport Manager", "School Admin"), getAnnouncements);
router.post("/", authorizeRoles("Transport Manager", "School Admin"), createAnnouncement);
router.patch("/:id", authorizeRoles("Transport Manager", "School Admin"), updateAnnouncement);
router.delete("/:id", authorizeRoles("Transport Manager", "School Admin"), deleteAnnouncement);

module.exports = router;
