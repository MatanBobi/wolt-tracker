/**
 * Minimal KV adapter that mirrors the subset of @vercel/kv methods we use.
 * In production (KV_REST_API_URL set) → delegates to @vercel/kv.
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

// ─── Vercel KV wrapper ───

class VercelKVAdapter implements KVAdapter {
  private kvPromise: Promise<typeof import("@vercel/kv")>;

  constructor() {
    // Dynamic import so @vercel/kv doesn't fail at module load when env vars are missing
    this.kvPromise = import("@vercel/kv");
  }

  private async client() {
    const mod = await this.kvPromise;
    return mod.kv;
  }

  async get<T>(key: string): Promise<T | null> {
    const kv = await this.client();
    return kv.get<T>(key);
  }

  async set(key: string, value: unknown): Promise<void> {
    const kv = await this.client();
    await kv.set(key, value);
  }

  async del(key: string): Promise<void> {
    const kv = await this.client();
    await kv.del(key);
  }

  async hgetall<T>(key: string): Promise<T | null> {
    const kv = await this.client();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return kv.hgetall(key) as Promise<T | null>;
  }

  async hget<T>(key: string, field: string): Promise<T | null> {
    const kv = await this.client();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return kv.hget(key, field) as Promise<T | null>;
  }

  async hset(key: string, values: Record<string, unknown>): Promise<void> {
    const kv = await this.client();
    await kv.hset(key, values);
  }

  async hdel(key: string, ...fields: string[]): Promise<void> {
    const kv = await this.client();
    await kv.hdel(key, ...(fields as [string, ...string[]]));
  }

  async sadd(key: string, ...members: string[]): Promise<void> {
    const kv = await this.client();
    await kv.sadd(key, ...(members as [string, ...string[]]));
  }

  async srem(key: string, ...members: string[]): Promise<void> {
    const kv = await this.client();
    await kv.srem(key, ...(members as [string, ...string[]]));
  }

  async smembers(key: string): Promise<string[]> {
    const kv = await this.client();
    return kv.smembers(key);
  }
}

// ─── Export singleton ───

const useVercelKV = !!process.env.KV_REST_API_URL;

export const db: KVAdapter = useVercelKV
  ? new VercelKVAdapter()
  : new InMemoryKV();

if (!useVercelKV) {
  console.log("[KV] Using in-memory store (set KV_REST_API_URL for Vercel KV)");
}
