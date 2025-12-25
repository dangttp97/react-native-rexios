import { createClient } from '../createClient';
import { InMemoryCacheStore } from '../../cache/InMemoryCacheStore';

describe('state machine', () => {
  test('transition: loading to success', async () => {
    let resolveFetch: (value: Response) => void;
    const fetchMock: typeof fetch = jest.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    ) as any;

    const cacheStore = new InMemoryCacheStore<any>();
    const client = createClient({
      fetch: fetchMock,
      cacheStore,
      middlewares: [],
    });

    const promise = client.query('state-success', {
      request: { url: '/ok', method: 'GET' },
    });

    // Allow loading state to be written
    await Promise.resolve();
    const loadingEntry = await client.getCache('state-success:GET:/ok:');
    expect(loadingEntry?.status).toBe('loading');

    resolveFetch!(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const result = await promise;
    expect(result).toEqual({ ok: true });

    const successEntry = await client.getCache('state-success:GET:/ok:');
    expect(successEntry?.status).toBe('success');
    expect(successEntry?.data).toEqual({ ok: true });
  });

  test('transition: loading to error', async () => {
    const fetchMock: typeof fetch = jest.fn(async () => {
      throw new Error('boom');
    });

    const cacheStore = new InMemoryCacheStore<any>();
    const client = createClient({
      fetch: fetchMock,
      cacheStore,
      middlewares: [],
    });

    await expect(
      client.query('state-error', {
        request: { url: '/err', method: 'GET' },
      })
    ).rejects.toThrow('boom');

    const errorEntry = await client.getCache('state-error:GET:/err:');
    expect(errorEntry?.status).toBe('error');
    expect(errorEntry?.error?.message).toBe('boom');
  });
});
