import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies.access_token;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded; // requires Express type augmentation
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
