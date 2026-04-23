"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { http, getErrorMessage } from "@/app/lib/network";
import { useUser } from "@/app/features/user/components/client/UserContext";
import type { OrderListItem } from "@/app/features/user/types";

type ConversationRow = {
  id: number;
  status: "OPEN" | "CLOSED";
  subject: string | null;
  lastMessageAt: string;
  createdAt: string;
};

type MessageRow = {
  id: number;
  senderType: "USER" | "ADMIN";
  body: string;
  createdAt: string;
};

// Ensures a conversation exists and returns its id (creates one when missing).
async function ensureConversation(subject?: string) {
  const { data } = await http.post<{ conversationId: number }>(
    "/features/user/api/support/conversations",
    { subject: subject?.trim() || null },
  );
  return data.conversationId;
}

// Fetches the current user's conversation list for the chat sidebar.
async function fetchConversations() {
  const { data } = await http.get<{ conversations: ConversationRow[] }>(
    "/features/user/api/support/conversations",
  );
  return data.conversations ?? [];
}

// Fetches messages for a conversation (polling is handled by React Query options).
async function fetchMessages(conversationId: number) {
  const { data } = await http.get<{ messages: MessageRow[] }>(
    `/features/user/api/support/conversations/${conversationId}/messages`,
  );
  return data.messages ?? [];
}

// Page-level hook: keeps support chat state, queries, and actions out of the component tree.
export function useSupportChatPage() {
  const { user, isLoading: sessionLoading } = useUser();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const [conversationId, setConversationId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orderPreview, setOrderPreview] = useState<OrderListItem[] | null>(
    null,
  );

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const conversationsQ = useQuery({
    queryKey: ["support-conversations"],
    queryFn: fetchConversations,
    enabled: Boolean(user),
    refetchInterval: 8_000,
    staleTime: 5_000,
  });

  useEffect(() => {
    if (conversationId != null) return;
    const first = conversationsQ.data?.[0];
    if (first?.id) setConversationId(first.id);
  }, [conversationId, conversationsQ.data]);

  const messagesQ = useQuery({
    queryKey: ["support-messages", conversationId],
    queryFn: () => fetchMessages(conversationId as number),
    enabled: Boolean(user && conversationId),
    refetchInterval: 4_000,
    staleTime: 2_000,
  });

  const canSend = useMemo(() => {
    const convo = conversationsQ.data?.find((c) => c.id === conversationId);
    return convo?.status === "OPEN";
  }, [conversationsQ.data, conversationId]);

  useEffect(() => {
    if (!messagesQ.data?.length) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messagesQ.data?.length]);

  const invalidateChatQueries = useCallback(
    (id: number) => {
      void queryClient.invalidateQueries({
        queryKey: ["support-messages", id],
      });
      void queryClient.invalidateQueries({
        queryKey: ["support-conversations"],
      });
    },
    [queryClient],
  );

  // Schedule focus after DOM updates (e.g. after switching conversation).
  const focusInputSoon = () => queueMicrotask(() => inputRef.current?.focus());

  const startNew = useCallback(async () => {
    setErrorMessage(null);
    setBusy(true);
    try {
      const id = await ensureConversation("Support request");
      setConversationId(id);
      invalidateChatQueries(id);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not start chat."));
    } finally {
      setBusy(false);
    }
  }, [invalidateChatQueries]);

  const startFromBot = useCallback(
    async (topic: string, opts?: { sendIntro?: boolean }) => {
      setErrorMessage(null);
      setBusy(true);
      try {
        const id =
          conversationId ?? (await ensureConversation("Support request"));
        if (conversationId == null) setConversationId(id);

        if (opts?.sendIntro) {
          await http.post(
            `/features/user/api/support/conversations/${id}/messages`,
            { body: `Hi, I need help with: ${topic}` },
          );
        }

        invalidateChatQueries(id);
        focusInputSoon();
      } catch (error) {
        setErrorMessage(getErrorMessage(error, "Could not start chat."));
      } finally {
        setBusy(false);
      }
    },
    [conversationId, invalidateChatQueries],
  );

  const showMyOrders = useCallback(async () => {
    setErrorMessage(null);
    setBusy(true);
    try {
      const id = conversationId ?? (await ensureConversation("Order enquiry"));
      if (conversationId == null) setConversationId(id);

      const { data } = await http.get<{ orders: OrderListItem[] }>(
        "/features/user/api/orders?limit=10",
      );
      setOrderPreview(Array.isArray(data.orders) ? data.orders : []);
      focusInputSoon();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not load your orders."));
    } finally {
      setBusy(false);
    }
  }, [conversationId]);

  const sendOrderHelp = useCallback(
    async (orderId: string) => {
      if (!conversationId) return;
      setBusy(true);
      setErrorMessage(null);
      try {
        await http.post(
          `/features/user/api/support/conversations/${conversationId}/messages`,
          { body: `Hi, I need help with Order #${orderId}` },
        );
        invalidateChatQueries(conversationId);
        focusInputSoon();
      } catch (error) {
        setErrorMessage(getErrorMessage(error, "Could not send message."));
      } finally {
        setBusy(false);
      }
    },
    [conversationId, invalidateChatQueries],
  );

  const send = useCallback(async () => {
    const text = message.trim();
    if (!text || !conversationId) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      await http.post(
        `/features/user/api/support/conversations/${conversationId}/messages`,
        { body: text },
      );
      setMessage("");
      invalidateChatQueries(conversationId);
      focusInputSoon();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not send message."));
    } finally {
      setBusy(false);
    }
  }, [message, conversationId, invalidateChatQueries]);

  useEffect(() => {
    const topic = searchParams?.get("topic")?.trim();
    if (!topic) return;
    // Trigger once per mount; user can still start new chats manually.
    void startFromBot(topic, { sendIntro: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    user,
    sessionLoading,
    conversationsQ,
    messagesQ,
    conversationId,
    setConversationId,
    message,
    setMessage,
    busy,
    err: errorMessage,
    orderPreview,
    canSend,
    bottomRef,
    inputRef,
    startNew,
    startFromBot,
    showMyOrders,
    sendOrderHelp,
    send,
  };
}
