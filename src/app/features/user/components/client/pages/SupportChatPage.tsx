"use client";

import Link from "next/link";
import { formatPriceRM } from "@/app/lib/format-price";
import { useSupportChatPage } from "@/app/features/user/hooks";

export default function SupportChatPage() {
  const {
    user,
    sessionLoading,
    conversationsQ,
    messagesQ,
    conversationId,
    setConversationId,
    message,
    setMessage,
    busy,
    err,
    orderPreview,
    canSend,
    bottomRef,
    inputRef,
    startNew,
    startFromBot,
    showMyOrders,
    sendOrderHelp,
    send,
  } = useSupportChatPage();

  const QuickButtons = (
    <div className="grid grid-cols-2 gap-2 max-w-md">
      {[
        "Order Enquiries",
        "Products",
        "Membership",
        "Order Issue",
        "Corporate",
        "Payment",
      ].map((t) => (
        <button
          key={t}
          type="button"
          disabled={busy || !canSend}
          onClick={() => {
            if (t === "Order Enquiries") {
              void showMyOrders();
              return;
            }
            void startFromBot(t, { sendIntro: true });
          }}
          className="rounded-full border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
        >
          {t}
        </button>
      ))}
      <button
        type="button"
        disabled={busy || !canSend}
        onClick={() =>
          void startFromBot("Customer service", { sendIntro: false })
        }
        className="col-span-2 rounded-full border border-gray-900 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50"
      >
        Chat with customer service
      </button>
    </div>
  );

  if (sessionLoading) {
    return <div className="p-6 text-gray-600">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl p-6 space-y-3">
        <h1 className="text-xl font-semibold text-gray-900">Support chat</h1>
        <p className="text-sm text-gray-600">
          Please sign in to message support.
        </p>
        <Link
          href="/features/user/auth/sign-in?returnUrl=%2Ffeatures%2Fuser%2Fsupport%2Fchat"
          className="inline-flex rounded-md bg-black px-4 py-2 text-sm text-white"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const conversations = conversationsQ.data ?? [];
  const msgs = messagesQ.data ?? [];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50">
      <div className="mx-auto max-w-5xl p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <aside className="rounded-xl border border-gray-200 bg-white p-4 md:col-span-1">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-base font-semibold text-gray-900">Support</h1>
            <button
              type="button"
              onClick={() => void startNew()}
              disabled={busy}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              New chat
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Polling every few seconds (production friendly).
          </p>

          <div className="mt-3 space-y-2">
            {conversations.length === 0 ? (
              <p className="text-sm text-gray-600">No conversations yet.</p>
            ) : (
              conversations.map((c) => {
                const active = c.id === conversationId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setConversationId(c.id)}
                    className={`w-full text-left rounded-lg border px-3 py-2 ${
                      active
                        ? "border-black bg-black text-white"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">
                        {c.subject ?? `Conversation #${c.id}`}
                      </span>
                      <span
                        className={`text-[10px] rounded px-2 py-0.5 ${
                          c.status === "OPEN"
                            ? active
                              ? "bg-white/20 text-white"
                              : "bg-emerald-50 text-emerald-800"
                            : active
                              ? "bg-white/20 text-white"
                              : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <div
                      className={`mt-1 text-[11px] ${active ? "text-white/80" : "text-gray-500"}`}
                    >
                      Last update {new Date(c.lastMessageAt).toLocaleString()}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="rounded-xl border border-gray-200 bg-white md:col-span-2 flex flex-col min-h-[520px]">
          <div className="border-b px-4 py-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-900">
              {conversationId
                ? `Conversation #${conversationId}`
                : "Select a conversation"}
            </div>
            <div className="text-xs text-gray-500">
              {messagesQ.isFetching ? "Refreshing…" : " "}
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {conversationId == null ? (
              <div className="space-y-3">
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-gray-100 text-gray-900">
                    <div className="text-sm font-semibold">
                      Customer service
                    </div>
                    <div className="mt-2 text-sm text-gray-800">
                      How may we assist you today?
                    </div>
                  </div>
                </div>
                {QuickButtons}
                <p className="text-xs text-gray-500">
                  Tip: choose a topic to send an instant message, or open
                  customer service to chat with a human.
                </p>
              </div>
            ) : msgs.length === 0 ? (
              <div className="space-y-3">
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-gray-100 text-gray-900">
                    <div className="text-sm font-semibold">
                      Customer service
                    </div>
                    <div className="mt-2 text-sm text-gray-800">
                      Choose an option below, or type your message to customer
                      service.
                    </div>
                  </div>
                </div>
                {QuickButtons}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-gray-100 text-gray-900">
                    <div className="text-sm font-semibold">
                      Customer service
                    </div>
                    <div className="mt-2 text-sm text-gray-800">
                      Quick requests (tap to send). Or type below.
                    </div>
                    <div className="mt-3">{QuickButtons}</div>

                    {orderPreview ? (
                      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-3">
                        <div className="text-xs font-semibold text-gray-900">
                          Your recent orders
                        </div>
                        {orderPreview.length === 0 ? (
                          <div className="mt-2 text-xs text-gray-600">
                            No orders found.
                          </div>
                        ) : (
                          <div className="mt-2 space-y-2">
                            {orderPreview.map((o) => (
                              <button
                                key={o.id}
                                type="button"
                                disabled={busy || !canSend}
                                onClick={() => void sendOrderHelp(o.id)}
                                className="w-full text-left rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 disabled:opacity-50"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-sm font-semibold text-gray-900">
                                    Order #{o.id}
                                  </div>
                                  <div className="text-sm font-semibold text-emerald-700">
                                    {formatPriceRM(o.total)}
                                  </div>
                                </div>
                                <div className="mt-0.5 text-[11px] text-gray-500 flex items-center justify-between gap-2">
                                  <span>
                                    {new Date(o.createdAt).toLocaleString()}
                                  </span>
                                  <span className="uppercase">{o.status}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="text-[11px] text-gray-500">
                            Tap an order to send it to customer service.
                          </div>
                          <Link
                            href="/features/user/orders"
                            className="text-[11px] font-medium text-emerald-700 hover:underline"
                          >
                            View all orders
                          </Link>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {msgs.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.senderType === "USER" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                        m.senderType === "USER"
                          ? "bg-black text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <div className="text-[10px] opacity-70 mb-1">
                        {m.senderType === "USER" ? "You" : "Support"} ·{" "}
                        {new Date(m.createdAt).toLocaleString()}
                      </div>
                      {m.body}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t p-4 space-y-2">
            {err ? (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {err}
              </p>
            ) : null}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={busy || !conversationId || !canSend}
                placeholder={
                  !conversationId
                    ? "Select a conversation"
                    : canSend
                      ? "Type your message…"
                      : "Conversation is closed"
                }
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={
                  busy || !conversationId || !message.trim() || !canSend
                }
                className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Send
              </button>
            </div>
            <p className="text-[11px] text-gray-500">
              This chat uses polling (no websocket). For production, you can
              tune intervals.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
