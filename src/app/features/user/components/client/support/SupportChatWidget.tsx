"use client";

import Link from "next/link";

export default function SupportChatWidget() {
  const baseChatPath = "/features/user/support/chat";

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Link
        href={baseChatPath}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700"
        aria-label="Open support chat"
      >
        <span className="text-lg leading-none">💬</span>
      </Link>
    </div>
  );
}
