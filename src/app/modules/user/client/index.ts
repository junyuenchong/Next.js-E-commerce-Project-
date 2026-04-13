/**
 * Barrel: **HTTP** helpers (same names as before). For **React route UIs**, import from
 * `@/app/modules/user/client/components/...` — storefront UI (same folder names as before;
 * the old `modules/user/components/` tree was merged here).
 */
export * from "./http/cartClient";
export * from "./http/categoriesClient";
export * from "./http/ordersClient";
export * from "./http/productsClient";
export * from "./http/searchClient";
export * from "./http/auth/sessionClient";
export * from "./http/auth/authClient";
export { default as SessionProviderClient } from "./components/auth/SessionProviderClient";
