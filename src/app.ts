import cookieParser from "cookie-parser"
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { handleInvalidJson } from './middlewares'
import { AuthRoutes, UserRoutes } from './routes'
import { setupSwagger } from './swagger'


dotenv.config()

const allowedOrigins = [
    'http://localhost:5173', 
    'https://your-frontend.com', 
    'http://localhost:8000',
    process.env.ALLOWED_ORIGIN
]

const app = express()
app.use(express.json())
app.use(cookieParser());
setupSwagger(app);
app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true)
            }
            callback(new Error('Not allowed by CORS'))
        },
        credentials: true 
    })
)

// Error handling middleware should be added after all routes
app.use(handleInvalidJson)

// Routes
const userRoutes = new UserRoutes()
app.use('/api/users', userRoutes.router)

const authRoutes = new AuthRoutes()
app.use('/api/auth', authRoutes.router)

export default app
