process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

const jwt = require('jsonwebtoken');
const request = require('supertest');
const { app } = require('../app');

describe('cart routes integration', () => {
  test('GET /api/cart/:userId returns 401 without token', async () => {
    const res = await request(app).get('/api/cart/11111111-1111-1111-1111-111111111111');
    expect(res.status).toBe(401);
  });

  test('GET /api/cart/:userId returns 403 for other user token', async () => {
    const token = jwt.sign(
      { id_user: '22222222-2222-2222-2222-222222222222', role: 'client' },
      process.env.JWT_SECRET
    );
    const res = await request(app)
      .get('/api/cart/11111111-1111-1111-1111-111111111111')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
