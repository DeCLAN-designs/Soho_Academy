require('dotenv').config();
const { generateTripsForDate, validateTripGenerationPrerequisites } = require('../src/services/tripGenerationService.js');

console.log('🧪 Testing Trip Generation Service\n');

async function runTests() {
  const today = new Date().toISOString().slice(0, 10);
  
  try {
    // Test 1: Validate prerequisites
    console.log('📋 Test 1: Validate Prerequisites');
    const validation = await validateTripGenerationPrerequisites(today);
    console.log('✅ Validation Result:', JSON.stringify(validation, null, 2));
    console.log('');
    
    // Test 2: Generate trips (idempotency test)
    console.log('🚀 Test 2: Generate Trips (Idempotency Test)');
    const result1 = await generateTripsForDate({ 
      date: today,
      generationSource: 'cli'
    });
    console.log('✅ First Generation:', JSON.stringify(result1.stats, null, 2));
    console.log('');
    
    // Test 3: Generate trips again (should be idempotent)
    console.log('🔄 Test 3: Generate Trips Again (Idempotency Check)');
    const result2 = await generateTripsForDate({ 
      date: today,
      generationSource: 'cli'
    });
    console.log('✅ Second Generation:', JSON.stringify(result2.stats, null, 2));
    console.log('');
    
    // Test 4: Verify idempotency
    console.log('🔍 Test 4: Verify Idempotency');
    if (result2.stats.tripsCreated === 0 && result2.stats.tripsSkipped > 0) {
      console.log('✅ Idempotency Working: No duplicate trips created');
      console.log(`   Skipped ${result2.stats.tripsSkipped} existing trips`);
    } else {
      console.log('⚠️  Idempotency Issue: Different results on second run');
    }
    console.log('');
    
    // Test 5: Force regeneration
    console.log('🔧 Test 5: Force Regeneration');
    const result3 = await generateTripsForDate({ 
      date: today,
      force: true,
      generationSource: 'cli'
    });
    console.log('✅ Force Generation:', JSON.stringify(result3.stats, null, 2));
    console.log('');
    
    console.log('🎉 All Tests Completed Successfully');
    console.log('\n📊 Summary:');
    console.log('- Prerequisites:', validation.valid ? '✅ Valid' : '❌ Invalid');
    console.log('- Idempotency:', result2.stats.tripsCreated === 0 && result2.stats.tripsSkipped > 0 ? '✅ Working' : '❌ Failed');
    console.log('- Force Regeneration:', result3.stats.tripsCreated > 0 ? '✅ Working' : '❌ Failed');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test Failed:', error.message);
    console.error('Full Error:', error);
    process.exit(1);
  }
}

runTests();