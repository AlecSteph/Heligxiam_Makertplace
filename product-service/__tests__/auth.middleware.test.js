const { requireRoles } = require('../middlewares/auth');

describe('requireRoles middleware', () => {
  test('returns 403 for unauthorized role', () => {
    const middleware = requireRoles('vendeur', 'admin');
    const req = { user: { id_user: 'u1', role: 'client' } };
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

    middleware(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('calls next for authorized role', () => {
    const middleware = requireRoles('vendeur', 'admin');
    const req = { user: { id_user: 'u2', role: 'vendeur' } };
    const res = {
      status() {
        return this;
      },
      json() {
        return this;
      }
    };
    const next = jest.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
