const request = require('supertest');
const app = require('../../src/app');
const { createAccessToken } = require('../../src/utils/token');

// This sequence test simulates the trip lifecycle. Requires a test DB with fixtures.
describe('Trip progression sequence (smoke)', () => {
  const adminToken = createAccessToken({ sub: 1, role: 'Admin' });
  const driverToken = createAccessToken({ sub: 2, role: 'Driver' });

  let tripId = null;

  test('Create trip (Admin)', async () => {
    const payload = {
      routeId: 1,
      departureTime: new Date(Date.now() + 3600 * 1000).toISOString(),
      expectedReturnTime: new Date(Date.now() + 7200 * 1000).toISOString(),
      vehiclePlate: 'TEST-123',
      driverName: 'Test Driver'
    };
    const res = await request(app).post('/api/trips').set('Authorization', `Bearer ${adminToken}`).send(payload);
    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    tripId = res.body.data.id || res.body.data.tripId || res.body.data.trip_id;
  });

  test('Mark Ready (Admin)', async () => {
    const res = await request(app).post(`/api/trips/${tripId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'Ready' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Ready');
  });

  test('Driver marks In Progress', async () => {
    const res = await request(app).post(`/api/trips/${tripId}/status`).set('Authorization', `Bearer ${driverToken}`).send({ status: 'In Progress' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('In Progress');
  });

  test('Driver marks Returned', async () => {
    const res = await request(app).post(`/api/trips/${tripId}/status`).set('Authorization', `Bearer ${driverToken}`).send({ status: 'Returned' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Returned');
  });
});
