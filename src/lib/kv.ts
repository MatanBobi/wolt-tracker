/**
 * Minimal KV adapter that mirrors the subset of Redis methods we use.
 * In production (KV_REST_API_URL set) → delegates to @upstash/redis.
 * In local dev (no KV_REST_API_URL)   → uses an in-memory Map.
 */

export interface KVAdapter {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
  del(key: string): Promise<void>;
  hgetall<T>(key: string): Promise<T | null>;
  hget<T>(key: string, field: string): Promise<T | null>;
  hset(key: string, values: Record<string, unknown>): Promise<void>;
  hdel(key: string, ...fields: string[]): Promise<void>;
  sadd(key: string, ...members: string[]): Promise<void>;
  srem(key: string, ...members: string[]): Promise<void>;
  smembers(key: string): Promise<string[]>;
}

// ─── In-memory implementation ───

class InMemoryKV implements KVAdapter {
  private store = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | null> {
    return (this.store.get(key) as T) ?? null;
  }

  async set(key: string, value: unknown): Promise<void> {
    this.store.set(key, value);
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async hgetall<T>(key: string): Promise<T | null> {
    const hash = this.store.get(key) as Record<string, unknown> | undefined;
    if (!hash || Object.keys(hash).length === 0) return null;
    return hash as T;
  }

  async hget<T>(key: string, field: string): Promise<T | null> {
    const hash = this.store.get(key) as Record<string, unknown> | undefined;
    if (!hash) return null;
    return (hash[field] as T) ?? null;
  }

  async hset(key: string, values: Record<string, unknown>): Promise<void> {
    const hash =
      (this.store.get(key) as Record<string, unknown>) ?? {};
    Object.assign(hash, values);
    this.store.set(key, hash);
  }

  async hdel(key: string, ...fields: string[]): Promise<void> {
    const hash = this.store.get(key) as Record<string, unknown> | undefined;
    if (!hash) return;
    for (const field of fields) {
      delete hash[field];
    }
  }

  async sadd(key: string, ...members: string[]): Promise<void> {
    let set = this.store.get(key) as Set<string> | undefined;
    if (!set) {
      set = new Set();
      this.store.set(key, set);
    }
    for (const m of members) set.add(m);
  }

  async srem(key: string, ...members: string[]): Promise<void> {
    const set = this.store.get(key) as Set<string> | undefined;
    if (!set) return;
    for (const m of members) set.delete(m);
  }

  async smembers(key: string): Promise<string[]> {
    const set = this.store.get(key) as Set<string> | undefined;
    if (!set) return [];
    return Array.from(set);
  }
}

// ─── Upstash Redis wrapper ───

class UpstashRedisAdapter implements KVAdapter {
  private client: import("@upstash/redis").Redis;

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Redis } = require("@upstash/redis") as typeof import("@upstash/redis");
    this.client = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    return this.client.get<T>(key);
  }

  async set(key: string, value: unknown): Promise<void> {
    await this.client.set(key, value);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async hgetall<T>(key: string): Promise<T | null> {
    return this.client.hgetall(key) as Promise<T | null>;
  }

  async hget<T>(key: string, field: string): Promise<T | null> {
    return this.client.hget(key, field) as Promise<T | null>;
  }

  async hset(key: string, values: Record<string, unknown>): Promise<void> {
    await this.client.hset(key, values);
  }

  async hdel(key: string, ...fields: string[]): Promise<void> {
    await this.client.hdel(key, ...(fields as [string, ...string[]]));
  }

  async sadd(key: string, ...members: string[]): Promise<void> {
    await this.client.sadd(key, ...(members as [string, ...string[]]));
  }

  async srem(key: string, ...members: string[]): Promise<void> {
    await this.client.srem(key, ...(members as [string, ...string[]]));
  }

  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }
}

// ─── Export singleton ───

const useVercelKV = !!process.env.KV_REST_API_URL;

export const db: KVAdapter = useVercelKV
  ? new UpstashRedisAdapter()
  : new InMemoryKV();

if (!useVercelKV) {
  console.log("[KV] Using in-memory store (set KV_REST_API_URL for Upstash Redis)");
}
