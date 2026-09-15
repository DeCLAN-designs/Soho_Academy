const express = require("express");
const { getAnnouncements } = require("../controllers/announcements.controller.js");
const { authenticate } = require("../middlewares/auth.middleware.js");

const router = express.Router();

// Public read endpoint - all authenticated users can view published announcements
// Match both with and without trailing slash
router.get("/", authenticate, getAnnouncements);
router.get("", authenticate, getAnnouncements);

module.exports = router;
