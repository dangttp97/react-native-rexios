import { View, StyleSheet, Text } from 'react-native';
import { createClient, type MiddlewareContext } from '@rexios/core';
import { RexiosProvider, useRexiosClient } from '@rexios/react';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import { useEffect, useState } from 'react';
import { PATH } from './network/path';

const client = createClient({
  baseURL: 'https://jsonplaceholder.typicode.com',
  headers: {
    'X-API-KEY': '1234567890',
    'Content-Type': 'application/json',
  },
  middlewares: [
    {
      before: async (ctx: MiddlewareContext<any>) => {
        console.log(ctx);
      },
    },
  ],
});

const Root = () => {
  const { query } = useRexiosClient();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    query('getAllPosts', {
      request: {
        method: 'GET',
        url: PATH.GET_ALL_POSTS,
      },
    }).then((d) => {
      console.log(d);
      setData(d);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <Text>Hello</Text>
      <Text>{JSON.stringify(data)}</Text>
    </View>
  );
};

export default function App() {
  return (
    <Provider store={store}>
      <RexiosProvider client={client}>
        <Root />
      </RexiosProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
