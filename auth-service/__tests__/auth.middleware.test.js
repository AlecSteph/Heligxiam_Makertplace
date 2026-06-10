const jwt = require('jsonwebtoken');
const { requireAuth } = require('../middlewares/auth');

describe('requireAuth middleware', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test_secret';
  });

  test('returns 401 when authorization header is missing', () => {
    const req = { headers: {} };
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.payload = payload;
        return this;
      }
    };
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('sets req.user for a valid token', () => {
    const token = jwt.sign({ id_user: 'u1', role: 'client' }, process.env.JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = {
      status() {
        return this;
      },
      json() {
        return this;
      }
    };
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(req.user.id_user).toBe('u1');
    expect(next).toHaveBeenCalled();
  });
});
