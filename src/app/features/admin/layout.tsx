import type { ReactNode } from "react";

/** `auth/` is public; `(main)/layout.tsx` is sidebar + login for dashboard pages. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
