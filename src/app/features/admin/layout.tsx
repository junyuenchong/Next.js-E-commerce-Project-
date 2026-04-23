import type { ReactNode } from "react";

/**
 * admin layout entry
 * auth is public; main layout adds sidebar and login guards
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
