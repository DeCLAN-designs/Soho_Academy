const cron = require("node-cron");
const pool = require("../config/db.js");
const { createTrip } = require("../services/trips.service.js");
const { getAssignmentsForDate, getAssignmentForRouteAndPeriod } = require("../services/vehicleRouteAssignment.service.js");

/**
 * Generate automated daily trips based on vehicle-route assignments.
 * Run at 3:00 AM every Monday to Friday.
 */
const generateDailyTrips = async () => {
  console.log(`[Cron] [${new Date().toISOString()}] Running daily trips generation...`);
  
  try {
    const { getTodayDateInTimezone } = require("../utils/date.js");
    const todayStr = getTodayDateInTimezone(); // YYYY-MM-DD in Africa/Nairobi
    
    // 1. Get all active vehicle-route assignments for today
    const assignments = await getAssignmentsForDate({ date: todayStr });
    
    if (assignments.length === 0) {
      console.log("[Cron] No active vehicle-route assignments found for today. Skipping generation.");
      return;
    }
    
    console.log(`[Cron] Found ${assignments.length} active assignment(s). Generating trips for ${todayStr}...`);
    
    let createdCount = 0;

    // Group assignments by route and time period to avoid duplicates
    const assignmentMap = new Map();
    
    for (const assignment of assignments) {
      const key = `${assignment.routeId}-${assignment.timePeriod === 'Both' ? 'Morning' : assignment.timePeriod}`;
      
      if (!assignmentMap.has(key)) {
        assignmentMap.set(key, assignment);
      }
    }

    for (const assignment of assignmentMap.values()) {
      const timePeriods = assignment.timePeriod === 'Both' ? ['Morning', 'Evening'] : [assignment.timePeriod];
      
      for (const period of timePeriods) {
        const departureTime = period === 'Morning' ? '06:30:00' : '15:30:00';
        const returnTime = period === 'Morning' ? '08:30:00' : '17:30:00';
        const tripTime = `${todayStr} ${departureTime}`;
        
        // Check if trip already exists for this route, date, and time period
        const timeCondition = period === 'Morning' 
          ? "TIME(departure_time) < '12:00:00'" 
          : "TIME(departure_time) >= '12:00:00'";
        
        const [existingTrip] = await pool.query(
          `SELECT id FROM trip_monitoring 
           WHERE route_id = ? AND DATE(departure_time) = ? AND ${timeCondition}`,
          [assignment.routeId, todayStr]
        );
        
        if (existingTrip.length === 0) {
          await createTrip({
            payload: {
              routeId: assignment.routeId,
              departureTime: tripTime,
              expectedReturnTime: `${todayStr} ${returnTime}`,
              notes: `Automated ${period} Trip`,
              status: "Not Started"
            }
          });
          createdCount++;
        } else {
          // Update existing trip with current assignment details
          await pool.query(
            `UPDATE trip_monitoring 
             SET vehicle_plate = ?, driver_name = ?, assistant_name = ?
             WHERE id = ?`,
            [
              assignment.vehiclePlate,
              assignment.driverName || '',
              assignment.assistantName || null,
              existingTrip[0].id
            ]
          );
        }
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
