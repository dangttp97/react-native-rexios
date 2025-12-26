import type {
  QueryRequestClientOptions,
  RequestClientConfig,
} from '../types/client';
import type { Tag } from '../types/tag';
import type { CacheEntry, CacheStore } from '../types/cache';
import type { RequestOptions } from '../types/request';
import { isExpired, isFresh } from '../cache';
import { registerTags } from '../helpers/tags.helper';
import { joinUrl } from '../helpers/string.helper';
import { executeWithMiddlewares } from '../middleware-compose';
import type { Middleware, MiddlewareContext } from '../types';
import type { FetchFn } from '../types/fetch';
import {
  withTimeoutAndSignal,
  appendQuery,
  shouldRetry,
} from '../helpers/fetch.helper';
import { parseResponse } from '../helpers/response.helper';

const DEFAULT_TIMEOUT = 60_000;

export const runWithPending = async <T>(
  pending: Map<string, Promise<any>>,
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

export const fetchAndCache = async <T>(
  cacheStore: CacheStore<any>,
  keyTags: Map<string, Tag[]>,
  tagIndex: Map<Tag, Set<string>>,
  middlewares: Middleware<T>[],
  fetchFn: FetchFn,
  config: RequestClientConfig<T>,
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
  const fetchWithTimeout = withTimeoutAndSignal(fetchFn, timeoutMs);

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
              signal: (requestOptions as any).signal,
            })
        );
        if (result instanceof Response) {
          return parseResponse(result, requestOptions);
        }
        return result;
      } catch (error) {
        if (!shouldRetry(requestOptions.retry, error, attempt)) {
          throw error;
        }
        const delay =
          typeof requestOptions.retryDelay === 'function'
            ? requestOptions.retryDelay(attempt)
            : requestOptions.retryDelay;
        if (delay && delay > 0) {
          await new Promise((res) => setTimeout(res, delay));
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
    registerTags(keyTags, tagIndex, key, tags);
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

export const performRequest = async <T>(
  cacheStore: CacheStore<any>,
  keyTags: Map<string, Tag[]>,
  tagIndex: Map<Tag, Set<string>>,
  middlewares: Middleware<T>[],
  fetchFn: FetchFn,
  config: RequestClientConfig<T>,
  pending: Map<string, Promise<any>>,
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
    runWithPending(pending, key, dedupe, serial, () =>
      fetchAndCache<T>(
        cacheStore,
        keyTags,
        tagIndex,
        middlewares,
        fetchFn,
        config,
        key,
        {
          ...requestOptions,
          method: requestOptions.method ?? 'GET',
        } as RequestOptions,
        tags
      )
    ).catch(() => {});
    return existing.data as T;
  }

  return runWithPending(pending, key, dedupe, serial, () =>
    fetchAndCache<T>(
      cacheStore,
      keyTags,
      tagIndex,
      middlewares,
      fetchFn,
      config,
      key,
      {
        ...requestOptions,
        method: requestOptions.method ?? 'GET',
      } as RequestOptions,
      tags
    )
  );
};
