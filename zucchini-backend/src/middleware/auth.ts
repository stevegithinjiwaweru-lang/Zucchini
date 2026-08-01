import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { ApiError } from "../utils/asyncHandler";

export interface AuthedRequest extends Request {
  user?: {
    id: string;
    role: string;
    riderId?: string | null;
  };
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(new ApiError(401, "Missing or malformed Authorization header"));
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role, riderId: payload.riderId };
    next();
  } catch {
    next(new ApiError(401, "Invalid or expired token"));
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return next(new ApiError(401, "Unauthenticated"));
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, "Insufficient permissions"));
    }
    next();
  };
}
