const request = require('supertest');
const app = require('../src/app');
const { makeToken } = require('./utils/testToken');

describe('RBAC positive checks', () => {
  test('Admin can access manual generate endpoint (not 401/403)', async () => {
    const adminToken = makeToken({ sub: 1, role: 'Admin' });
    const res = await request(app).post('/api/trips/generate/today').set('Authorization', `Bearer ${adminToken}`);
    expect([401,403]).not.toContain(res.statusCode);
  });

  test('Driver cannot access manual generate endpoint (403)', async () => {
    const driverToken = makeToken({ sub: 2, role: 'Driver' });
    const res = await request(app).post('/api/trips/generate/today').set('Authorization', `Bearer ${driverToken}`);
    expect([401,403]).toContain(res.statusCode);
  });

  test('Transport Manager and Admin can access SSE attendance stream', async () => {
    const tmToken = makeToken({ sub: 3, role: 'Transport Manager' });
    const res1 = await request(app).get('/api/realtime/sse/attendance').set('Authorization', `Bearer ${tmToken}`);
    expect([200,401,403]).not.toContain(res1.statusCode);

    const adminToken = makeToken({ sub: 1, role: 'Admin' });
    const res2 = await request(app).get('/api/realtime/sse/attendance').set('Authorization', `Bearer ${adminToken}`);
    expect([200,401,403]).not.toContain(res2.statusCode);
  });

  test('Driver cannot access SSE attendance stream (403)', async () => {
    const driverToken = makeToken({ sub: 2, role: 'Driver' });
    const res = await request(app).get('/api/realtime/sse/attendance').set('Authorization', `Bearer ${driverToken}`);
    expect([401,403]).toContain(res.statusCode);
  });
});
