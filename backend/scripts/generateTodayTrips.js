require('dotenv').config();
const { generateDailyTrips } = require('../src/jobs/dailyTrips.job.js');

const today = new Date().toISOString().slice(0, 10);
console.log(`Generating trips for: ${today}`);

generateDailyTrips({ date: today })
  .then(() => {
    console.log('✅ Trips generated successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  });
