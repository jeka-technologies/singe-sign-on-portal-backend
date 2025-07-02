import { CookieOptions, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { v4 as uuid } from 'uuid'
import { redis } from '../config'

export type Session = Record<string, string>

const INTERNAL_HOST = (process.env.INTERNAL_HOST ?? '')
    .trim() // defensive
    .replace(/\.$/, '') // strip trailing dot
    .toLowerCase()

const {
    JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET,
    AUTH_CODE_TTL_SEC = '300', // 5 min
    ACCESS_TOKEN_EXPIRY = '15m',
    REFRESH_TOKEN_EXPIRY = '7d'
} = process.env

export interface JwtPayload {
    userId: string
    email: string
}

function stripJwtReserved<T extends jwt.JwtPayload>(payload: T) {
    const { exp, iat, nbf, aud, iss, sub, jti, ...rest } = payload as any
    return rest as Omit<T, 'exp' | 'iat' | 'nbf' | 'aud' | 'iss' | 'sub' | 'jti'>
}

export class AuthUtils {
    static readonly FIFTEEN_MIN = 15 * 60 * 1000
    static readonly SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000

    static signAccessToken(payload: JwtPayload) {
        return jwt.sign(stripJwtReserved(payload), JWT_ACCESS_SECRET as string, { expiresIn: ACCESS_TOKEN_EXPIRY as any })
    }

    static signRefreshToken(payload: JwtPayload) {
        return jwt.sign(stripJwtReserved(payload), JWT_REFRESH_SECRET as string, { expiresIn: REFRESH_TOKEN_EXPIRY as any })
    }

    static async generateAuthCode(userId: string) {
        const code = uuid()
        await redis.set(`auth_code:${code}`, userId, 'EX', Number(AUTH_CODE_TTL_SEC))
        return code
    }

    static buildCookieOptions(maxAgeMs: number, domain: string) {
        return {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax' as const,
            maxAge: maxAgeMs,
            domain
        }
    }

    /** Same domain = process.env.INTERNAL_HOST or any of its sub-domains */
    static isFirstParty(reqOrigin = ''): boolean {
        if (!reqOrigin) return false
        try {
            const host = new URL(reqOrigin).hostname.toLowerCase()
            return host === INTERNAL_HOST || host.endsWith(`.${INTERNAL_HOST}`)
        } catch {
            // bad Origin header → treat as third-party
            return false
        }
    }

    static async cacheSession(session: Session) {
        const key = `session:${session.user_id}`
        await redis.hset(key, session)
        await redis.expire(key, this.SEVEN_DAYS)
    }

    static buildSessionCookies({ access_token, refresh_token, expiry_at }: Session) {
        const common: CookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            domain: process.env.NODE_ENV === 'production' ? (process.env.COOKIE_DOMAIN ?? '') : undefined
        }

        return [
            ['access_token', access_token, { ...common, maxAge: this.FIFTEEN_MIN }],
            ['refresh_token', refresh_token, { ...common, maxAge: this.SEVEN_DAYS }],
            ['expiry_at', expiry_at, { ...common, maxAge: this.FIFTEEN_MIN }]
        ] as const
    }

    static extractAccessToken(req: Request): string | undefined {
        if (req.cookies?.access_token) return req.cookies.access_token

        const auth = req.header('authorization') ?? ''
        const execResult = /^Bearer\s+(.+)$/i.exec(auth)
        const token = execResult ? execResult[1] : undefined
        return token
    }

    static unauthorized(res: Response, msg = 'Unauthorised') {
        res.status(401).json({ status: 'FAILED', message: msg })
    }

    static extractRefreshToken(req: Request): string | undefined {
        // httpOnly cookie path
        if (req.cookies?.refresh_token) return req.cookies.refresh_token

        // Authorization: Bearer <refresh>
        const hdr = req.header('authorization') ?? ''
        const execResult = /^Bearer\s+(.+)$/i.exec(hdr)
        const token = execResult ? execResult[1] : undefined
        return token
    }
}
