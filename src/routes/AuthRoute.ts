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
