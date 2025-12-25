import type { Store } from 'redux';
import { REXIOS_CACHE_KEY, rexiosCacheReducer } from './reducer';

export function ensureRexiosReducer(store: Store, key = REXIOS_CACHE_KEY) {
  const injectReducer = (store as any).injectReducer as
    | undefined
    | ((k: string, r: any) => void);
  if (!injectReducer) return false;
  injectReducer(key, rexiosCacheReducer);
  return true;
}
