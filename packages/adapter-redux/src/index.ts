import type { Store } from 'redux';
import { rexiosCacheActions, REXIOS_CACHE_KEY } from './reducer';
import type { CacheEntry, CacheStore } from '@rexios/core';

export function createReduxCacheStore(opts: {
  store: Store;
  reducerKey?: string;
}): CacheStore<any> {
  const reducerKey = opts.reducerKey ?? REXIOS_CACHE_KEY;
  const store = opts.store;

  const selectEntry = (state: any, key: string): CacheEntry<any> | undefined =>
    state?.[reducerKey]?.entries?.[key];

  return {
    async get(key) {
      return selectEntry(store.getState(), key);
    },
    async set(key, entry) {
      store.dispatch(rexiosCacheActions.setEntry(key, entry) as any);
    },
    async patch(key, patch) {
      store.dispatch(rexiosCacheActions.patchEntry(key, patch) as any);
    },
    subscribe(key, cb) {
      let prev = selectEntry(store.getState(), key);
      return store.subscribe(() => {
        const next = selectEntry(store.getState(), key);
        if (next !== prev) {
          prev = next;
          cb();
        }
      });
    },
    async clear() {
      store.dispatch(rexiosCacheActions.reset() as any);
    },
  };
}

export * from './reducer';
export * from './createInjectableStore';
export * from './ensureRexiosReducer';
