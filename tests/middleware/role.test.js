const httpMocks = require('node-mocks-http');
const roleMiddleware = require('../../src/middleware/role.middleware');

describe('Role Middleware', () => {
  const mockReqRes = (user) => {
    const req = httpMocks.createRequest();
    req.user = user;
    const res = httpMocks.createResponse();
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => { res._data = data; return res; };
    const next = jest.fn();
    return { req, res, next };
  };

  it('should reject unauthenticated', () => {
    const { req, res, next } = mockReqRes(null);
    delete req.user;
    roleMiddleware('admin')(req, res, next);
    expect(res.statusCode).toBe(401);
  });

  it('should allow admin', () => {
    const { req, res, next } = mockReqRes({ role: 'admin' });
    roleMiddleware('admin')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should deny cajero from admin routes', () => {
    const { req, res, next } = mockReqRes({ role: 'cajero' });
    roleMiddleware('admin')(req, res, next);
    expect(res.statusCode).toBe(403);
  });

  it('should allow multiple roles', () => {
    const { req, res, next } = mockReqRes({ role: 'cajero' });
    roleMiddleware('admin', 'cajero')(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
