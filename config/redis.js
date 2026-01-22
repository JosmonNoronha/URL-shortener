const redis = require('redis');
require('dotenv').config();

// Create Redis client
const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
  password: process.env.REDIS_PASSWORD || undefined,
});

// Error handling
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('✓ Connected to Redis cache');
});

redisClient.on('ready', () => {
  console.log('✓ Redis client ready');
});

// Connect to Redis
(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error('Failed to connect to Redis:', err);
  }
})();

// Cache helper functions
const cache = {
  // Get value from cache
  get: async (key) => {
    try {
      const value = await redisClient.get(key);
      if (value) {
        console.log(`Cache HIT for key: ${key}`);
        return JSON.parse(value);
      }
      console.log(`Cache MISS for key: ${key}`);
      return null;
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  },

  // Set value in cache with TTL (Time To Live)
  set: async (key, value, ttl = parseInt(process.env.REDIS_TTL)) => {
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(value));
      console.log(`Cache SET for key: ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      console.error('Redis SET error:', error);
      return false;
    }
  },

  // Delete value from cache
  del: async (key) => {
    try {
      await redisClient.del(key);
      console.log(`Cache DELETE for key: ${key}`);
      return true;
    } catch (error) {
      console.error('Redis DELETE error:', error);
      return false;
    }
  },

  // Increment counter (useful for click counts)
  incr: async (key) => {
    try {
      const result = await redisClient.incr(key);
      return result;
    } catch (error) {
      console.error('Redis INCR error:', error);
      return null;
    }
  },

  // Check if key exists
  exists: async (key) => {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      return false;
    }
  },
};

module.exports = { redisClient, cache };