import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import { redis } from "../config";

const {
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  ACCESS_EXPIRES_IN = "15m",
  REFRESH_EXPIRES_IN = "7d",
  AUTH_CODE_TTL_SEC = "300", // 5 min
  INTERNAL_BASE_DOMAIN,
} = process.env;
const ROOT_DOMAIN = INTERNAL_BASE_DOMAIN ?? "localhost";

export interface JwtPayload {
  userId: string;
  email: string;
}

export class AuthUtils {
  static signAccessToken(payload: JwtPayload) {
    return jwt.sign(payload, JWT_ACCESS_SECRET as string, { expiresIn: "15m" });
  }

  static signRefreshToken(payload: JwtPayload) {
    return jwt.sign(payload, JWT_REFRESH_SECRET as string, { expiresIn: "7d" });
  }

  static async generateAuthCode(userId: string) {
    const code = uuid();
    await redis.set(
      `auth_code:${code}`,
      userId,
      "EX",
      Number(AUTH_CODE_TTL_SEC)
    );
    return code;
  }

  static buildCookieOptions(maxAgeMs: number, domain: string) {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: maxAgeMs,
      domain,
    };
  }

  static isFirstParty(origin = ""): boolean {
    try {
      const { hostname } = new URL(origin);
      return (
        hostname === ROOT_DOMAIN || 
        hostname.endsWith(`.${ROOT_DOMAIN}`) 
      );
    } catch {
      return false; 
    }
  }
}
