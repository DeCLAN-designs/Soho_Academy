require('dotenv').config();
const { generateTripsForDate } = require('../src/services/tripGenerationService.js');
const { getTodayDateInTimezone } = require('../src/utils/date.js');

const period = process.argv[2];
if (!['Morning', 'Evening'].includes(period)) {
  console.error('Usage: node scripts/generateTodayTrips.js <Morning|Evening>');
  process.exit(1);
}

const today = getTodayDateInTimezone();
console.log(`Generating ${period} trips for: ${today}`);

generateTripsForDate({ 
  date: today,
  period,
  generationSource: 'cli'
})
  .then((result) => {
    console.log('✅ Trip generation completed');
    console.log('📊 Stats:', JSON.stringify(result.stats, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  });
