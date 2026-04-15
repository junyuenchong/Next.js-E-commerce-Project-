"use client";

import React from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { persistStore } from "redux-persist";
import { store } from "../redux/store";

export default function ReduxProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Avoid blocking initial render in SSR by enabling PersistGate only on client
  const [isClient, setIsClient] = React.useState(false);
  React.useEffect(() => setIsClient(true), []);

  if (!isClient) {
    return <Provider store={store}>{children}</Provider>;
  }

  // Create persistor for client-side persistence
  const persistor = persistStore(store);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        {children}
      </PersistGate>
    </Provider>
  );
}
