import { configureStore } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import {
  cartSlice,
  addToCart,
  removeFromCart,
  updateQuantity,
  clearCart,
  setCart,
  setCartId,
} from "@/redux/slices/cartSlice";

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
