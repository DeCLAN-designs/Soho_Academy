const {
  listTripsForDate,
  getTripById,
  createTrip,
} = require("../services/trips.service.js");

const handleTripsError = (res, error, defaultMessage) => {
  if (
    error &&
    [
      "ROUTE_REQUIRED",
      "DEPARTURE_TIME_REQUIRED",
      "EXPECTED_RETURN_TIME_REQUIRED",
      "INVALID_DEPARTURE_TIME",
      "INVALID_EXPECTED_RETURN_TIME",
      "INVALID_RETURN_TIME_SEQUENCE",
      "ROUTE_INACTIVE",
    ].includes(error.code)
  ) {
    return res.status(400).json({ success: false, message: error.message });
  }

  if (error && error.code === "ROUTE_NOT_FOUND") {
    return res.status(404).json({ success: false, message: error.message });
  }

  console.error(defaultMessage, error);
  return res.status(500).json({ success: false, message: defaultMessage });
};

const getTripsByDate = async (req, res) => {
  try {
    const date = req.params.date || req.query.date;
    const trips = await listTripsForDate(date);
    return res.status(200).json({ success: true, data: trips });
  } catch (error) {
    return handleTripsError(res, error, "Failed to retrieve trips.");
  }
};

const getTripDetails = async (req, res) => {
  try {
    const tripId = Number(req.params.tripId);
    if (Number.isNaN(tripId)) {
      return res.status(400).json({ success: false, message: "Invalid trip ID." });
    }

    const trip = await getTripById({ id: tripId });
    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found." });
    }

    return res.status(200).json({ success: true, data: trip });
  } catch (error) {
    return handleTripsError(res, error, "Failed to retrieve trip details.");
  }
};

const postTrip = async (req, res) => {
  try {
    const createdTrip = await createTrip({ payload: req.body || {} });
    return res.status(201).json({
      success: true,
      message: "Trip created successfully and attendance generated.",
      data: createdTrip,
    });
  } catch (error) {
    return handleTripsError(res, error, "Failed to create trip.");
  }
};

module.exports = {
  getTripsByDate,
  getTripDetails,
  postTrip,
};
