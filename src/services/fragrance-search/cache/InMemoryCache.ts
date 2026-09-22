import { CacheService } from './CacheService';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class InMemoryCacheService implements CacheService {
  private cache = new Map<string, CacheEntry<unknown>>();
  private maxItems: number;
  private defaultTtlMs: number;

  constructor(maxItems = 500, defaultTtlSeconds = 7 * 24 * 60 * 60) {
    this.maxItems = maxItems;
    this.defaultTtlMs = defaultTtlSeconds * 1000;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Refresh position for LRU
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttlMs = ttlSeconds ? ttlSeconds * 1000 : this.defaultTtlMs;
    const expiresAt = Date.now() + ttlMs;

    // LRU eviction if reached max items
    if (this.cache.size >= this.maxItems) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, { value, expiresAt });
  }

  async has(key: string): Promise<boolean> {
    const val = await this.get(key);
    return val !== null;
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}

// Singleton global cache instance across server requests
const globalCache = new InMemoryCacheService();
export default globalCache;
