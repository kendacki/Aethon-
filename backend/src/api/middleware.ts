import type { Request, Response, NextFunction } from "express";

const API_KEY = process.env.API_KEY ?? "dev-api-key";

export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const key = req.header("x-api-key");
  if (key !== API_KEY) {
    res.status(401).json({ error: "Invalid or missing x-api-key header" });
    return;
  }
  next();
}

export function parsePagination(req: Request): { page: number; pageSize: number } {
  const page = Math.max(0, Number(req.query.page ?? 0));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
  return { page, pageSize };
}

export function parseBool(val: unknown): boolean | undefined {
  if (val === "true" || val === "1") return true;
  if (val === "false" || val === "0") return false;
  return undefined;
}
