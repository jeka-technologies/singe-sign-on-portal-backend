import { Router as ExpressRouter, Router } from 'express'
import { UserController } from '../controllers'
import { CreateUserDto } from '../dtos'
import { validateClass } from '../middlewares'
import { autoBind } from '../utils'

export class UserRoutes {
    router: ExpressRouter
    private readonly controller: UserController

    constructor() {
        this.router = Router()
        this.controller = new UserController()

        autoBind(this.controller)

        this.initializeRoutes()
    }

    private initializeRoutes() {
        this.router.post('/', validateClass(CreateUserDto), this.controller.createUserHandler)
    }
}
