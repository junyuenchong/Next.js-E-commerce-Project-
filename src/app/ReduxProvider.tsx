"use client";

import { Provider } from 'react-redux';
import { store } from './store';
import React from 'react';

export default function ReduxProvider({ children }: { children: React.ReactNode }) {
  // Avoid blocking initial render in SSR by enabling PersistGate only on client
  const [isClient, setIsClient] = React.useState(false);
  React.useEffect(() => setIsClient(true), []);

  if (!isClient) {
    return <Provider store={store}>{children}</Provider>;
  }

  // Lazy import to avoid SSR issues
  const { PersistGate } = require('redux-persist/integration/react');
  const { persistStore } = require('redux-persist');
  const persistor = persistStore(store);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>{children}</PersistGate>
    </Provider>
  );
} 