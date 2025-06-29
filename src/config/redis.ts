import Redis from "ioredis";

export const redis = new Redis()

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});