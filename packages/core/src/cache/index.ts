import type { CacheEntry } from '../types';

export * from './InMemoryCacheStore';

export const isFresh = (
  entry: CacheEntry<any> | undefined,
  staleTime?: number,
  now = Date.now()
) => {
  if (!entry || entry.status !== 'success') return false;
  if (!entry.updatedAt) return false;
  if (staleTime === undefined) return false;
  return now - entry.updatedAt < staleTime;
};

export const isExpired = (
  entry: CacheEntry<any> | undefined,
  cacheTime?: number,
  now = Date.now()
) => {
  if (!entry || !entry.updatedAt) return false;
  if (entry.expiresAt !== undefined) {
    return now > entry.expiresAt;
  }
  if (cacheTime === undefined) return false;
  return now - entry.updatedAt > cacheTime;
};

const hash = (value: any) => {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export const buildCacheKey = (
  name: string,
  request: {
    method?: string;
    url: string;
    query?: Record<string, any>;
    body?: any;
    queryKey?: string;
  }
) => {
  if (request.queryKey) return request.queryKey;
  const method = request.method ?? 'GET';
  const query = request.query ? hash(request.query) : '';
  const body = request.body ? hash(request.body) : '';
  return `${name}:${method}:${request.url}:${query}:${body}`;
};
