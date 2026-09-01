require('dotenv').config();
const { generateTripsForDate } = require('../src/services/tripGenerationService.js');

const today = new Date().toISOString().slice(0, 10);
console.log(`Generating trips for: ${today}`);

generateTripsForDate({ 
  date: today,
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
