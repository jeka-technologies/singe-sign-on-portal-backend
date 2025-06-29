import { Request, Response } from "express";
import { redis } from "../config";
import { AuthService } from "../services";
import { AuthUtils } from "../utils";

// ---- Domain helpers ----------------------------------------------------
const INTERNAL_DOMAIN_RAW = process.env.INTERNAL_DOMAIN ?? "http://localhost";
// Ensure we always have a valid absolute URL (URL() requires a protocol)
const INTERNAL_HOST = new URL(
  INTERNAL_DOMAIN_RAW.startsWith("http")
    ? INTERNAL_DOMAIN_RAW
    : `https://${INTERNAL_DOMAIN_RAW}`
).hostname.toLowerCase();

export class AuthController {
  constructor(private readonly service = new AuthService()) {}

  login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const origin = req.headers.origin ?? "";

    const result = await this.service.login(email, password);
    if (result.error) {
      res
        .status(401)
        .json({ status: "FAILED", message: "Invalid credentials" });
      return;
    }

    /* ----------  Build the session once  ---------- */
    const { user, accessToken, refreshToken } = result;
    const fifteenMinutes = 15 * 60 * 1000;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const expiryAtIso = new Date(Date.now() + fifteenMinutes).toISOString();

    const session: Record<string, string> = {
      user_id: user?.id as string,
      first_name: user?.first_name as string,
      last_name: user?.last_name as string,
      email: user?.email as string,
      profile_image: user?.profile_image as string,
      phone_number: user?.phone_number as string,
      access_token: accessToken as string,
      refresh_token: refreshToken as string,
      expiry_at: expiryAtIso,
    };

    /* ----------  🔴  ALWAYS cache the session  ---------- */
    const sessionKey = `session:${user?.id}`;
    await redis.hset(sessionKey, session);
    await redis.expire(sessionKey, 60 * 60 * 24 * 7); // 7-day TTL

    /* ----------  Decide on same-site vs cross-site -------- */
    let isSameDomain = false;
    if (origin) {
      try {
        const requestHost = new URL(origin).hostname.toLowerCase();
        // same host or any sub‑domain of the internal host
        isSameDomain =
          requestHost === INTERNAL_HOST ||
          requestHost.endsWith(`.${INTERNAL_HOST}`);
      } catch (err) {
        console.error("Error parsing origin header:", origin, err);
        res.status(400).json({
          status: "FAILED",
          message: "Invalid origin header",
          error: err instanceof Error ? err.message : String(err),
        });
        return;
      }
    }

    if (isSameDomain) {
      /* 1️⃣  Set cookies for first-party context */
      const commonFlags = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        domain:
          process.env.NODE_ENV === "production"
            ? process.env.COOKIE_DOMAIN ?? ""
            : undefined,
      };

      res.cookie("access_token", accessToken, {
        ...commonFlags,
        maxAge: fifteenMinutes,
      });
      res.cookie("refresh_token", refreshToken, {
        ...commonFlags,
        maxAge: sevenDays,
      });
      res.cookie("expiry_at", expiryAtIso, {
        ...commonFlags,
        maxAge: fifteenMinutes,
      });

      res.status(200).json({ status: "SUCCESS", user, expiry_at: expiryAtIso });
      return;
    }

    /* 2️⃣  Cross-domain: create short-lived auth code */
    const code = await AuthUtils.generateAuthCode(user?.id as string);
    await redis.hset(`auth-code:${code}`, session);
    await redis.expire(`auth-code:${code}`, 60 * 5); // 5-minute TTL

    res.status(200).json({
      status: "SUCCESS",
      auth_code: code,
      expires_in: 300,
    });
  };
}
