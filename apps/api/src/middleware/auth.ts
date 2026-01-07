import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

type JwtAdmin = { adminId: string };

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET missing");

    const payload = jwt.verify(token, secret) as JwtAdmin;
    (req as any).admin = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}
