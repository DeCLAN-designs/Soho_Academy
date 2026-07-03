const { isTransportDay } = require('../src/services/transportCalendar.service');
const pool = require('../src/config/db.js');

describe('transportCalendar.service.isTransportDay', () => {
  beforeAll(async () => {
    // Ensure test DB has minimal rows — these tests are lightweight smoke checks.
  });

  afterAll(async () => {
    // Close DB pool if necessary
    try { await pool.end(); } catch (e) {}
  });

  test('returns false for a date with no active term', async () => {
    const res = await isTransportDay('1900-01-01');
    expect(res.transportEnabled).toBe(false);
  }, 10000);
});
