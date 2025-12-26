import type { CacheStore, Tag } from '../types';

export const registerTags = (
  keyTags: Map<string, Tag[]>,
  tagIndex: Map<Tag, Set<string>>,
  key: string,
  tags?: Tag[]
) => {
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

export const invalidateKey = async (
  keyTags: Map<string, Tag[]>,
  tagIndex: Map<Tag, Set<string>>,
  cacheStore: CacheStore<any>,
  key: string
) => {
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

export const invalidateTags = async (
  keyTags: Map<string, Tag[]>,
  tagIndex: Map<Tag, Set<string>>,
  cacheStore: CacheStore<any>,
  tags: Tag[]
) => {
  for (const tag of tags) {
    const keys = tagIndex.get(tag);
    if (!keys) continue;
    for (const key of keys) {
      await invalidateKey(keyTags, tagIndex, cacheStore, key);
    }
    tagIndex.delete(tag);
  }
};
