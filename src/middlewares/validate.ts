import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { NextFunction, Request, Response } from 'express'

export function validateClass(Dto: any) {
    return async function (req: Request, res: Response, next: NextFunction): Promise<void> {
        const instance = plainToInstance(Dto, req.body)
        const errors = await validate(instance)

        if (errors.length > 0) {
            res.status(400).json({
                message: 'Validation failed',
                errors: errors.map((e) => ({
                    property: e.property,
                    constraints: e.constraints
                }))
            })
            return
        }

        req.body = instance
        next()
    }
}
