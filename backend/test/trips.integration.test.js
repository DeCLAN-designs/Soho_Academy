const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const { generateDailyTrips } = require('../src/jobs/dailyTrips.job');
const { hasDb } = require('./utils/dbCheck');

// Integration test: idempotent trip generation
describe('Trip generation idempotency', () => {
  beforeAll(async () => {
    // Ensure DB accessible; if not, tests will be skipped
    dbAvailable = await hasDb();
  });

  afterAll(async () => {
    try { await pool.end(); } catch (e) {}
  });

  test('running generator twice does not create duplicates for same route/date/session', async () => {
    const date = new Date().toISOString().slice(0,10);
    // Run generator twice
    if (!dbAvailable) {
      console.warn('Skipping idempotency test - DB not available');
      return;
    }

    await generateDailyTrips({ date });
    await generateDailyTrips({ date });

    // Query trips for today
    const [rows] = await pool.query('SELECT COUNT(*) AS cnt FROM trip_monitoring WHERE DATE(departure_time) = ?', [date]);
    expect(rows[0].cnt).toBeGreaterThanOrEqual(0);
    // There should be no duplicated trip_ids for same route/date/session
    const [dups] = await pool.query(
      `SELECT route_id, DATE(departure_time) as d, session, COUNT(*) c FROM trip_monitoring WHERE DATE(departure_time) = ? GROUP BY route_id, DATE(departure_time), session HAVING c > 1`,
      [date]
    );
    expect(dups.length).toBe(0);
  }, 20000);
});
