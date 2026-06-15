const cron = require("node-cron");
const pool = require("../config/db.js");
const { createTrip } = require("../services/trips.service.js");

/**
 * Generate automated daily trips for active routes.
 * Run at 3:00 AM every Monday to Friday.
 */
const generateDailyTrips = async () => {
  console.log(`[Cron] [${new Date().toISOString()}] Running daily trips generation...`);
  
  try {
    const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    
    // 1. Get all active routes
    const [routes] = await pool.query(
      "SELECT id FROM routes WHERE status = 'Active' AND deleted_at IS NULL"
    );
    
    if (routes.length === 0) {
      console.log("[Cron] No active routes found. Skipping generation.");
      return;
    }
    
    console.log(`[Cron] Found ${routes.length} active route(s). Generating trips for ${todayStr}...`);
    
    let createdCount = 0;

    for (const route of routes) {
      // Check if Morning Trip exists
      const [morningExists] = await pool.query(
        `SELECT id FROM trip_monitoring 
         WHERE route_id = ? AND DATE(departure_time) = ? AND TIME(departure_time) < '12:00:00'`,
        [route.id, todayStr]
      );
      
      if (morningExists.length === 0) {
        await createTrip({
          payload: {
            routeId: route.id,
            departureTime: `${todayStr} 06:30:00`,
            expectedReturnTime: `${todayStr} 08:30:00`,
            notes: "Automated Morning Trip",
            status: "Not Started"
          }
        });
        createdCount++;
      }

      // Check if Evening Trip exists
      const [eveningExists] = await pool.query(
        `SELECT id FROM trip_monitoring 
         WHERE route_id = ? AND DATE(departure_time) = ? AND TIME(departure_time) >= '12:00:00'`,
        [route.id, todayStr]
      );

      if (eveningExists.length === 0) {
        await createTrip({
          payload: {
            routeId: route.id,
            departureTime: `${todayStr} 15:30:00`,
            expectedReturnTime: `${todayStr} 17:30:00`,
            notes: "Automated Evening Trip",
            status: "Not Started"
          }
        });
        createdCount++;
      }
    }
    
    console.log(`[Cron] Daily trips generation completed successfully. Created ${createdCount} trips.`);
  } catch (error) {
    console.error("[Cron] Failed to generate daily trips:", error);
  }
};

const initCronJobs = () => {
  // Schedule to run at 3:00 AM on weekdays (Monday-Friday)
  // "0 3 * * 1-5"
  cron.schedule("0 3 * * 1-5", generateDailyTrips, {
    scheduled: true,
    timezone: "Africa/Nairobi" // Replace with appropriate timezone or leave default
  });

  console.log("✅ Scheduled dailyTrips cron job (3:00 AM Mon-Fri)");
};

module.exports = {
  initCronJobs,
  generateDailyTrips // Exported for manual trigger testing
};
