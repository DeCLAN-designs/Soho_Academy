const express = require('express');
const { getSchedulerHealth } = require('../controllers/scheduler.controller');
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

// Only Admins should access scheduler health
router.get('/health', authenticate, authorizeRoles('Admin'), getSchedulerHealth);

module.exports = router;
