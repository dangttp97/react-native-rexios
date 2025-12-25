import type { CacheEntry, CacheStore } from './cache';
import type { Middleware } from './middleware';
import type { PersistConfig } from './persist';
import type { Tag } from './tag';
import type { Headers, RequestOptions } from './request';

export type RequestClientConfig<T = any> = {
  baseURL?: string;
  headers?: Headers;
  middlewares?: Middleware<T>[];
  fetch?: typeof fetch;
  timeoutMs?: number;
  cacheStore?: CacheStore<any>;
  persist?: PersistConfig;
};

export type QueryRequestClientOptions = {
  request: Omit<RequestOptions, 'method'> & { method?: 'GET' };
  provideTags?: Tag[];
};

export type MutateRequestClientOptions = {
  request: RequestOptions & {
    method: 'POST' | 'PUT' | 'DELETE';
  };
  provideTags?: Tag[];
  invalidateTags?: Tag[];
};

export type RequestClient = {
  query: <T = any>(
    name: string,
    options: QueryRequestClientOptions
  ) => Promise<T>;
  mutate: <T = any>(
    name: string,
    options: MutateRequestClientOptions
  ) => Promise<T>;
  getCache: <T = any>(key: string) => Promise<CacheEntry<T> | undefined>;
  subscribe: (key: string, cb: () => void) => () => void;
  invalidateTags: (tags: Tag[]) => Promise<void>;
  invalidateKey: (key: string) => Promise<void>;
  clearCache: () => Promise<void>;
};
