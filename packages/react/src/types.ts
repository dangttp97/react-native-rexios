import type { PropsWithChildren } from 'react';
import type { CacheStore } from '@rexios/core';
import type { RequestClient } from '@rexios/core';
import type { PersistConfig } from '@rexios/core';

export type RexiosProviderProps = PropsWithChildren<{
  client: RequestClient;
  cacheStore?: CacheStore<any>;
  persist?: PersistConfig;
  suspendWhileHydrating?: boolean;
}>;

export type RexiosContextType = {
  client: RequestClient;
};
