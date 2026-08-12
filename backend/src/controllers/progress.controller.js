const { getProgressForTrip } = require('../services/progress.service');

const getTripProgress = async (req, res) => {
  try {
    const tripId = Number(req.params.tripId);
    if (Number.isNaN(tripId)) return res.status(400).json({ success: false, message: 'Invalid trip id' });

    const progress = await getProgressForTrip(tripId);
    return res.status(200).json({ success: true, data: progress });
  } catch (err) {
    console.error('Failed to fetch trip progress', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch progress' });
  }
};

module.exports = { getTripProgress };
