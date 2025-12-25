import { createStore, combineReducers } from 'redux';
import { createReduxCacheStore } from '../index';
import { rexiosCacheReducer, REXIOS_CACHE_KEY } from '../reducer';

describe('redux cache store', () => {
  const setup = () => {
    const store = createStore(
      combineReducers({ [REXIOS_CACHE_KEY]: rexiosCacheReducer })
    );
    const cacheStore = createReduxCacheStore({ store });
    return { store, cacheStore };
  };

  test('set and get', async () => {
    const { cacheStore } = setup();
    await cacheStore.set('key', { status: 'success', data: 1 });
    const entry = await cacheStore.get('key');
    expect(entry?.data).toBe(1);
    expect(entry?.status).toBe('success');
  });

  test('patch', async () => {
    const { cacheStore } = setup();
    await cacheStore.set('key', { status: 'success', data: 1 });
    await cacheStore.patch('key', { data: 2 });
    const entry = await cacheStore.get('key');
    expect(entry?.data).toBe(2);
    expect(entry?.status).toBe('success');
  });

  test('subscribe', async () => {
    const { cacheStore } = setup();
    const calls: Array<any> = [];
    const unsubscribe = cacheStore.subscribe('key', () => {
      calls.push(true);
    });
    await cacheStore.set('key', { status: 'success', data: 1 });
    await cacheStore.patch('key', { data: 2 });
    unsubscribe();
    await cacheStore.patch('key', { data: 3 });
    expect(calls.length).toBe(2);
  });

  test('clear resets state', async () => {
    const { cacheStore } = setup();
    await cacheStore.set('key', { status: 'success', data: 1 });
    await cacheStore.clear();
    const entry = await cacheStore.get('key');
    expect(entry).toBeUndefined();
  });
});
