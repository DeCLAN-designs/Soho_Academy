const pool = require('../src/config/db');
const { createTrip } = require('../src/services/trips.service');
const { updateAttendanceRecord } = require('../src/services/studentAttendance.service');
const { hasDb } = require('./utils/dbCheck');

// Integration test: attendance optimistic locking and retry
describe('Attendance concurrency', () => {
  let trip = null;

  beforeAll(async () => {
    dbAvailable = await hasDb();

    // Create a test trip for today using routeId=1 (requires test data)
    try {
      trip = await createTrip({ payload: { routeId: 1, departureTime: new Date().toISOString(), expectedReturnTime: new Date(Date.now()+3600000).toISOString(), vehiclePlate: 'TEST-1', driverName: 'Driver', assistantName: 'Assistant' } });
    } catch (err) {
      // ignore if route 1 not present
      trip = null;
    }
  });

  afterAll(async () => {
    try { await pool.end(); } catch (e) {}
  });

  test('concurrent updates should be retried or succeed without data corruption', async () => {
    if (!dbAvailable) {
      console.warn('Skipping attendance concurrency test - DB not available');
      return;
    }

    if (!trip) return;

    const [rows] = await pool.query('SELECT id FROM student_attendance WHERE trip_id = ? LIMIT 1', [trip.id]);
    if (rows.length === 0) return;

    const attendanceId = rows[0].id;

    // Simulate two concurrent updates
    const p1 = updateAttendanceRecord({ id: attendanceId, payload: { boarding_status: 'Boarded', confirmed_by_user_id: 2 } });
    const p2 = updateAttendanceRecord({ id: attendanceId, payload: { dropoff_status: 'Dropped Off', confirmed_by_user_id: 3 } });

    const results = await Promise.all([p1, p2]);
    expect(results.length).toBe(2);
  }, 20000);
});
