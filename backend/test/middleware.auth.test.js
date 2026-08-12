const express = require('express');
const request = require('supertest');
const { authenticate, authorizeRoles } = require('../src/middlewares/auth.middleware');
const { makeToken } = require('./utils/testToken');

describe('Auth middleware', () => {
  let app;
  beforeAll(() => {
    app = express();
    app.get('/auth-test', authenticate, (req, res) => res.json({ success: true, user: req.user }));
    app.get('/role-test', authenticate, authorizeRoles('Transport Manager'), (req, res) => res.json({ success: true }));
  });

  test('rejects missing token', async () => {
    const res = await request(app).get('/auth-test');
    expect(res.statusCode).toBe(401);
  });

  test('accepts valid token and attaches user', async () => {
    const token = makeToken({ sub: 42, role: 'Admin', firstName: 'Alice' });
    const res = await request(app).get('/auth-test').set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.user).toHaveProperty('sub', 42);
    expect(res.body.user).toHaveProperty('role', 'Admin');
  });

  test('authorizeRoles allows correct role', async () => {
    const token = makeToken({ sub: 10, role: 'Transport Manager' });
    const res = await request(app).get('/role-test').set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
  });

  test('authorizeRoles rejects incorrect role', async () => {
    const token = makeToken({ sub: 11, role: 'Driver' });
    const res = await request(app).get('/role-test').set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(403);
  });
});
