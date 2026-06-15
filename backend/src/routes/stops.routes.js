const express = require("express");
const {
  deleteStopById,
  getStops,
  patchStopSequence,
  postStop,
  putStop,
} = require("../controllers/stops.controller.js");

const router = express.Router();

router.get("/stops", getStops);
router.post("/stops", postStop);
router.put("/stops/:id", putStop);
router.patch("/stops/:id/sequence", patchStopSequence);
router.delete("/stops/:id", deleteStopById);

module.exports = router;
