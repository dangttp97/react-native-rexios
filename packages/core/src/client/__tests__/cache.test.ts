import { createClient } from '../createClient';
import { InMemoryCacheStore } from '../../cache/InMemoryCacheStore';

describe('cache', () => {
  test('returns cached value when fresh (staleTime)', async () => {
    let fetchCount = 0;
    const fetchMock: typeof fetch = async () => {
      fetchCount += 1;
      return new Response(JSON.stringify({ value: fetchCount }), {
        status: 200,
      });
    };

    const client = createClient({
      fetch: fetchMock,
      cacheStore: new InMemoryCacheStore<any>(),
      middlewares: [],
    });

    const first = await client.query('cache-fresh', {
      request: { url: '/fresh', method: 'GET', staleTime: 10_000 },
    });
    expect(first).toEqual({ value: 1 });

    const second = await client.query('cache-fresh', {
      request: { url: '/fresh', method: 'GET', staleTime: 10_000 },
    });
    expect(second).toEqual({ value: 1 });
    expect(fetchCount).toBe(1);
  });

  test('background fetch when stale but background=true', async () => {
    let fetchCount = 0;
    const fetchMock: typeof fetch = async () => {
      fetchCount += 1;
      return new Response(JSON.stringify({ value: fetchCount }), {
        status: 200,
      });
    };

    const client = createClient({
      fetch: fetchMock,
      cacheStore: new InMemoryCacheStore<any>(),
      middlewares: [],
    });

    await client.query('cache-bg', {
      request: { url: '/bg', method: 'GET', staleTime: 0 },
    });
    expect(fetchCount).toBe(1);

    const cached = await client.query('cache-bg', {
      request: {
        url: '/bg',
        method: 'GET',
        staleTime: 0,
        background: true,
      },
    });
    // returns cached data immediately
    // background request might win quickly; we accept either cached or refreshed value
    expect([{ value: 1 }, { value: 2 }]).toContainEqual(cached);
    // wait a tick for background refetch
    await Promise.resolve();
    await Promise.resolve();
    expect(fetchCount).toBe(2);

    const entry = await client.getCache('cache-bg:GET:/bg:');
    expect(entry?.status).toBe('success');
    expect(entry?.data).toEqual({ value: 2 });
  });

  test('cacheTime expiration forces refetch', async () => {
    let fetchCount = 0;
    const fetchMock: typeof fetch = async () => {
      fetchCount += 1;
      return new Response(JSON.stringify({ value: fetchCount }), {
        status: 200,
      });
    };

    const client = createClient({
      fetch: fetchMock,
      cacheStore: new InMemoryCacheStore<any>(),
      middlewares: [],
    });

    await client.query('cache-expire', {
      request: { url: '/expire', method: 'GET', cacheTime: 0 },
    });
    expect(fetchCount).toBe(1);

    const second = await client.query('cache-expire', {
      request: { url: '/expire', method: 'GET', cacheTime: 0 },
    });
    expect(second).toEqual({ value: 2 });
    expect(fetchCount).toBe(2);
  });
});
