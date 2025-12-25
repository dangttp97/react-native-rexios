import { REXIOS_CACHE_KEY, rexiosCacheReducer } from '@rexios/redux';
import { combineReducers, configureStore } from '@reduxjs/toolkit';

const reducers = combineReducers({
  [REXIOS_CACHE_KEY]: rexiosCacheReducer,
});

export const store = configureStore({ reducer: reducers });
