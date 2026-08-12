const express = require("express");
const {
  getActiveNumberPlates,
  getAllVehicleDetails,
  getNumberPlates,
  getUsersByRole,
  getVehicleDetailsByPlate,
  patchNumberPlateStatus,
  postNumberPlate,
  putVehicleDetailsByPlate,
  removeNumberPlate,
} = require("../controllers/fleet.controller.js");

const router = express.Router();
const pool = require("../config/db.js");
const { authenticate, authorizeRoles } = require("../middlewares/auth.middleware.js");

// Listing endpoints require authentication; modifications restricted to Transport Manager / School Admin
router.use(authenticate);

router.get("/number-plates", getNumberPlates);
router.get("/number-plates/active", getActiveNumberPlates);
router.post("/number-plates", authorizeRoles("Transport Manager", "School Admin"), postNumberPlate);
router.patch("/number-plates/:id", authorizeRoles("Transport Manager", "School Admin"), patchNumberPlateStatus);
router.delete("/number-plates/:id", authorizeRoles("Transport Manager", "School Admin"), removeNumberPlate);

router.get("/users/role/:role", getUsersByRole);

router.get("/vehicle-details", getAllVehicleDetails);
router.get("/vehicle-details/:plateNumber", getVehicleDetailsByPlate);
router.get("/vehicles/:plateNumber", getVehicleDetailsByPlate);
router.put("/vehicles/:plateNumber", authorizeRoles("Transport Manager", "School Admin"), putVehicleDetailsByPlate);

  // GET /api/transport-manager/vehicles - Get all vehicles (number plates)
router.get(
  "/vehicles",
  authorizeRoles("Transport Manager", "School Admin"),
  async (req, res) => {
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
  }
);

module.exports = router;
