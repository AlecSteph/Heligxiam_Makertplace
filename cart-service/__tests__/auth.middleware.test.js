const { requireSameUserOrAdmin } = require('../middlewares/auth');

describe('requireSameUserOrAdmin middleware', () => {
  test('allows access for same user', () => {
    const req = {
      params: { userId: '11111111-1111-1111-1111-111111111111' },
      user: { id_user: '11111111-1111-1111-1111-111111111111', role: 'client' }
    };
    const res = {
      status() {
        return this;
      },
      json() {
        return this;
      }
    };
    const next = jest.fn();

    requireSameUserOrAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('denies access for another non-admin user', () => {
    const req = {
      params: { userId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
      user: { id_user: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', role: 'client' }
    };
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

    requireSameUserOrAdmin(req, res, next);
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });
});
