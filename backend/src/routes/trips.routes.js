const express = require("express");

const router = express.Router();

const buildTrip = (tripId) => ({
  id: Number(tripId),
  trip_id: `TRIP-${String(tripId).padStart(3, "0")}`,
  route_id: `ROUTE-${String(tripId).padStart(3, "0")}`,
  route_name: "Route monitoring unavailable",
  vehicle_plate: "—",
  vehicle_model: "—",
  driver_name: "Pending assignment",
  assistant_name: null,
  departure_time: null,
  expected_return_time: null,
  actual_return_time: null,
  status: "Not Started",
  stops_completed: 0,
  total_stops: 0,
  last_updated: null,
  delay_reason: null,
  delay_minutes: 0,
  notes: "Live trip data is not available yet for this deployment.",
  stops: [],
});

router.get("/trips/date/:date", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Trips retrieved successfully.",
    data: { trips: [] },
  });
});

router.get("/trips/:tripId", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Trip details retrieved successfully.",
    data: { trip: buildTrip(req.params.tripId) },
  });
});

module.exports = router;
