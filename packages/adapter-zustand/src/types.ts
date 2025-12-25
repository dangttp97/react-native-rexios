import type { CacheEntry } from '@rexios/core';

export type ZustandStore = {
  cache: Record<string, CacheEntry<any>>;
};
