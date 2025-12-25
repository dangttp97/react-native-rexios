import { InMemoryCacheStore } from '../cache/InMemoryCacheStore';
import { executeWithMiddlewares } from '../middleware-compose';
import type {
  MutateRequestClientOptions,
  QueryRequestClientOptions,
  RequestClient,
  RequestClientConfig,
} from '../types/client';
import type { CacheEntry } from '../types/cache';
import type { MiddlewareContext } from '../types/middleware';
import type { RequestOptions } from '../types/request';
import type { Tag } from '../types/tag';

type FetchFn = typeof fetch;

const DEFAULT_TIMEOUT = 60_000;

const withTimeout = (fetchFn: FetchFn, timeoutMs?: number): FetchFn => {
  if (!timeoutMs) return fetchFn;
  return async (input, init) => {
    const controller =
      typeof AbortController !== 'undefined'
        ? new AbortController()
        : undefined;
    const timer = setTimeout(() => controller?.abort(), timeoutMs);
    return fetchFn(input, { ...init, signal: controller?.signal }).finally(() =>
      clearTimeout(timer)
    );
  };
};

const joinUrl = (baseURL: string | undefined, url: string): string => {
  if (!baseURL) return url;
  const hasProtocol = /^https?:\/\//i.test(url);
  if (hasProtocol) return url;
  const normalizedBase = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
  const normalizedPath = url.startsWith('/') ? url.slice(1) : url;
  return `${normalizedBase}/${normalizedPath}`;
};

const appendQuery = (url: string, query?: Record<string, any>): string => {
  if (!query) return url;
  const search = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((v) => search.append(key, String(v)));
    } else {
      search.append(key, String(value));
    }
  });
  const qs = search.toString();
  if (!qs) return url;
  return url.includes('?') ? `${url}&${qs}` : `${url}?${qs}`;
};

const isFresh = (
  entry: CacheEntry<any> | undefined,
  staleTime?: number,
  now = Date.now()
) => {
  if (!entry || entry.status !== 'success') return false;
  if (!entry.updatedAt) return false;
  if (staleTime === undefined) return false;
  return now - entry.updatedAt < staleTime;
};

const isExpired = (
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

const buildCacheKey = (
  name: string,
  request: { method?: string; url: string; query?: Record<string, any> }
) => {
  const method = request.method ?? 'GET';
  const query = request.query ? JSON.stringify(request.query) : '';
  return `${name}:${method}:${request.url}:${query}`;
};

const shouldRetry = (
  retry: QueryRequestClientOptions['request']['retry'],
  error: any,
  attempt: number
) => {
  if (typeof retry === 'function') {
    return retry(error, attempt);
  }
  if (typeof retry === 'number') {
    return attempt < retry;
  }
  return false;
};

export const createClient = (
  config: RequestClientConfig<any>
): RequestClient => {
  const fetchFn: FetchFn | undefined = config.fetch ?? globalThis.fetch;
  if (!fetchFn) {
    throw new Error(
      'fetch function is required, please provide a fetch function or ensure global fetch is available'
    );
  }

  const cacheStore = config.cacheStore ?? new InMemoryCacheStore<any>();
  const middlewares = config.middlewares ?? [];
  const pending = new Map<string, Promise<any>>();
  const tagIndex = new Map<Tag, Set<string>>();
  const keyTags = new Map<string, Tag[]>();

  const registerTags = (key: string, tags?: Tag[]) => {
    const prevTags = keyTags.get(key);
    if (prevTags) {
      prevTags.forEach((tag) => tagIndex.get(tag)?.delete(key));
    }
    if (!tags || !tags.length) {
      keyTags.delete(key);
      return;
    }
    keyTags.set(key, tags);
    tags.forEach((tag) => {
      let keys = tagIndex.get(tag);
      if (!keys) {
        keys = new Set();
        tagIndex.set(tag, keys);
      }
      keys.add(key);
    });
  };

  const invalidateKey = async (key: string) => {
    const prevTags = keyTags.get(key);
    if (prevTags) {
      prevTags.forEach((tag) => tagIndex.get(tag)?.delete(key));
    }
    keyTags.delete(key);
    await cacheStore.patch(key, {
      status: 'idle',
      data: undefined,
      error: undefined,
      expiresAt: 0,
    });
  };

  const invalidateTags = async (tags: Tag[]) => {
    for (const tag of tags) {
      const keys = tagIndex.get(tag);
      if (!keys) continue;
      for (const key of keys) {
        await invalidateKey(key);
      }
      tagIndex.delete(tag);
    }
  };

  const runWithPending = async <T>(
    key: string,
    dedupe: boolean,
    serial: boolean,
    work: () => Promise<T>
  ) => {
    if (serial && pending.has(key)) {
      try {
        await pending.get(key);
      } catch {
        // ignore previous error, run again
      }
    }
    if (dedupe && pending.has(key)) {
      return pending.get(key) as Promise<T>;
    }
    const promise = work().finally(() => pending.delete(key));
    pending.set(key, promise);
    return promise;
  };

  const performRequest = async <T>(
    key: string,
    requestOptions: QueryRequestClientOptions['request'],
    tags?: Tag[]
  ): Promise<T> => {
    const now = Date.now();
    const staleTime = requestOptions.staleTime ?? 0;
    const cacheTime = requestOptions.cacheTime;
    const dedupe = requestOptions.dedupe ?? true;
    const serial = requestOptions.serial ?? false;
    const background = requestOptions.background ?? false;
    const existing = await cacheStore.get(key);

    if (isExpired(existing, cacheTime, now)) {
      await cacheStore.patch(key, {
        status: 'idle',
        data: undefined,
        error: undefined,
        expiresAt: undefined,
        updatedAt: undefined,
      });
    } else if (isFresh(existing, staleTime, now)) {
      return existing!.data as T;
    } else if (background && existing?.data !== undefined) {
      return runWithPending(key, dedupe, serial, () =>
        fetchAndCache<T>(
          key,
          {
            ...requestOptions,
            method: requestOptions.method ?? 'GET',
          } as RequestOptions,
          tags
        )
      );
      // return existing.data as T;
    }

    return runWithPending(key, dedupe, serial, () =>
      fetchAndCache<T>(
        key,
        {
          ...requestOptions,
          method: requestOptions.method ?? 'GET',
        } as RequestOptions,
        tags
      )
    );
  };

  const fetchAndCache = async <T>(
    key: string,
    requestOptions: RequestOptions,
    tags?: Tag[]
  ) => {
    const method = requestOptions.method ?? 'GET';
    const mergedHeaders = { ...config.headers, ...requestOptions.headers };
    const url = appendQuery(
      joinUrl(config.baseURL, requestOptions.url),
      requestOptions.query
    );
    const timeoutMs =
      requestOptions.timeoutMs ?? config.timeoutMs ?? DEFAULT_TIMEOUT;
    const fetchWithTimeout = withTimeout(fetchFn, timeoutMs);

    const execute = async (): Promise<T> => {
      let attempt = 0;

      while (true) {
        const ctx: MiddlewareContext<T> = {
          url,
          method,
          headers: mergedHeaders,
          body: requestOptions.body,
          retryCount: attempt,
        };
        try {
          const result = await executeWithMiddlewares<T>(
            ctx,
            middlewares,
            (nextCtx) =>
              fetchWithTimeout(nextCtx.url, {
                method: nextCtx.method,
                headers: nextCtx.headers,
                body: nextCtx.body,
              })
          );
          return result;
        } catch (error) {
          if (!shouldRetry(requestOptions.retry, error, attempt)) {
            throw error;
          }
          attempt += 1;
        }
      }
    };

    await cacheStore.set(key, {
      status: 'loading',
      tags,
      updatedAt: Date.now(),
      version: requestOptions.version,
    });

    try {
      const data = await execute();
      const updatedAt = Date.now();
      const entry: CacheEntry<T> = {
        status: 'success',
        data,
        updatedAt,
        tags,
        version: requestOptions.version,
        expiresAt:
          requestOptions.cacheTime !== undefined
            ? updatedAt + requestOptions.cacheTime
            : undefined,
      };
      await cacheStore.set(key, entry);
      registerTags(key, tags);
      return data;
    } catch (error) {
      await cacheStore.set(key, {
        status: 'error',
        error: error as Error,
        updatedAt: Date.now(),
        tags,
        version: requestOptions.version,
      });
      throw error;
    }
  };

  return {
    query: async <T = any>(
      name: string,
      options: QueryRequestClientOptions
    ): Promise<T> => {
      const request = { ...options.request, method: 'GET' as const };
      const key = buildCacheKey(name, request);
      return performRequest<T>(key, request, options.provideTags);
    },
    mutate: async <T = any>(
      name: string,
      options: MutateRequestClientOptions
    ): Promise<T> => {
      const key = buildCacheKey(name, options.request);
      const result = await fetchAndCache<T>(
        key,
        options.request,
        options.provideTags
      );
      if (options.invalidateTags?.length) {
        await invalidateTags(options.invalidateTags);
      }
      return result;
    },
    getCache: async <T = any>(key: string) => {
      return (await cacheStore.get(key)) as CacheEntry<T> | undefined;
    },
    subscribe: (key: string, cb: () => void) => cacheStore.subscribe(key, cb),
    invalidateTags,
    invalidateKey,
    clearCache: async () => {
      pending.clear();
      tagIndex.clear();
      keyTags.clear();
      await cacheStore.clear();
    },
  };
};
