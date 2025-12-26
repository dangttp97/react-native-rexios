import { InMemoryCacheStore } from '../cache/InMemoryCacheStore';
import type {
  MutateRequestClientOptions,
  QueryRequestClientOptions,
  RequestClient,
  RequestClientConfig,
} from '../types/client';
import type { CacheEntry } from '../types/cache';
import type { Tag } from '../types/tag';
import {
  invalidateKey as invalidateKeyHelper,
  invalidateTags as invalidateTagsHelper,
} from '../helpers/tags.helper';
import { buildCacheKey } from '../cache';
import { fetchAndCache, performRequest } from '../request/request';
import type { FetchFn } from '../types/fetch';

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

  const query = async <T = any>(
    name: string,
    options: QueryRequestClientOptions
  ) => {
    const request = { ...options.request, method: 'GET' as const };
    const key = buildCacheKey(name, request);
    return performRequest<T>(
      cacheStore,
      keyTags,
      tagIndex,
      middlewares,
      fetchFn,
      config,
      pending,
      key,
      request,
      options.provideTags
    );
  };

  const mutate = async <T = any>(
    name: string,
    options: MutateRequestClientOptions
  ) => {
    const key = buildCacheKey(name, options.request);
    const result = await fetchAndCache<T>(
      cacheStore,
      keyTags,
      tagIndex,
      middlewares,
      fetchFn,
      config,
      key,
      options.request,
      options.provideTags
    );
    if (options.invalidateTags?.length) {
      await invalidateTags(options.invalidateTags);
    }
    return result;
  };

  const getCache = async <T = any>(key: string) => {
    return (await cacheStore.get(key)) as CacheEntry<T> | undefined;
  };

  const subscribe = (key: string, cb: () => void) =>
    cacheStore.subscribe(key, cb);

  const invalidateTags = async (tags: Tag[]) => {
    await invalidateTagsHelper(keyTags, tagIndex, cacheStore, tags);
  };

  const invalidateKey = async (key: string) => {
    await invalidateKeyHelper(keyTags, tagIndex, cacheStore, key);
  };

  const clearCache = async () => {
    pending.clear();
    tagIndex.clear();
    keyTags.clear();
    await cacheStore.clear();
  };

  return {
    query,
    mutate,
    getCache,
    subscribe,
    invalidateTags,
    invalidateKey,
    clearCache,
  };
};
