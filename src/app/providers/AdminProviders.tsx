"use client";

import {
  createContext,
  useEffect,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";

type ToastKind = "success" | "error";
type Toast = { id: number; message: string; kind: ToastKind };

const ToastContext = createContext<{
  showToast: (message: string, kind?: ToastKind) => void;
} | null>(null);

export function useAdminToast() {
  const ctx = useContext(ToastContext);
  return ctx ?? { showToast: () => {} };
}

export default function AdminProviders({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, kind: ToastKind = "success") => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, kind }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4200);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    const checkAdminSession = async () => {
      try {
        const res = await fetch("/modules/admin/api/auth/session", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        const json = (await res.json().catch(() => null)) as {
          authenticated?: boolean;
        } | null;
        if (cancelled) return;
        if (!json?.authenticated) {
          const returnUrl = pathname || "/modules/admin/dashboard";
          router.replace(
            `/modules/admin/auth/sign-in?returnUrl=${encodeURIComponent(returnUrl)}`,
          );
          router.refresh();
        }
      } catch {
        // No-op: do not force redirect on transient network failures.
      }
    };

    void checkAdminSession();
    const id = window.setInterval(() => void checkAdminSession(), 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pathname, router]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-md border px-4 py-2 text-sm shadow-lg ${
              t.kind === "success"
                ? "border-green-200 bg-green-50 text-green-900"
                : "border-red-200 bg-red-50 text-red-900"
            }`}
            role="status"
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
