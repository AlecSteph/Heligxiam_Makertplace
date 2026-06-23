process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

const jwt = require('jsonwebtoken');
const request = require('supertest');
const { app } = require('../app');

describe('products routes integration', () => {
  test('POST /api/products returns 401 without token', async () => {
    const res = await request(app).post('/api/products').send({});
    expect(res.status).toBe(401);
  });

  test('POST /api/products returns 403 for client role', async () => {
    const token = jwt.sign({ id_user: 'u1', role: 'client' }, process.env.JWT_SECRET);
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(403);
  });
});
