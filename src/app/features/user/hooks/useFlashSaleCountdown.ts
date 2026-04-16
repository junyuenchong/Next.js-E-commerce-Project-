"use client";

import { useEffect, useState } from "react";
import { formatHms } from "@/app/lib/countdown";

/**
 * Live countdown label from a Unix end time (seconds). When expired, `label` is `00:00:00`.
 */
export function useFlashSaleCountdown(endAtUnixSeconds: number) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    // Note: 1s ticker keeps countdown responsive while staying lightweight.
    const id = window.setInterval(
      () => setNow(Math.floor(Date.now() / 1000)),
      1000,
    );
    return () => window.clearInterval(id);
  }, []);

  const left = Math.max(0, endAtUnixSeconds - now);
  return { secondsLeft: left, label: formatHms(left) };
}
