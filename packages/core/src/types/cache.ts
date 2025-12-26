import type { Tag } from './tag';

export type CacheKey = string;

export type CacheStatus = 'idle' | 'loading' | 'success' | 'error';

export type CacheEntry<T> = {
  status: CacheStatus;
  data?: T;
  error?: Error;
  expiresAt?: number;
  updatedAt?: number;
  tags?: Tag[];
  version?: number;
};

export type CacheStore<T> = {
  ///Get the cache entry
  get: (key: CacheKey) => Promise<CacheEntry<T> | undefined>;
  ///Set the cache entry
  set: (key: CacheKey, entry: CacheEntry<T>) => Promise<void>;
  ///Update the cache entry partially
  patch: (key: CacheKey, patch: Partial<CacheEntry<T>>) => Promise<void>;
  ///Notify when the cache is updated
  subscribe: (key: CacheKey, callback: () => void) => () => void;
  ///Clear the cache
  clear: () => Promise<void>;
};

export type CachePolicy = {
  cacheKey?: CacheKey;
  stateTimeMs?: number;
  cacheTimeMs?: number;
  background?: boolean;
  invalidateTags?: Tag[];
};
