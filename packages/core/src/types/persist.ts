import type { CacheEntry } from './cache';

export type PersistAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  clear: () => Promise<void>;
};

export type PersistConfig = {
  adapter: PersistAdapter;

  /** Key root trong storage */
  key: string;

  /** Persist chỉ những query keys match rule */
  whitelist?: (string | RegExp | ((key: string) => boolean))[];

  /** Nếu không set whitelist thì blacklist dùng để loại trừ */
  blacklist?: (string | RegExp | ((key: string) => boolean))[];

  /** Chỉ persist entry success */
  persistOnlySuccess?: boolean; // default true

  /** Serialize/deserialize tuỳ chỉnh (mặc định JSON) */
  serialize?: (snapshot: PersistSnapshot) => string;
  deserialize?: (raw: string) => PersistSnapshot;

  /** Debounce để tránh ghi disk liên tục */
  debounceMs?: number; // default 300

  /** Bỏ cache quá cũ khi hydrate */
  maxAgeMs?: number; // default 7 * 24h

  /** TTL override khi hydrate (optional) */
  hydrateTtlMs?: number; // optional

  /** Versioning để clear cache khi schema đổi */
  version?: number; // default 1
  migrate?: (snapshot: PersistSnapshot, fromVersion: number) => PersistSnapshot;
};

export type PersistSnapshot = {
  version: number;
  savedAt: number;
  entries: Record<string, CacheEntry<any>>;
};
