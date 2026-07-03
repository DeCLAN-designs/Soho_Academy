const express = require('express');
const { getTransportAvailability } = require('../controllers/transportCalendar.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

// Support both with and without date param — some router versions reject optional params
router.get('/transport/availability', authenticate, getTransportAvailability);
router.get('/transport/availability/:date', authenticate, getTransportAvailability);

module.exports = router;
