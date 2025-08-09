import jwt from "jsonwebtoken";

export function signAccessToken(payload: object) {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: Number(process.env.ACCESS_TOKEN_EXPIRES_IN),
  });
}

export function signRefreshToken(payload: object) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: Number(process.env.REFRESH_TOKEN_EXPIRES_IN),
  });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET!);
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!);
}
