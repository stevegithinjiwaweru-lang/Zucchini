export default function requestId() {
  return (_req: any, _res: any, next: any) => {
    // Simple request id middleware - in production replace with a library
    // We attach a uuid to req.id
    const { v4: uuidv4 } = require("uuid");
    const id = uuidv4();
    (_req as any).id = id;
    // expose on response for convenience
    _res.setHeader("X-Request-Id", id);
    next();
  };
}
