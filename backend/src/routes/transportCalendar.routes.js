const express = require('express');
const {
  getTransportAvailability,
  // Academic Years
  listAcademicYears,
  getAcademicYear,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  // Academic Terms
  listAcademicTerms,
  getAcademicTerm,
  createAcademicTerm,
  updateAcademicTerm,
  deleteAcademicTerm,
  // Calendar Events
  listCalendarEvents,
  getCalendarEvent,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  // Holiday Overrides
  listHolidayOverrides,
  getHolidayOverride,
  createHolidayOverride,
  updateHolidayOverride,
  deleteHolidayOverride,
  // Special Transport Days
  listSpecialTransportDays,
  getSpecialTransportDay,
  createSpecialTransportDay,
  updateSpecialTransportDay,
  deleteSpecialTransportDay,
  // Transport Operating Days
  listTransportOperatingDays,
  getTransportOperatingDay,
  createOrUpdateTransportOperatingDay,
  deleteTransportOperatingDay,
} = require('../controllers/transportCalendar.controller');
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Transport availability check (public to authenticated users)
router.get('/transport/availability', getTransportAvailability);
router.get('/transport/availability/:date', getTransportAvailability);

// Transport Manager and School Admin only for CRUD operations
const adminAuth = [authorizeRoles('Transport Manager', 'School Admin')];

// ==================== Academic Years ====================
router.get('/academic-years', ...adminAuth, listAcademicYears);
router.get('/academic-years/:id', ...adminAuth, getAcademicYear);
router.post('/academic-years', ...adminAuth, createAcademicYear);
router.patch('/academic-years/:id', ...adminAuth, updateAcademicYear);
router.delete('/academic-years/:id', ...adminAuth, deleteAcademicYear);

// ==================== Academic Terms ====================
router.get('/academic-terms', ...adminAuth, listAcademicTerms);
router.get('/academic-terms/:id', ...adminAuth, getAcademicTerm);
router.post('/academic-terms', ...adminAuth, createAcademicTerm);
router.patch('/academic-terms/:id', ...adminAuth, updateAcademicTerm);
router.delete('/academic-terms/:id', ...adminAuth, deleteAcademicTerm);

// ==================== Calendar Events ====================
router.get('/calendar-events', ...adminAuth, listCalendarEvents);
router.get('/calendar-events/:id', ...adminAuth, getCalendarEvent);
router.post('/calendar-events', ...adminAuth, createCalendarEvent);
router.patch('/calendar-events/:id', ...adminAuth, updateCalendarEvent);
router.delete('/calendar-events/:id', ...adminAuth, deleteCalendarEvent);

// ==================== Holiday Overrides ====================
router.get('/holiday-overrides', ...adminAuth, listHolidayOverrides);
router.get('/holiday-overrides/:date', ...adminAuth, getHolidayOverride);
router.post('/holiday-overrides', ...adminAuth, createHolidayOverride);
router.patch('/holiday-overrides/:date', ...adminAuth, updateHolidayOverride);
router.delete('/holiday-overrides/:date', ...adminAuth, deleteHolidayOverride);

// ==================== Special Transport Days ====================
router.get('/special-transport-days', ...adminAuth, listSpecialTransportDays);
router.get('/special-transport-days/:date', ...adminAuth, getSpecialTransportDay);
router.post('/special-transport-days', ...adminAuth, createSpecialTransportDay);
router.patch('/special-transport-days/:date', ...adminAuth, updateSpecialTransportDay);
router.delete('/special-transport-days/:date', ...adminAuth, deleteSpecialTransportDay);

// ==================== Transport Operating Days ====================
router.get('/operating-days', ...adminAuth, listTransportOperatingDays);
router.get('/operating-days/:academicYearId/:weekday', ...adminAuth, getTransportOperatingDay);
router.post('/operating-days', ...adminAuth, createOrUpdateTransportOperatingDay);
router.delete('/operating-days/:academicYearId/:weekday', ...adminAuth, deleteTransportOperatingDay);

module.exports = router;
