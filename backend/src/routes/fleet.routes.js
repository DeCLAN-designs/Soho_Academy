const express = require("express");
const router = express.Router();
const pool = require("../config/db.js");
const { authenticate, authorizeRoles } = require("../middlewares/auth.middleware.js");

// All routes require authentication and Transport Manager or School Admin role
router.use(authenticate, authorizeRoles("Transport Manager", "School Admin"));

// GET /api/transport-manager/vehicles - Get all vehicles (number plates)
router.get("/vehicles", async (req, res) => {
  try {
    const [vehicles] = await pool.query(
      `SELECT 
        id,
        plate_number as plateNumber,
        status,
        capacity,
        insuranceExpiryDate,
        inspectionExpiryDate
       FROM number_plates 
       ORDER BY plate_number`
    );

    res.json({ vehicles });
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    res.status(500).json({ message: "Failed to fetch vehicles" });
  }
});

module.exports = router;
