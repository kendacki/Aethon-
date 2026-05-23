import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-jwt-secret-change-in-production";
const API_KEY = process.env.API_KEY ?? "dev-api-key";

export interface AuthRequest extends Request {
  walletAddress?: string;
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  if (!token) {
    res.status(401).json({ error: "Missing Authorization Bearer token" });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { address?: string };
    if (!payload.address) {
      res.status(403).json({ error: "Invalid token payload" });
      return;
    }
    req.walletAddress = payload.address.toLowerCase();
    next();
  } catch {
    res.status(403).json({ error: "Invalid or expired token" });
  }
}

/** JWT or legacy x-api-key for scripted clients. */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { address?: string };
      if (payload.address) {
        req.walletAddress = payload.address.toLowerCase();
        next();
        return;
      }
    } catch {
      res.status(403).json({ error: "Invalid or expired token" });
      return;
    }
  }

  const key = req.header("x-api-key");
  if (key === API_KEY) {
    next();
    return;
  }

  res.status(401).json({ error: "Authentication required. Sign in with your wallet or provide a valid API key." });
}

export function verifyWsToken(token: string | null): string | null {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { address?: string };
    return payload.address?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

export { JWT_SECRET };
