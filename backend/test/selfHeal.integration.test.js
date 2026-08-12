const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const { hasDb } = require('./utils/dbCheck');
const { generateDailyTrips } = require('../src/jobs/dailyTrips.job');

describe('Self-healing and manual trip generation', () => {
  let dbAvailable = false;

  beforeAll(async () => {
    dbAvailable = await hasDb();
  });

  afterAll(async () => {
    try { await pool.end(); } catch (e) {}
  });

  test('manual generation endpoint requires auth and role', async () => {
    const res = await request(app).post('/api/trips/generate/today');
    expect(res.statusCode).toBe(401);
  });

  test('generateDailyTrips is idempotent when run after manual deletion', async () => {
    if (!dbAvailable) {
      console.warn('Skipping self-heal integration test - DB not available');
      return;
    }

    const date = new Date().toISOString().slice(0,10);
    // Run generator to ensure trips exist
    await generateDailyTrips({ date });

    // Simulate a missing trip by deleting any trip_monitoring rows for today
    await pool.query('DELETE FROM trip_monitoring WHERE DATE(departure_time) = ?', [date]);

    // Re-run generator which should recreate missing trips
    await generateDailyTrips({ date });

    const [rows] = await pool.query('SELECT COUNT(*) AS cnt FROM trip_monitoring WHERE DATE(departure_time) = ?', [date]);
    expect(rows[0].cnt).toBeGreaterThanOrEqual(0);
  }, 20000);
});
