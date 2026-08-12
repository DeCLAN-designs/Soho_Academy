const express = require("express");
const {
  deleteStopById,
  getStops,
  patchStopSequence,
  postStop,
  putStop,
} = require("../controllers/stops.controller.js");

const router = express.Router();
const { authenticate, authorizeRoles } = require("../middlewares/auth.middleware.js");

// Require authentication for stops; only Transport Manager / School Admin can modify
router.get("/stops", getStops);
router.use(authenticate);

router.post("/stops", authorizeRoles('Transport Manager', 'School Admin'), postStop);
router.put("/stops/:id", authorizeRoles('Transport Manager', 'School Admin'), putStop);
router.patch("/stops/:id/sequence", authorizeRoles('Transport Manager', 'School Admin'), patchStopSequence);
router.delete("/stops/:id", authorizeRoles('Transport Manager', 'School Admin'), deleteStopById);

module.exports = router;
