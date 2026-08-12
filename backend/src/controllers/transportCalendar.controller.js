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

// ==================== Academic Years ====================

const listAcademicYears = async (req, res) => {
  try {
    const years = await transportCalendarService.listAcademicYears();
    return res.status(200).json({ success: true, data: years });
  } catch (error) {
    console.error('List academic years error:', error);
    return res.status(500).json({ success: false, message: 'Failed to list academic years' });
  }
};

const getAcademicYear = async (req, res) => {
  try {
    const { id } = req.params;
    const year = await transportCalendarService.getAcademicYear(Number(id));
    if (!year) {
      return res.status(404).json({ success: false, message: 'Academic year not found' });
    }
    return res.status(200).json({ success: true, data: year });
  } catch (error) {
    console.error('Get academic year error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get academic year' });
  }
};

const createAcademicYear = async (req, res) => {
  try {
    const year = await transportCalendarService.createAcademicYear(req.body);
    return res.status(201).json({ success: true, data: year });
  } catch (error) {
    console.error('Create academic year error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create academic year' });
  }
};

const updateAcademicYear = async (req, res) => {
  try {
    const { id } = req.params;
    const year = await transportCalendarService.updateAcademicYear(Number(id), req.body);
    return res.status(200).json({ success: true, data: year });
  } catch (error) {
    console.error('Update academic year error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update academic year' });
  }
};

const deleteAcademicYear = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await transportCalendarService.deleteAcademicYear(Number(id));
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('Delete academic year error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete academic year' });
  }
};

// ==================== Academic Terms ====================

const listAcademicTerms = async (req, res) => {
  try {
    const { academicYearId } = req.query;
    const terms = await transportCalendarService.listAcademicTerms({ 
      academicYearId: academicYearId ? Number(academicYearId) : undefined 
    });
    return res.status(200).json({ success: true, data: terms });
  } catch (error) {
    console.error('List academic terms error:', error);
    return res.status(500).json({ success: false, message: 'Failed to list academic terms' });
  }
};

const getAcademicTerm = async (req, res) => {
  try {
    const { id } = req.params;
    const term = await transportCalendarService.getAcademicTerm(Number(id));
    if (!term) {
      return res.status(404).json({ success: false, message: 'Academic term not found' });
    }
    return res.status(200).json({ success: true, data: term });
  } catch (error) {
    console.error('Get academic term error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get academic term' });
  }
};

const createAcademicTerm = async (req, res) => {
  try {
    const term = await transportCalendarService.createAcademicTerm(req.body);
    return res.status(201).json({ success: true, data: term });
  } catch (error) {
    console.error('Create academic term error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create academic term' });
  }
};

const updateAcademicTerm = async (req, res) => {
  try {
    const { id } = req.params;
    const term = await transportCalendarService.updateAcademicTerm(Number(id), req.body);
    return res.status(200).json({ success: true, data: term });
  } catch (error) {
    console.error('Update academic term error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update academic term' });
  }
};

const deleteAcademicTerm = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await transportCalendarService.deleteAcademicTerm(Number(id));
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('Delete academic term error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete academic term' });
  }
};

// ==================== Calendar Events ====================

const listCalendarEvents = async (req, res) => {
  try {
    const { academicYearId, academicTermId, startDate, endDate } = req.query;
    const events = await transportCalendarService.listCalendarEvents({
      academicYearId: academicYearId ? Number(academicYearId) : undefined,
      academicTermId: academicTermId ? Number(academicTermId) : undefined,
      startDate,
      endDate
    });
    return res.status(200).json({ success: true, data: events });
  } catch (error) {
    console.error('List calendar events error:', error);
    return res.status(500).json({ success: false, message: 'Failed to list calendar events' });
  }
};

const getCalendarEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await transportCalendarService.getCalendarEvent(Number(id));
    if (!event) {
      return res.status(404).json({ success: false, message: 'Calendar event not found' });
    }
    return res.status(200).json({ success: true, data: event });
  } catch (error) {
    console.error('Get calendar event error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get calendar event' });
  }
};

const createCalendarEvent = async (req, res) => {
  try {
    const event = await transportCalendarService.createCalendarEvent(req.body);
    return res.status(201).json({ success: true, data: event });
  } catch (error) {
    console.error('Create calendar event error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create calendar event' });
  }
};

const updateCalendarEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await transportCalendarService.updateCalendarEvent(Number(id), req.body);
    return res.status(200).json({ success: true, data: event });
  } catch (error) {
    console.error('Update calendar event error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update calendar event' });
  }
};

const deleteCalendarEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await transportCalendarService.deleteCalendarEvent(Number(id));
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('Delete calendar event error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete calendar event' });
  }
};

// ==================== Holiday Overrides ====================

const listHolidayOverrides = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const overrides = await transportCalendarService.listHolidayOverrides({ startDate, endDate });
    return res.status(200).json({ success: true, data: overrides });
  } catch (error) {
    console.error('List holiday overrides error:', error);
    return res.status(500).json({ success: false, message: 'Failed to list holiday overrides' });
  }
};

const getHolidayOverride = async (req, res) => {
  try {
    const { date } = req.params;
    const override = await transportCalendarService.getHolidayOverride(date);
    if (!override) {
      return res.status(404).json({ success: false, message: 'Holiday override not found' });
    }
    return res.status(200).json({ success: true, data: override });
  } catch (error) {
    console.error('Get holiday override error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get holiday override' });
  }
};

const createHolidayOverride = async (req, res) => {
  try {
    const override = await transportCalendarService.createHolidayOverride(req.body);
    return res.status(201).json({ success: true, data: override });
  } catch (error) {
    console.error('Create holiday override error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create holiday override' });
  }
};

const updateHolidayOverride = async (req, res) => {
  try {
    const { date } = req.params;
    const override = await transportCalendarService.updateHolidayOverride(date, req.body);
    return res.status(200).json({ success: true, data: override });
  } catch (error) {
    console.error('Update holiday override error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update holiday override' });
  }
};

const deleteHolidayOverride = async (req, res) => {
  try {
    const { date } = req.params;
    const result = await transportCalendarService.deleteHolidayOverride(date);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('Delete holiday override error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete holiday override' });
  }
};

// ==================== Special Transport Days ====================

const listSpecialTransportDays = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const days = await transportCalendarService.listSpecialTransportDays({ startDate, endDate });
    return res.status(200).json({ success: true, data: days });
  } catch (error) {
    console.error('List special transport days error:', error);
    return res.status(500).json({ success: false, message: 'Failed to list special transport days' });
  }
};

const getSpecialTransportDay = async (req, res) => {
  try {
    const { date } = req.params;
    const day = await transportCalendarService.getSpecialTransportDay(date);
    if (!day) {
      return res.status(404).json({ success: false, message: 'Special transport day not found' });
    }
    return res.status(200).json({ success: true, data: day });
  } catch (error) {
    console.error('Get special transport day error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get special transport day' });
  }
};

const createSpecialTransportDay = async (req, res) => {
  try {
    const day = await transportCalendarService.createSpecialTransportDay(req.body);
    return res.status(201).json({ success: true, data: day });
  } catch (error) {
    console.error('Create special transport day error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create special transport day' });
  }
};

const updateSpecialTransportDay = async (req, res) => {
  try {
    const { date } = req.params;
    const day = await transportCalendarService.updateSpecialTransportDay(date, req.body);
    return res.status(200).json({ success: true, data: day });
  } catch (error) {
    console.error('Update special transport day error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update special transport day' });
  }
};

const deleteSpecialTransportDay = async (req, res) => {
  try {
    const { date } = req.params;
    const result = await transportCalendarService.deleteSpecialTransportDay(date);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('Delete special transport day error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete special transport day' });
  }
};

// ==================== Transport Operating Days ====================

const listTransportOperatingDays = async (req, res) => {
  try {
    const { academicYearId } = req.query;
    const days = await transportCalendarService.listTransportOperatingDays({
      academicYearId: academicYearId ? Number(academicYearId) : undefined
    });
    return res.status(200).json({ success: true, data: days });
  } catch (error) {
    console.error('List transport operating days error:', error);
    return res.status(500).json({ success: false, message: 'Failed to list transport operating days' });
  }
};

const getTransportOperatingDay = async (req, res) => {
  try {
    const { academicYearId, weekday } = req.params;
    const day = await transportCalendarService.getTransportOperatingDay({
      academicYearId: Number(academicYearId),
      weekday: Number(weekday)
    });
    if (!day) {
      return res.status(404).json({ success: false, message: 'Transport operating day not found' });
    }
    return res.status(200).json({ success: true, data: day });
  } catch (error) {
    console.error('Get transport operating day error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get transport operating day' });
  }
};

const createOrUpdateTransportOperatingDay = async (req, res) => {
  try {
    const day = await transportCalendarService.createOrUpdateTransportOperatingDay(req.body);
    return res.status(201).json({ success: true, data: day });
  } catch (error) {
    console.error('Create/update transport operating day error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create/update transport operating day' });
  }
};

const deleteTransportOperatingDay = async (req, res) => {
  try {
    const { academicYearId, weekday } = req.params;
    const result = await transportCalendarService.deleteTransportOperatingDay({
      academicYearId: Number(academicYearId),
      weekday: Number(weekday)
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('Delete transport operating day error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete transport operating day' });
  }
};

module.exports = {
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
};
