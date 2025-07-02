/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login to get access and refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: test.example.com
 *               password:
 *                 type: string
 *                 description: Only required for 3rd-party requests
 *     responses:
 *       200:
 *         description: New tokens returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 auth_code:
 *                   type: string
 *                 expires_in:
 *                   type: number
 *       401:
 *         description: Invalid credential
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /auth/verify-auth-code:
 *   post:
 *     summary: Exchange a one-time auth code for access & refresh tokens
 *     description: |
 *       Used by third-party (cross-domain) clients that cannot receive httpOnly
 *       cookies during the initial login redirect.
 *       The client sends the **auth_code** it got from **POST /auth/login** and
 *       receives token(s) in JSON.
 *       First-party callers typically skip this step because cookies are already
 *       set by the auth server.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - auth_code
 *             properties:
 *               auth_code:
 *                 type: string
 *                 example: 76ce3db2-43d0-4ade-98c9-2bf1f54e3c37
 *     responses:
 *       200:
 *         description: Tokens issued successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access_token:
 *                   type: string
 *                 refresh_token:
 *                   type: string
 *                 token_type:
 *                   type: string
 *                   example: Bearer
 *                 expires_in:
 *                   type: integer
 *                   description: Lifetime of the access token (seconds)
 *       401:
 *         description: Auth code invalid or expired
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /auth/verify-session:
 *   get:
 *     summary: Check whether the current access token is still valid
 *     description: |
 *       - **First-party**: access_token is read from an httpOnly cookie.
 *       - **Third-party**: access_token must be sent in an `Authorization: Bearer`
 *         header.
 *       Returns basic user info and remaining lifetime. No tokens are refreshed
 *       here; use **POST /auth/refresh-token** for that.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Session is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   example: true
 *                 userId:
 *                   type: string
 *                 email:
 *                   type: string
 *                 expires_in:
 *                   type: integer
 *                   description: Seconds until the access token expires
 *       401:
 *         description: No active session (token missing / expired / logged out)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 reason:
 *                   type: string
 */

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh access & refresh tokens
 *     tags: [Authentication]
 *     description: |
 *       Accepts a **refresh_token** either as an httpOnly cookie (first-party)
 *       or in the `Authorization: Bearer` header / request body (third-party).
 *       On success, rotates the refresh token, issues a new access token, and
 *       updates the Redis session.
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               grant_type:
 *                 type: string
 *                 example: refresh_token
 *               refresh_token:
 *                 type: string
 *                 description: |
 *                   Only required for cross-domain callers that cannot use the
 *                   cookie. First-party apps leave this out.
 *     responses:
 *       200:
 *         description: New token pair issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access_token:
 *                   type: string
 *                 refresh_token:
 *                   type: string
 *                 token_type:
 *                   type: string
 *                   example: Bearer
 *                 expires_in:
 *                   type: integer
 *       401:
 *         description: Refresh token invalid, expired, or session missing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 */

import { Router } from 'express'
import { AuthController } from '../controllers'
import { LoginUserDto } from '../dtos'
import { VerifyAuthCodeDto } from '../dtos/VerifyAuthCodeDto'
import { validateClass } from '../middlewares'
import { autoBind } from '../utils'

export class AuthRoutes {
    public router: Router
    private readonly controller: AuthController

    constructor() {
        this.router = Router()
        this.controller = new AuthController()
        autoBind(this.controller)
        this.initializeRoutes()
    }

    private initializeRoutes() {
        this.router.post('/login', validateClass(LoginUserDto), this.controller.login)
        this.router.post('/verify-auth-code', validateClass(VerifyAuthCodeDto), this.controller.verifyAuthCode)
        this.router.get('/verify-session', this.controller.verifySession)
        this.router.post('/refresh-token', this.controller.refreshToken)
    }
}
