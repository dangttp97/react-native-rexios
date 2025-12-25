import type { CacheEntry } from './cache';
import type { Tag } from './tag';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
export type Headers = Record<string, string>;
export type Body = any;
export type QueryParams = Record<string, any>;

export type RequestOptions = {
  url: string;
  method: HttpMethod;
  headers?: Headers;
  body?: Body;
  query?: QueryParams;
  timeoutMs?: number;
  staleTime?: number;
  cacheTime?: number;
  dedupe?: boolean;
  serial?: boolean;
  background?: boolean;
  tags?: Tag[];
  version?: number;
  retry?: number | ((error: any, attempt: number) => boolean);
  retryCount?: number;
};

export type RequestError = {
  message: string;
  status: number;
  statusText: string;
  headers: Headers;
};

export type RexiosClient = {
  query: <T = any>(options: RequestOptions) => Promise<T>;
  mutate: <T = any>(options: RequestOptions) => Promise<T>;

  // cache access
  getCache(key: string): CacheEntry<any> | undefined;
  subscribe(key: string, cb: () => void): () => void;
  invalidate(tags: Tag[]): void;
};
