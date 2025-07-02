/**
 * @swagger
 * /users/create-account:
 *   post:
 *     summary: Create a new user account
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - first_name
 *               - last_name
 *               - email
 *               - password
 *               - phone_number
 *               - profile_image
 *             properties:
 *               first_name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: John
 *               last_name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: "P@ssw0rd!"
 *               phone_number:
 *                 type: string
 *                 example: "+2348012345678"
 *               salt:
 *                 type: string
 *                 description: Optional custom salt (rarely needed on create)
 *                 example: 1a2b3c4d
 *               profile_image:
 *                 type: string
 *                 description: URL or storage key for the avatar
 *                 example: "https://cdn.example.com/avatars/john.png"
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: 9f3a898d-f1ab-42e7-9d6b-739ce0f14021
 *                 first_name:
 *                   type: string
 *                 last_name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 phone_number:
 *                   type: string
 *                 profile_image:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Validation error"
 */

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
        this.router.post('/create-account', validateClass(CreateUserDto), this.controller.createUserHandler)
    }
}
