import { createZustandStore } from '../index';

describe('zustand cache store', () => {
  test('set and get', async () => {
    const store = createZustandStore();
    await store.set('key', { status: 'success', data: 1 });
    const entry = await store.get('key');
    expect(entry?.data).toBe(1);
    expect(entry?.status).toBe('success');
  });

  test('patch', async () => {
    const store = createZustandStore();
    await store.set('key', { status: 'success', data: 1 });
    await store.patch('key', { data: 2 });
    const entry = await store.get('key');
    expect(entry?.data).toBe(2);
  });

  test('subscribe', async () => {
    const store = createZustandStore();
    const calls: number[] = [];
    const unsubscribe = store.subscribe('key', () => {
      calls.push(1);
    });
    await store.set('key', { status: 'success', data: 1 });
    await store.patch('key', { data: 2 });
    unsubscribe();
    await store.patch('key', { data: 3 });
    expect(calls.length).toBe(2);
  });

  test('clear', async () => {
    const store = createZustandStore();
    await store.set('key', { status: 'success', data: 1 });
    await store.clear();
    const entry = await store.get('key');
    expect(entry).toBeUndefined();
  });
});
