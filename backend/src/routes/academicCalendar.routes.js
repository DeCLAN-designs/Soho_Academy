const express = require('express');
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');
const {
  listAcademicYears,
  createAcademicYear,
  listTerms,
  createTerm,
  listEvents,
  createEvent,
} = require('../controllers/academicCalendar.controller');

const router = express.Router();

router.get('/academic-years', authenticate, authorizeRoles('Transport Manager','School Admin'), listAcademicYears);
router.post('/academic-years', authenticate, authorizeRoles('Transport Manager','School Admin'), createAcademicYear);

router.get('/terms', authenticate, authorizeRoles('Transport Manager','School Admin'), listTerms);
router.post('/terms', authenticate, authorizeRoles('Transport Manager','School Admin'), createTerm);

router.get('/calendar-events', authenticate, authorizeRoles('Transport Manager','School Admin'), listEvents);
router.post('/calendar-events', authenticate, authorizeRoles('Transport Manager','School Admin'), createEvent);

module.exports = router;
