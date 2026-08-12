const express = require('express');
const { sseAttendanceStream } = require('../controllers/realtime.controller');
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/sse/attendance', authenticate, authorizeRoles('Admin', 'Transport Manager'), sseAttendanceStream);

module.exports = router;
