const cron = require("node-cron");
const pool = require("../config/db.js");
const { createTrip } = require("../services/trips.service.js");
const { getAssignmentsForDate, getAssignmentForRouteAndPeriod } = require("../services/vehicleRouteAssignment.service.js");
const transportCalendarService = require("../services/transportCalendar.service.js");
const { normalizeDate, getTodayDateInTimezone } = require("../utils/date.js");

/**
 * Generate automated daily trips based on vehicle-route assignments.
 * Run at 3:00 AM every Monday to Friday.
 */
const { schedulerRuns, schedulerErrors, tripsCreated, tripsSkipped } = require('../utils/metrics');

const generateDailyTrips = async ({ date } = {}) => {
  const todayStr = normalizeDate(date) || getTodayDateInTimezone();
  console.log(`[Cron] [${new Date().toISOString()}] Running daily trips generation for ${todayStr}...`);
  try { schedulerRuns.inc(); } catch (e) { /* noop */ }

  try {
    // 0. Check transport availability for the date
    const { transportEnabled, source } = await transportCalendarService.isTransportDay(todayStr);
    if (!transportEnabled) {
      console.log(`[Cron] Transport disabled for ${todayStr} (source=${source}). Skipping generation.`);
      return;
    }

    // 1. Get all active vehicle-route assignments for date
    const assignments = await getAssignmentsForDate({ date: todayStr });
    if (assignments.length === 0) {
      console.log(`[Cron] No active vehicle-route assignments found for ${todayStr}. Skipping generation.`);
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
              vehiclePlate: assignment.vehiclePlate,
              driverName: assignment.driverName || '',
              assistantName: assignment.assistantName || null,
              departureTime: tripTime,
              expectedReturnTime: `${todayStr} ${returnTime}`,
              notes: `Automated ${period} Trip`,
              status: "Not Started"
            }
          });
          createdCount++;
          try { tripsCreated.inc(); } catch (e) {}
        } else {
          // Trip already exists for this route/date/session. Do NOT modify existing trip
          // to preserve immutability — log and continue.
          console.log(`[Cron] Trip already exists for route ${assignment.routeId} on ${todayStr} (${period}). Skipping update to preserve immutability.`);
          try {
            await pool.query(
              `INSERT INTO audit_logs (actorUserId, domain, entityType, entityId, action, previousStateJson, newStateJson) VALUES (?, 'transport', 'trip', ?, ?, NULL, ?)` ,
              [null, existingTrip[0].id, 'trip_generation_skipped', JSON.stringify({ reason: 'existing_trip', routeId: assignment.routeId, date: todayStr, session: period })]
            );
            try { tripsSkipped.inc(); } catch (e) {}
          } catch (err) {
            console.warn('Failed to write audit log for skipped trip generation', err);
          }
        }
      }
    }

    console.log(`[Cron] Daily trips generation completed successfully for ${todayStr}. Created ${createdCount} trips.`);
  } catch (error) {
    try { schedulerErrors.inc(); } catch (e) {}
    console.error(`[Cron] Failed to generate daily trips for ${todayStr}:`, error);
  }
};

const generateDailyTripsRange = async ({ startDate, endDate }) => {
  const normalizedStart = normalizeDate(startDate);
  const normalizedEnd = normalizeDate(endDate);

  if (!normalizedStart || !normalizedEnd) {
    throw new Error('Invalid startDate or endDate. Expected YYYY-MM-DD.');
  }

  const start = new Date(normalizedStart);
  const end = new Date(normalizedEnd);

  if (start > end) {
    throw new Error('startDate must be before or equal to endDate.');
  }

  let current = new Date(start);
  while (current <= end) {
    const dateString = current.toISOString().slice(0, 10);
    await generateDailyTrips({ date: dateString });
    current.setDate(current.getDate() + 1);
  }
};

const initCronJobs = () => {
  // Schedule to run at 3:00 AM every day.
  // Disabled transport days are still skipped by the transport calendar check.
  cron.schedule("0 3 * * *", generateDailyTrips, {
    scheduled: true,
    timezone: "Africa/Nairobi" // Replace with appropriate timezone or leave default
  });

  console.log("✅ Scheduled dailyTrips cron job (3:00 AM every day)");
};

module.exports = {
  initCronJobs,
  generateDailyTrips, // Exported for manual trigger testing
  generateDailyTripsRange,
};
