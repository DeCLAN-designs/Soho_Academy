const transportCalendarService = require('../services/transportCalendar.service');

const getTransportAvailability = async (req, res) => {
  try {
    const date = req.params.date || req.query.date;
    const result = await transportCalendarService.isTransportDay(date);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Failed to evaluate transport availability', error);
    return res.status(500).json({ success: false, message: 'Failed to evaluate transport availability' });
  }
};

module.exports = {
  getTransportAvailability,
};
