const express = require("express");
const { getPublicAnnouncements } = require("../controllers/announcements.controller.js");
const { authenticate } = require("../middlewares/auth.middleware.js");

const router = express.Router();

// Public read endpoint - all authenticated users can view published announcements
// NO role-based authorization - just authentication
router.get("/public", (req, res, next) => {
  console.log('=== PUBLIC ANNOUNCEMENTS ROUTER HIT ===');
  console.log('Path:', req.path);
  console.log('Original URL:', req.originalUrl);
  authenticate(req, res, (err) => {
    if (err) return next(err);
    console.log('Authentication passed for user:', req.user?.role);
    getPublicAnnouncements(req, res, next);
  });
});

module.exports = router;
