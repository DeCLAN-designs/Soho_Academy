const express = require("express");
const {
  getTripsByDate,
  getTripDetails,
  postTrip,
} = require("../controllers/trips.controller.js");
const { authenticate } = require("../middlewares/auth.middleware.js");

const router = express.Router();

router.get("/trips/date/:date", authenticate, getTripsByDate);
router.get("/trips/:tripId", authenticate, getTripDetails);
router.post("/trips", authenticate, postTrip);

module.exports = router;
