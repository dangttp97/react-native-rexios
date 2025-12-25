import { createClient } from '../createClient';
import { InMemoryCacheStore } from '../../cache/InMemoryCacheStore';

describe('dedupe', () => {
  test('dedupe: concurrent calls share one fetch', async () => {
    let fetchCount = 0;
    const fetchMock: typeof fetch = async () => {
      fetchCount += 1;
      return new Response(JSON.stringify({ oke: true }), { status: 200 });
    };

    const cacheStore = new InMemoryCacheStore();
    const client = createClient({
      fetch: fetchMock,
      cacheStore,
      middlewares: [],
    });

    const request1 = client.query('dedupe-test', {
      request: { url: '/ping', method: 'GET', dedupe: true },
    });
    const request2 = client.query('dedupe-test', {
      request: { url: '/ping', method: 'GET', dedupe: true },
    });

    const [result1, result2] = await Promise.all([request1, request2]);

    expect(fetchCount).toBe(1);
    expect(result1).toEqual({ oke: true });
    expect(result2).toEqual({ oke: true });

    const entry = await client.getCache('dedupe-test:GET:/ping:');
    expect(entry?.status).toBe('success');
    expect(entry?.data).toEqual({ oke: true });
  });

  test('no dedupe: concurrent calls fire separately', async () => {
    let fetchCount = 0;
    const fetchMock: typeof fetch = async () => {
      fetchCount += 1;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };
    const client = createClient({ fetch: fetchMock });

    await Promise.all([
      client.query('no-dedupe', {
        request: { url: '/ping', method: 'GET', dedupe: false, serial: false },
      }),
      client.query('no-dedupe', {
        request: { url: '/ping', method: 'GET', dedupe: false, serial: false },
      }),
    ]);

    expect(fetchCount).toBe(2);
  });
});
