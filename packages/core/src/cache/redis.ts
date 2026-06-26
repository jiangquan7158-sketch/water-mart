import Redis, { type Redis as RedisType } from 'ioredis';

const globalForRedis = globalThis as unknown as {
  redis: RedisType | undefined;
};

function createRedisClient(): RedisType {
  const url = process.env.REDIS_URL;
  if (!url) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[Redis] REDIS_URL not set — using redis://localhost:6379 as fallback',
      );
      return new Redis('redis://localhost:6379', {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          if (times > 5) return null;
          return Math.min(times * 200, 2000);
        },
        lazyConnect: false,
      });
    }
    throw new Error('REDIS_URL environment variable is required');
  }

  return new Redis(url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 5) return null;
      return Math.min(times * 200, 2000);
    },
    lazyConnect: false,
  });
}

export const redis: RedisType =
  globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== 'production') {
  redis.on('error', (err) => {
    console.error('[Redis] Connection error:', err.message);
  });
  redis.on('connect', () => {
    console.log('[Redis] Connected');
  });
}

// Only cache in non-production (production may use cluster mode)
if (process.env.NODE_ENV !== 'production') {
  (globalThis as Record<string, unknown>).redis = redis;
}

// ─── Cache Helpers ──────────────────────────────────────────────────────────

const DEFAULT_TTL = 3600; // 1 hour in seconds

export async function cacheGet<T = unknown>(key: string): Promise<T | null> {
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as unknown as T;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number = DEFAULT_TTL,
): Promise<void> {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);

  if (ttlSeconds > 0) {
    await redis.setex(key, ttlSeconds, serialized);
  } else {
    await redis.set(key, serialized);
  }
}

export async function cacheDel(key: string): Promise<number> {
  return redis.del(key);
}

export async function cacheDelPattern(pattern: string): Promise<number> {
  const keys = await redis.keys(pattern);
  if (keys.length === 0) return 0;
  return redis.del(...keys);
}

export async function cacheHas(key: string): Promise<boolean> {
  const exists = await redis.exists(key);
  return exists === 1;
}

export async function cacheExpire(
  key: string,
  ttlSeconds: number,
): Promise<boolean> {
  const result = await redis.expire(key, ttlSeconds);
  return result === 1;
}

export async function cacheTtl(key: string): Promise<number> {
  return redis.ttl(key);
}

export async function cacheIncr(key: string): Promise<number> {
  return redis.incr(key);
}

export async function cacheFlush(): Promise<void> {
  await redis.flushdb();
}

export type { RedisType as RedisClient };
