import { Request, Response } from "express";
import { AuthService } from "../services";
import { AuthUtils } from "../utils";

export class AuthController {
  constructor(private readonly service = new AuthService()) {}

  login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const result = await this.service.login(email, password);

    if (result.error) {
      res
        .status(401)
        .json({ status: "FAILED", message: "Invalid credentials" });
      return;
    }

    const { user, accessToken, refreshToken } = result;
    const isSameDomain = AuthUtils.isFirstParty(req.headers.origin);

    if (isSameDomain) {
      // 1️⃣ First-party: set cookies
      const fifteenMinutes = 15 * 60 * 1000;
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      const expiryAt = new Date(Date.now() + fifteenMinutes).toISOString();
      const cookieDomain = process.env.COOKIE_DOMAIN ?? "";

      const commonFlags = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        domain:
          process.env.NODE_ENV === "production" ? cookieDomain : undefined,
      };

      res.cookie("access_token", accessToken, {
        ...commonFlags,
        maxAge: fifteenMinutes,
      });

      res.cookie("refresh_token", refreshToken, {
        ...commonFlags,
        maxAge: sevenDays,
      });

      res.cookie("expiry_at", expiryAt, {
        ...commonFlags,
        maxAge: fifteenMinutes,
      });

      res.status(200).json({
        status: "SUCCESS",
        user: {
          id: user?.id,
          first_name: user?.first_name,
          last_name: user?.last_name,
          phone_number: user?.phone_number,
          profile_image: user?.profile_image,
          email: user?.email,
        },
        expiry_at: expiryAt,
      });
      return;
    }

    // 2️⃣ Third-party / cross-domain: issue short-lived auth-code
    const authCode = await AuthUtils.generateAuthCode(user?.id as string);

    res.status(200).json({
      status: "SUCCESS",
      auth_code: authCode,
      expires_in: Number(process.env.AUTH_CODE_TTL_SEC ?? 300),
    });
  };
}
