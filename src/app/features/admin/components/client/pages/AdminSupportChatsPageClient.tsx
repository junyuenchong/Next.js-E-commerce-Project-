"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { http, getErrorMessage } from "@/app/lib/network";

type AdminConversationRow = {
  id: number;
  status: "OPEN" | "CLOSED";
  subject: string | null;
  lastMessageAt: string;
  createdAt: string;
  user: { id: number; email: string; name: string | null };
  _count: { messages: number };
};

type AdminMessageRow = {
  id: number;
  senderType: "USER" | "ADMIN";
  body: string;
  createdAt: string;
  userSender?: { id: number; email: string; name: string | null } | null;
  adminSender?: { id: number; email: string; name: string | null } | null;
};

// Admin support inbox with polling-based conversation and message refresh.
export default function AdminSupportChatsPageClient() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<"ALL" | "OPEN" | "CLOSED">(
    "OPEN",
  );
  const [q, setQ] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const convosQ = useQuery({
    queryKey: ["admin-support-conversations", filterStatus, q],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== "ALL") params.set("status", filterStatus);
      if (q.trim()) params.set("q", q.trim());
      const { data } = await http.get<{
        conversations: AdminConversationRow[];
      }>(`/features/admin/api/support/conversations?${params.toString()}`);
      return data.conversations ?? [];
    },
    refetchInterval: 8_000,
    staleTime: 5_000,
  });

  // Auto-select the first conversation when list first loads.
  useEffect(() => {
    if (selectedId != null) return;
    const first = convosQ.data?.[0];
    if (first?.id) setSelectedId(first.id);
  }, [selectedId, convosQ.data]);

  const messagesQ = useQuery({
    queryKey: ["admin-support-messages", selectedId],
    queryFn: async () => {
      const { data } = await http.get<{ messages: AdminMessageRow[] }>(
        `/features/admin/api/support/conversations/${selectedId}/messages`,
      );
      return data.messages ?? [];
    },
    enabled: Boolean(selectedId),
    refetchInterval: 4_000,
    staleTime: 2_000,
  });

  const selected = useMemo(
    () => (convosQ.data ?? []).find((c) => c.id === selectedId) ?? null,
    [convosQ.data, selectedId],
  );

  // Keep the latest message in view after message list updates.
  useEffect(() => {
    if (!messagesQ.data?.length) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messagesQ.data?.length]);

  // Send reply to the selected conversation and refresh related queries.
  const sendReply = useCallback(async () => {
    const text = reply.trim();
    if (!selectedId || !text) return;
    setBusy(true);
    setErr(null);
    try {
      await http.post(
        `/features/admin/api/support/conversations/${selectedId}/messages`,
        {
          body: text,
        },
      );
      setReply("");
      void qc.invalidateQueries({
        queryKey: ["admin-support-messages", selectedId],
      });
      void qc.invalidateQueries({ queryKey: ["admin-support-conversations"] });
    } catch (e) {
      setErr(getErrorMessage(e, "Could not send reply."));
    } finally {
      setBusy(false);
    }
  }, [reply, selectedId, qc]);

  const convos = convosQ.data ?? [];
  const msgs = messagesQ.data ?? [];

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Support chats</h1>
          <p className="text-sm text-gray-600">Polling (no websocket).</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value as "ALL" | "OPEN" | "CLOSED")
            }
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
            <option value="ALL">All</option>
          </select>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by email/name…"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm w-56"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <aside className="rounded-xl border border-gray-200 bg-white p-3 md:col-span-1">
          <div className="text-sm font-semibold text-gray-900 px-2 py-2">
            Conversations
          </div>
          <div className="space-y-2">
            {convos.length === 0 ? (
              <p className="text-sm text-gray-600 px-2 py-2">
                No conversations.
              </p>
            ) : (
              convos.map((c) => {
                const active = c.id === selectedId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left rounded-lg border px-3 py-2 ${
                      active
                        ? "border-black bg-black text-white"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {c.user.name || c.user.email}
                        </div>
                        <div
                          className={`text-[11px] truncate ${active ? "text-white/80" : "text-gray-500"}`}
                        >
                          {c.subject ?? `Conversation #${c.id}`} ·{" "}
                          {c._count.messages} msgs
                        </div>
                      </div>
                      <span
                        className={`text-[10px] rounded px-2 py-0.5 ${
                          c.status === "OPEN"
                            ? active
                              ? "bg-white/20"
                              : "bg-emerald-50 text-emerald-800"
                            : active
                              ? "bg-white/20"
                              : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <div
                      className={`mt-1 text-[11px] ${active ? "text-white/70" : "text-gray-500"}`}
                    >
                      {new Date(c.lastMessageAt).toLocaleString()}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="rounded-xl border border-gray-200 bg-white md:col-span-2 flex flex-col min-h-[640px]">
          <div className="border-b px-4 py-3 flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">
                {selected ? selected.user.email : "Select a conversation"}
              </div>
              <div className="text-[11px] text-gray-500 truncate">
                {selected
                  ? (selected.subject ?? `Conversation #${selected.id}`)
                  : " "}
              </div>
            </div>
            <div className="text-xs text-gray-500">
              {messagesQ.isFetching ? "Refreshing…" : " "}
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {!selectedId ? (
              <p className="text-sm text-gray-600">Pick a conversation.</p>
            ) : msgs.length === 0 ? (
              <p className="text-sm text-gray-600">No messages yet.</p>
            ) : (
              msgs.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.senderType === "ADMIN" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                      m.senderType === "ADMIN"
                        ? "bg-black text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <div className="text-[10px] opacity-70 mb-1">
                      {m.senderType === "ADMIN"
                        ? "Admin"
                        : (m.userSender?.email ?? "User")}{" "}
                      · {new Date(m.createdAt).toLocaleString()}
                    </div>
                    {m.body}
                  </div>
                </div>
              ))
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
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                disabled={busy || !selectedId || selected?.status !== "OPEN"}
                placeholder={
                  !selectedId
                    ? "Select a conversation"
                    : selected?.status === "OPEN"
                      ? "Write a reply…"
                      : "Conversation is closed"
                }
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void sendReply();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => void sendReply()}
                disabled={
                  busy ||
                  !selectedId ||
                  !reply.trim() ||
                  selected?.status !== "OPEN"
                }
                className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Reply
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
