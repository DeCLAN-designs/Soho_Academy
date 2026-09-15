const cron = require("node-cron");
const { generateTripsForDate, generateTripsForRange } = require("../services/tripGenerationService.js");
const { schedulerRuns, schedulerErrors } = require('../utils/metrics');

/**
 * Generate automated daily trips based on vehicle-route assignments.
 * Run at the configured morning and evening departure times every day.
 * 
 * This function now uses the centralized tripGenerationService for:
 * - Consistent validation logic
 * - Atomic trip and attendance creation
 * - Idempotent generation
 * - Proper error handling and rollback
 */
const generateDailyTrips = async ({ date, period } = {}) => {
  console.log(`[Cron] [${new Date().toISOString()}] Running daily trips generation...`);
  try { schedulerRuns.inc(); } catch (e) { /* noop */ }

  try {
    const result = await generateTripsForDate({
      date,
      period,
    });
    
    console.log(`[Cron] ${result.message}`);
    console.log(`[Cron] Stats:`, JSON.stringify(result.stats, null, 2));
    
    return result;
  } catch (error) {
    try { schedulerErrors.inc(); } catch (e) {}
    console.error(`[Cron] Failed to generate daily trips:`, error);
    throw error;
  }
};

const generateDailyTripsRange = async ({ startDate, endDate }) => {
  console.log(`[Cron] [${new Date().toISOString()}] Running daily trips generation for range ${startDate} to ${endDate}...`);
  
  try {
    const result = await generateTripsForRange({ 
      startDate, 
      endDate,
      generationSource: 'cron'
    });
    
    console.log(`[Cron] ${result.message}`);
    console.log(`[Cron] Summary:`, JSON.stringify(result.summary, null, 2));
    
    return result;
  } catch (error) {
    console.error(`[Cron] Failed to generate daily trips for range:`, error);
    throw error;
  }
};

const initCronJobs = () => {
  // Schedule morning trips at 4:30 AM every day.
  cron.schedule("30 4 * * *", () => generateDailyTrips({
    date: new Date().toISOString().split('T')[0],
    period: 'Morning'
  }), {
    scheduled: true,
    timezone: "Africa/Nairobi"
  });

  // Schedule evening trips at 2:00 PM every day.
  cron.schedule("0 14 * * *", () => generateDailyTrips({
    date: new Date().toISOString().split('T')[0],
    period: 'Evening'
  }), {
    scheduled: true,
    timezone: "Africa/Nairobi"
  });

  console.log("✅ Scheduled dailyTrips cron jobs (Morning: 4:30 AM, Evening: 2:00 PM)");
};

module.exports = {
  initCronJobs,
  generateDailyTrips, // Exported for manual trigger testing
  generateDailyTripsRange,
};