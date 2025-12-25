# react-native-rexios

Pure JS network client inspired by Redux, Axios interceptors, and TanStack Query.

## Highlights

- ✅ Works anywhere `fetch` exists (or you inject one): React Native, Node, Next, Nest, Angular, React
- ✅ KoaJS Middleware pipeline (`before/after/onError`)
- ✅ Cache with tags, stale/background refresh, dedupe/serial requests, retry, timeout
- ✅ Adapter-ready cache stores (in-memory, Redux, Zustand)

## Installation

```sh
npm install react-native-rexios
```

## Quickstart (React/React Native)

```tsx
import { createClient } from '@rexios/core';
import { RexiosProvider, useRexiosClient } from '@rexios/react';

const client = createClient({
  baseURL: 'https://example.com',
  headers: { 'Content-Type': 'application/json' },
  middlewares: [
    {
      before: async (ctx) => {
        // mutate url/headers/body before fetch
      },
      after: async (ctx) => {
        // inspect ctx.response or return transformed data to short-circuit
      },
      onError: async (ctx, error) => {
        // retry/backoff/log
      },
    },
  ],
});

const Todos = () => {
  const { query } = useRexiosClient();

  const load = async () => {
    const data = await query('getTodos', {
      request: { url: '/todos/1', method: 'GET', staleTime: 5_000 },
      provideTags: ['todos'],
    });
    console.log(data);
  };

  return null;
};

export default function App() {
  return (
    <RexiosProvider client={client}>
      <Todos />
    </RexiosProvider>
  );
}
```

## Plain usage (framework agnostic)

```ts
import { createClient } from '@rexios/core';

const client = createClient({
  fetch: globalThis.fetch, // or custom
  timeoutMs: 10_000,
});

const data = await client.query('posts', {
  request: { url: 'https://example.com/posts', method: 'GET' },
});
```

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
