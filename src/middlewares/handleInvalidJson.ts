import { NextFunction, Request, Response } from 'express'

export const handleInvalidJson = (err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
        console.error('❌ Malformed JSON:', err.message)
        res.status(400).json({
            message: 'Invalid JSON in request body',
            error: err.message
        })
        return
    }
    next(err)
}
