"use client";

import { useEffect, useState } from "react";
import { formatHms } from "@/app/lib/countdown";

/**
 * flash sale countdown hook
 * return remaining seconds and HH:MM:SS label
 */
export function useFlashSaleCountdown(endAtUnixSeconds: number) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    // keep 1s ticker for responsive and lightweight countdown updates.
    const id = window.setInterval(
      () => setNow(Math.floor(Date.now() / 1000)),
      1000,
    );
    return () => window.clearInterval(id);
  }, []);

  const left = Math.max(0, endAtUnixSeconds - now);
  return { secondsLeft: left, label: formatHms(left) };
}
