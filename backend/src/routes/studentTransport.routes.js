const express = require("express");
const router = express.Router();
const pool = require("../config/db.js");
const { authenticate, authorizeRoles } = require("../middlewares/auth.middleware.js");

// All routes require authentication and Transport Manager or School Admin role
router.use(authenticate, authorizeRoles("Transport Manager", "School Admin"));

// GET /api/transport-manager/students - Get all students for transport assignment
router.get("/students", async (req, res) => {
  try {
    const [students] = await pool.query(
      `SELECT 
        s.id,
        s.admissionNumber,
        s.firstName,
        s.lastName,
        s.grade,
        s.stream,
        s.parentContact,
        u.firstName as parentFirstName,
        u.lastName as parentLastName,
        u.phoneNumber as parentPhone
       FROM students s
       LEFT JOIN users u ON s.parentIdType = u.parentIdType AND s.parentIdNumber = u.parentIdNumber
       WHERE s.status = 'active'
       ORDER BY s.grade, s.stream, s.firstName, s.lastName`
    );

    res.json({ students });
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ message: "Failed to fetch students" });
  }
});

module.exports = router;
