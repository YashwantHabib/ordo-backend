import { Router } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../prisma";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";
import crypto from "crypto";

const router = Router();

// Helper to hash refresh token before saving
function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

router.post("/register", async (req, res) => {
  const { email, password, name } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(400).json({ error: "Email already in use" });

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, password: hashedPassword, name },
  });

  res.status(201).json({
    message: "User created",
    user: { id: user.id, email: user.email },
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) return res.status(400).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: "Invalid credentials" });

  const accessToken = signAccessToken({ userId: user.id });
  const refreshToken = signRefreshToken({ userId: user.id });

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId: user.id,
      expiresAt: new Date(
        Date.now() + Number(process.env.REFRESH_TOKEN_EXPIRES_IN) * 1000
      ),
    },
  });

  res
    .cookie("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: Number(process.env.ACCESS_TOKEN_EXPIRES_IN) * 1000,
    })
    .cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: Number(process.env.REFRESH_TOKEN_EXPIRES_IN) * 1000,
    })
    .json({ message: "Logged in" });
});

router.post("/refresh", async (req, res) => {
  const token = req.cookies.refresh_token;
  if (!token) return res.status(401).json({ error: "No refresh token" });

  try {
    const payload: any = verifyRefreshToken(token);

    const stored = await prisma.refreshToken.findFirst({
      where: { userId: payload.userId, tokenHash: hashToken(token) },
    });

    if (!stored)
      return res.status(403).json({ error: "Invalid refresh token" });

    // Rotate token: delete old & issue new
    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const newRefreshToken = signRefreshToken({ userId: payload.userId });

    await prisma.refreshToken.create({
      data: {
        tokenHash: hashToken(newRefreshToken),
        userId: payload.userId,
        expiresAt: new Date(
          Date.now() + Number(process.env.REFRESH_TOKEN_EXPIRES_IN) * 1000
        ),
      },
    });

    const newAccessToken = signAccessToken({ userId: payload.userId });

    res
      .cookie("access_token", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: Number(process.env.ACCESS_TOKEN_EXPIRES_IN) * 1000,
      })
      .cookie("refresh_token", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: Number(process.env.REFRESH_TOKEN_EXPIRES_IN) * 1000,
      })
      .json({ message: "Token refreshed" });
  } catch {
    res.status(403).json({ error: "Invalid refresh token" });
  }
});

export default router;
