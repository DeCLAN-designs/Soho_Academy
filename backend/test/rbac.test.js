const request = require('supertest');
const app = require('../src/app');

describe('RBAC / Authentication', () => {
  test('unauthenticated access to protected user list should be 401', async () => {
    const res = await request(app).get('/api/users');
    expect(res.statusCode).toBe(401);
  });

  test('unauthenticated manual trip generation should be 401', async () => {
    const res = await request(app).post('/api/trips/generate/today');
    expect(res.statusCode).toBe(401);
  });
});
