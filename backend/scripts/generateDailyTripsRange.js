require('dotenv').config();
const { generateDailyTripsRange } = require('../src/jobs/dailyTrips.job.js');

const [startDate, endDate] = process.argv.slice(2);

if (!startDate || !endDate) {
  console.error('Usage: node backend/scripts/generateDailyTripsRange.js <startDate> <endDate>');
  console.error('Example: node backend/scripts/generateDailyTripsRange.js 2026-06-11 2026-08-04');
  process.exit(1);
}

const run = async () => {
  try {
    console.log(`Generating trips for school days from ${startDate} to ${endDate}...`);
    await generateDailyTripsRange({ startDate, endDate });
    console.log('Trip generation completed.');
    process.exit(0);
  } catch (error) {
    console.error('Trip generation failed:', error);
    process.exit(1);
  }
};

run();
