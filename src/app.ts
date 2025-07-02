import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { handleInvalidJson } from './middlewares'
import { AuthRoutes, UserRoutes } from './routes'

dotenv.config()

const allowedOrigins = [
    'http://localhost:5173', // your frontend (dev)
    'https://your-frontend.com', // your prod frontend
    'http://localhost:8000' // your internal SSO
]

const app = express()
app.use(express.json())
app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true)
            }
            callback(new Error('Not allowed by CORS'))
        },
        credentials: true // 🔥 This is important for sending cookies!
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
