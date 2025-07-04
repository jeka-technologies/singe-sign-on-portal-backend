import Redis from 'ioredis'

export const redis = new Redis(process.env.REDIS_URL as string)

redis.on('error', (err) => {
    console.error('Redis connection error:', err)
})
