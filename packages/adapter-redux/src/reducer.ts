import type { CacheEntry } from '@rexios/core';

export const REXIOS_CACHE_KEY = 'rexios-cache';

export type RexiosCacheState = {
  entries: Record<string, CacheEntry<any> | undefined>;
};

const initialState: RexiosCacheState = { entries: {} };

export const rexiosCacheActions = {
  setEntry: (key: string, entry: CacheEntry<any>) =>
    ({ type: 'REXIOS_CACHE/SET', payload: { key, entry } }) as const,
  patchEntry: (key: string, patch: Partial<CacheEntry<any>>) =>
    ({ type: 'REXIOS_CACHE/PATCH', payload: { key, patch } }) as const,
  removeEntry: (key: string) =>
    ({ type: 'REXIOS_CACHE/REMOVE', payload: { key } }) as const,
  reset: () => ({ type: 'REXIOS_CACHE/RESET' }) as const,
};

type Action =
  | ReturnType<typeof rexiosCacheActions.setEntry>
  | ReturnType<typeof rexiosCacheActions.patchEntry>
  | ReturnType<typeof rexiosCacheActions.removeEntry>
  | ReturnType<typeof rexiosCacheActions.reset>
  | { type: any; payload?: any };

export function rexiosCacheReducer(
  state: RexiosCacheState = initialState,
  action: Action & {
    payload:
      | { key: string; entry: CacheEntry<any> }
      | { key: string; patch: Partial<CacheEntry<any>> }
      | { key: string };
  }
): RexiosCacheState {
  switch (action.type) {
    case 'REXIOS_CACHE/SET': {
      const { key, entry } = action.payload;
      return { ...state, entries: { ...state.entries, [key]: entry } };
    }
    case 'REXIOS_CACHE/PATCH': {
      const { key, patch } = action.payload;
      const prev = state.entries[key] ?? { status: 'idle' };
      return {
        ...state,
        entries: { ...state.entries, [key]: { ...prev, ...patch } },
      };
    }
    case 'REXIOS_CACHE/REMOVE': {
      const { key } = action.payload;
      const next = { ...state.entries };
      delete next[key];
      return { ...state, entries: next };
    }
    case 'REXIOS_CACHE/RESET':
      return initialState;
    default:
      return state;
  }
}
