import { combineReducers, legacy_createStore as createStore } from 'redux';

export const createInjectableStore = (staticReducers: Record<string, any>) => {
  const asyncReducers: Record<string, any> = {};

  const createRootReducer = () =>
    combineReducers({ ...staticReducers, ...asyncReducers });

  const store = createStore(createRootReducer());

  (store as any).injectReducer = (key: string, reducer: any) => {
    if (asyncReducers[key]) return;
    asyncReducers[key] = reducer;
    store.replaceReducer(createRootReducer());
  };

  (store as any).hasReducer = (key: string) =>
    !!asyncReducers[key] || !!staticReducers[key];

  return store;
};
