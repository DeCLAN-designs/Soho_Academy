const express = require("express");
const router = express.Router();
const pool = require("../config/db.js");
const { authenticate, authorizeRoles } = require("../middlewares/auth.middleware.js");

// All routes require authentication and Transport Manager or School Admin role
router.use(authenticate, authorizeRoles("Transport Manager", "School Admin"));

// GET /api/transport-manager/staff - Get all staff (drivers and bus assistants)
router.get("/staff", async (req, res) => {
  try {
    const [staff] = await pool.query(
      `SELECT 
        id,
        firstName,
        lastName,
        role,
        phoneNumber
       FROM users 
       WHERE role IN ('Driver', 'Bus Assistant')
       ORDER BY role, firstName, lastName`
    );

    res.json({ staff });
  } catch (error) {
    console.error("Error fetching staff:", error);
    res.status(500).json({ message: "Failed to fetch staff" });
  }
});

module.exports = router;
