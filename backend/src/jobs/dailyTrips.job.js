const cron = require("node-cron");
const { generateTripsForDate, generateTripsForRange } = require("../services/tripGenerationService.js");
const { schedulerRuns, schedulerErrors } = require('../utils/metrics');

/**
 * Generate automated daily trips based on vehicle-route assignments.
 * Run at 3:00 AM every day.
 * 
 * This function now uses the centralized tripGenerationService for:
 * - Consistent validation logic
 * - Atomic trip and attendance creation
 * - Idempotent generation
 * - Proper error handling and rollback
 */
const generateDailyTrips = async ({ date } = {}) => {
  console.log(`[Cron] [${new Date().toISOString()}] Running daily trips generation...`);
  try { schedulerRuns.inc(); } catch (e) { /* noop */ }

  try {
    const result = await generateTripsForDate({ 
      date
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
  // Schedule to run at 3:00 AM every day.
  // The centralized service handles transport calendar checks.
  cron.schedule("0 3 * * *", generateDailyTrips, {
    scheduled: true,
    timezone: "Africa/Nairobi"
  });

  console.log("✅ Scheduled dailyTrips cron job (3:00 AM every day)");
};

module.exports = {
  initCronJobs,
  generateDailyTrips, // Exported for manual trigger testing
  generateDailyTripsRange,
};