const request = require('supertest');
const app = require('../src/app');
const { makeToken } = require('./utils/testToken');

describe('Trip status RBAC', () => {
  const adminToken = makeToken({ sub: 1, role: 'Admin' });
  const driverToken = makeToken({ sub: 2, role: 'Driver' });
  const assistantToken = makeToken({ sub: 3, role: 'Assistant' });
  const busAssistantToken = makeToken({ sub: 4, role: 'Bus Assistant' });

  let tripId = null;

  beforeAll(async () => {
    const payload = {
      routeId: 1,
      departureTime: new Date(Date.now() + 3600 * 1000).toISOString(),
      expectedReturnTime: new Date(Date.now() + 7200 * 1000).toISOString(),
      vehiclePlate: 'RBAC-001',
      driverName: 'RBAC Driver',
    };

    const res = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    tripId = res.body.data.id || res.body.data.tripId || res.body.data.trip_id;
  });

  test('Driver cannot mark trip Ready', async () => {
    const res = await request(app)
      .post(`/api/trips/${tripId}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'Ready' });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('Admin can mark trip Ready', async () => {
    const res = await request(app)
      .post(`/api/trips/${tripId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Ready' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data?.status).toBe('Ready');
  });

  test('Driver can mark trip In Progress after Ready', async () => {
    const res = await request(app)
      .post(`/api/trips/${tripId}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'In Progress' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data?.status).toBe('In Progress');
  });

  test('Assistant can mark trip Returned', async () => {
    const res = await request(app)
      .post(`/api/trips/${tripId}/status`)
      .set('Authorization', `Bearer ${assistantToken}`)
      .send({ status: 'Returned' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data?.status).toBe('Returned');
  });

  test('Driver cannot mark trip Archived', async () => {
    const res = await request(app)
      .post(`/api/trips/${tripId}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'Archived' });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('Admin can archive a returned trip', async () => {
    const res = await request(app)
      .post(`/api/trips/${tripId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Archived' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data?.status).toBe('Archived');
  });
});
