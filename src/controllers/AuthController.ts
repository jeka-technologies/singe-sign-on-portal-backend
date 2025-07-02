import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { redis } from '../config'
import { AuthService } from '../services'
import { AuthUtils, JwtPayload, Session } from '../utils'

export class AuthController {
    constructor(private readonly service = new AuthService()) {}

    login = async (req: Request, res: Response) => {
        const { email, password } = req.body
        const origin = req.headers.origin ?? ''

        const result = await this.service.login(email, password)
        if (result.error) {
            res.status(401).json({ status: 'FAILED', message: 'Invalid credentials' })
            return
        }

        /* build + cache -------------------------------------------------- */
        const expiry_at = new Date(Date.now() + AuthUtils.FIFTEEN_MIN).toISOString()
        const session: Session = {
            user_id: result?.user?.id as string,
            first_name: result?.user?.first_name as string,
            last_name: result?.user?.last_name as string,
            email: result?.user?.email as string,
            profile_image: result?.user?.profile_image as string,
            phone_number: result?.user?.phone_number as string,
            access_token: result?.accessToken as string,
            refresh_token: result?.refreshToken as string,
            expiry_at
        }
        await AuthUtils.cacheSession(session)

        /* first- vs third-party ------------------------------------------ */
        if (AuthUtils.isFirstParty(origin)) {
            AuthUtils.buildSessionCookies(session).forEach(([n, v, o]) => res.cookie(n, v, o))
            res.status(200).json({ status: 'SUCCESS', user: result.user, expiry_at })
            return
        }

        const code = await AuthUtils.generateAuthCode(session.user_id)
        await redis.hset(`auth-code:${code}`, session)
        await redis.expire(`auth-code:${code}`, 300)

        res.status(200).json({ status: 'SUCCESS', auth_code: code, expires_in: 300 })
    }

    verifyAuthCode = async (req: Request, res: Response) => {
        const code = req.body.auth_code as string
        if (!code) {
            res.status(400).json({ status: 'FAILED', message: 'Auth code is required' })
            return
        }

        const key = `auth-code:${code}`
        const session = (await redis.hgetall(key)) as Session
        if (!session.user_id) {
            res.status(400).json({ status: 'FAILED', message: 'Auth code invalid or expired' })
            return
        }

        await redis.del(key) // single-use code
        await AuthUtils.cacheSession(session)

        /* first- vs third-party reuse ------------------------------------ */
        if (AuthUtils.isFirstParty(req.headers.origin ?? '')) AuthUtils.buildSessionCookies(session).forEach(([n, v, o]) => res.cookie(n, v, o))

        res.status(200).json({
            status: 'SUCCESS',
            user: {
                id: session.user_id,
                first_name: session.first_name,
                last_name: session.last_name,
                email: session.email,
                phone_number: session.phone_number,
                profile_image: session.profile_image
            },
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expiry_at: session.expiry_at
        })
    }

    verifySession = async (req: Request, res: Response) => {
        // 1️⃣ Read token
        const accessToken = AuthUtils.extractAccessToken(req)
        if (!accessToken) return AuthUtils.unauthorized(res, 'Missing access token')

        // 2️⃣ Verify JWT signature & expiry
        let payload: JwtPayload
        try {
            payload = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET as string) as JwtPayload
        } catch (err) {
            console.error('JWT verification error:', err)
            return AuthUtils.unauthorized(res, 'Invalid or expired access token')
        }

        // 3️⃣ Check Redis session
        const redisKey = `session:${payload.userId}`
        const session = await redis.hgetall(redisKey)

        if (!session?.access_token) {
            return AuthUtils.unauthorized(res, 'Session not found (may be logged out)')
        }

        if (session.access_token !== accessToken) {
            return AuthUtils.unauthorized(res, 'Token mismatch')
        }

        res.json({
            valid: true,
            userId: payload.userId,
            email: payload.email,
            expiresAt: Number(session.expiry_at)
            // Sliding-window refresh – bump expiry if you want:
            // ttlRefreshed: await redis.expire(redisKey, AuthUtils.SEVEN_DAYS),
        })
    }

    refreshToken = async (req: Request, res: Response) => {
        const { grant_type } = req.body
        if (grant_type !== 'refresh_token') {
            res.status(400).json({ error: 'Unsupported grant type' })
            return
        }

        //--------------------------------------------------------------------
        // 2️⃣  Locate the refresh token (cookie -> header -> body)
        //--------------------------------------------------------------------
        const refresh =
            AuthUtils.extractRefreshToken(req) ?? // cookie or header
            (req.body.refresh_token as string | null) // fallback param

        if (!refresh) {
            res.status(401).json({ status: 'FAILED', reason: 'Refresh token is missing' })
            return
        }

        //--------------------------------------------------------------------
        // 3️⃣  Verify refresh JWT signature / expiry
        //--------------------------------------------------------------------
        let rPayload: any
        try {
            rPayload = jwt.verify(refresh, process.env.JWT_REFRESH_SECRET as string) as jwt.JwtPayload & {
                userId: string
                sessionId: string
                email: string
            }
        } catch {
            res.status(401).json({ status: 'FAILED', reason: 'Expired or invalid refresh token' })
            return
        }

        //--------------------------------------------------------------------
        // 4️⃣  Match Redis -> guarantees logout everywhere invalidates tokens
        //--------------------------------------------------------------------
        const redisKey = `session:${rPayload.userId}`
        const session = await redis.hgetall(redisKey)

        if (!session.refresh_token || session.refresh_token !== refresh) {
            res.status(401).json({ status: 'FAILED', reason: 'Session not found' })
            return
        }

        //--------------------------------------------------------------------
        // 5️⃣  Rotate tokens (recommended) & update Redis
        //--------------------------------------------------------------------
        const newAccess = AuthUtils.signAccessToken(rPayload)
        const newRefresh = AuthUtils.signRefreshToken(rPayload)

        await redis.hset(redisKey, {
            access_token: newAccess,
            refresh_token: newRefresh,
            expiry_at: Date.now() + AuthUtils.FIFTEEN_MIN,
            refresh_expiry: Date.now() + AuthUtils.SEVEN_DAYS
        })
        await redis.expire(redisKey, AuthUtils.SEVEN_DAYS / 1000)

        //--------------------------------------------------------------------
        // 6️⃣  Set cookies again **only** for first-party web callers
        //--------------------------------------------------------------------
        if (AuthUtils.isFirstParty(req.headers.origin ?? '')) {
            res.cookie('access_token', newAccess, AuthUtils.buildCookieOptions(AuthUtils.FIFTEEN_MIN, process.env.INTERAL_DOMAIN as string)).cookie(
                'refresh_token',
                newRefresh,
                AuthUtils.buildCookieOptions(AuthUtils.SEVEN_DAYS, process.env.INTERAL_DOMAIN as string)
            )
            return
        }

        //--------------------------------------------------------------------
        // 7️⃣  Return OAuth-style JSON response so SPAs / mobile apps can store it
        //--------------------------------------------------------------------
        res.json({
            access_token: newAccess,
            refresh_token: newRefresh,
            token_type: 'Bearer',
            expires_in: AuthUtils.FIFTEEN_MIN / 1000
        })
    }
}
