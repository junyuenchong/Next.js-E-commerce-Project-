import { configureStore } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import createWebStorage from "redux-persist/lib/storage/createWebStorage";
import {
  cartSlice,
  addToCart,
  removeFromCart,
  updateQuantity,
  clearCart,
  setCart,
  setCartId,
} from "./slices/cartSlice";

const createNoopStorage = () => ({
  getItem: async (key: string) => {
    void key;
    return null;
  },
  setItem: async (key: string, value: string) => {
    void key;
    return value;
  },
  removeItem: async (key: string) => {
    void key;
  },
});

const storage =
  typeof window !== "undefined"
    ? createWebStorage("local")
    : createNoopStorage();

const persistConfig = {
  key: "cart",
  storage,
};

const persistedCartReducer = persistReducer(persistConfig, cartSlice.reducer);

export const store = configureStore({
  reducer: {
    cart: persistedCartReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export {
  addToCart,
  removeFromCart,
  updateQuantity,
  clearCart,
  setCart,
  setCartId,
};
