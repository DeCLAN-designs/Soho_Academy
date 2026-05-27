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

router.get("/number-plates", getNumberPlates);
router.get("/number-plates/active", getActiveNumberPlates);
router.post("/number-plates", postNumberPlate);
router.patch("/number-plates/:id", patchNumberPlateStatus);
router.delete("/number-plates/:id", removeNumberPlate);

router.get("/users/role/:role", getUsersByRole);

router.get("/vehicle-details", getAllVehicleDetails);
router.get("/vehicle-details/:plateNumber", getVehicleDetailsByPlate);
router.get("/vehicles/:plateNumber", getVehicleDetailsByPlate);
router.put("/vehicles/:plateNumber", putVehicleDetailsByPlate);

module.exports = router;
