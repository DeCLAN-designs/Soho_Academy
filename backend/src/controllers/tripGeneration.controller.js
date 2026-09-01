const { 
  generateTripsForDate, 
  generateTripsForRange, 
  validateTripGenerationPrerequisites 
} = require('../services/tripGenerationService.js');
const { getDashboardMetrics, getLiveTripProgress, getTripAttendanceDetails } = require('../services/tripStatusService.js');

/**
 * Generate trips for a specific date
 */
const generateTripsForDateHandler = async (req, res) => {
  try {
    const { date, force } = req.body;
    const userId = req.user ? Number(req.user.sub) : null;
    
    const result = await generateTripsForDate({ 
      date, 
      force: force === true,
      userId,
      generationSource: 'api'
    });
    
    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.stats
    });
  } catch (error) {
    console.error('Generate trips error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate trips',
      error: error.message
    });
  }
};

/**
 * Generate trips for a date range
 */
const generateTripsForRangeHandler = async (req, res) => {
  try {
    const { startDate, endDate, force } = req.body;
    const userId = req.user ? Number(req.user.sub) : null;
    
    const result = await generateTripsForRange({ 
      startDate, 
      endDate, 
      force: force === true,
      userId,
      generationSource: 'api'
    });
    
    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        summary: result.summary,
        results: result.results
      }
    });
  } catch (error) {
    console.error('Generate trips range error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate trips for range',
      error: error.message
    });
  }
};

/**
 * Validate trip generation prerequisites
 */
const validatePrerequisitesHandler = async (req, res) => {
  try {
    const { date } = req.query;
    
    const validation = await validateTripGenerationPrerequisites(date);
    
    return res.status(200).json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('Validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to validate prerequisites',
      error: error.message
    });
  }
};

/**
 * Get live trip progress
 */
const getLiveProgressHandler = async (req, res) => {
  try {
    const { date, tripType, routeId } = req.query;
    
    const progress = await getLiveTripProgress({ date, tripType, routeId });
    
    return res.status(200).json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error('Get live progress error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get live progress',
      error: error.message
    });
  }
};

/**
 * Get trip attendance details
 */
const getTripAttendanceHandler = async (req, res) => {
  try {
    const { tripId } = req.params;
    
    const details = await getTripAttendanceDetails(Number(tripId));
    
    return res.status(200).json({
      success: true,
      data: details
    });
  } catch (error) {
    console.error('Get trip attendance error:', error);
    if (error.message === 'Trip not found') {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to get trip attendance',
      error: error.message
    });
  }
};

/**
 * Get dashboard metrics
 */
const getDashboardMetricsHandler = async (req, res) => {
  try {
    const { date } = req.query;
    
    const metrics = await getDashboardMetrics(date);
    
    return res.status(200).json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Get dashboard metrics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get dashboard metrics',
      error: error.message
    });
  }
};

module.exports = {
  generateTripsForDateHandler,
  generateTripsForRangeHandler,
  validatePrerequisitesHandler,
  getLiveProgressHandler,
  getTripAttendanceHandler,
  getDashboardMetricsHandler
};