import { type Redis as RedisType } from 'ioredis';
export declare const redis: RedisType;
export declare function cacheGet<T = unknown>(key: string): Promise<T | null>;
export declare function cacheSet(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
export declare function cacheDel(key: string): Promise<number>;
export declare function cacheDelPattern(pattern: string): Promise<number>;
export declare function cacheHas(key: string): Promise<boolean>;
export declare function cacheExpire(key: string, ttlSeconds: number): Promise<boolean>;
export declare function cacheTtl(key: string): Promise<number>;
export declare function cacheIncr(key: string): Promise<number>;
export declare function cacheFlush(): Promise<void>;
export type { RedisType as RedisClient };
//# sourceMappingURL=redis.d.ts.map