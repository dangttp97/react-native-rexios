import type { CacheEntry, CacheKey, CacheStore } from '../types/cache';

export class InMemoryCacheStore<T> implements CacheStore<T> {
  private map = new Map<CacheKey, CacheEntry<T>>();
  private listeners = new Map<string, Set<() => void>>();

  async get(key: CacheKey): Promise<CacheEntry<T> | undefined> {
    return this.map.get(key);
  }

  async set(key: CacheKey, entry: CacheEntry<T>): Promise<void> {
    this.map.set(key, entry);
    this.emit(key);
  }

  async patch(key: CacheKey, partial: Partial<CacheEntry<T>>): Promise<void> {
    const entry = this.map.get(key);
    if (!entry) return;
    this.map.set(key, { ...entry, ...partial });
    this.emit(key);
  }

  subscribe(key: CacheKey, callback: () => void): () => void {
    let listeners = this.listeners.get(key);
    if (!listeners) {
      listeners = new Set();
      this.listeners.set(key, listeners);
    }
    listeners.add(callback);
    return () => listeners?.delete(callback);
  }

  async clear(): Promise<void> {
    this.map.clear();
    this.listeners.clear();
  }

  ///Notify listeners when the cache is updated
  private emit(key: CacheKey): void {
    const listeners = this.listeners.get(key);
    if (!listeners) return;
    listeners.forEach((listener) => listener());
  }
}
