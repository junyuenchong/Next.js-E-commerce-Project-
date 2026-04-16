import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { adminApiRequire } from "@/backend/core/admin-api-guard";
import {
  adminActorNumericId,
  logAdminAction,
} from "@/backend/core/admin-action-log";
import { z } from "zod";
import { jsonInternalServerError } from "@/backend/lib/api-error";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function parseParamId(raw: string | undefined): number | null {
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function GET(_req: Request, ctx: RouteContext) {
  try {
    const g = await adminApiRequire("order.read");
    if (!g.ok) return g.response;

    const { id } = await ctx.params;
    const conversationId = parseParamId(id);
    if (!conversationId)
      return NextResponse.json(
        { error: "invalid_conversation" },
        { status: 400 },
      );

    const convo = await prisma.supportConversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });
    if (!convo)
      return NextResponse.json({ error: "not_found" }, { status: 404 });

    const messages = await prisma.supportMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 300,
      select: {
        id: true,
        senderType: true,
        body: true,
        createdAt: true,
        userSender: { select: { id: true, email: true, name: true } },
        adminSender: { select: { id: true, email: true, name: true } },
      },
    });

    return NextResponse.json(
      { messages },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return jsonInternalServerError(
      error,
      "[admin/api/support/conversations/[id]/messages GET]",
    );
  }
}

const postSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export async function POST(req: Request, ctx: RouteContext) {
  try {
    const g = await adminApiRequire("order.read");
    if (!g.ok) return g.response;

    const { id } = await ctx.params;
    const conversationId = parseParamId(id);
    if (!conversationId)
      return NextResponse.json(
        { error: "invalid_conversation" },
        { status: 400 },
      );

    const json = (await req.json().catch(() => null)) as unknown;
    const parsed = postSchema.safeParse(json);
    if (!parsed.success)
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });

    const convo = await prisma.supportConversation.findUnique({
      where: { id: conversationId },
      select: { id: true, status: true },
    });
    if (!convo)
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (convo.status !== "OPEN") {
      return NextResponse.json(
        { error: "conversation_closed" },
        { status: 400 },
      );
    }

    const adminId = adminActorNumericId(g.user);
    if (adminId == null) {
      return NextResponse.json({ error: "invalid_admin" }, { status: 400 });
    }

    const msg = await prisma.supportMessage.create({
      data: {
        conversationId,
        senderType: "ADMIN",
        adminSenderId: adminId,
        body: parsed.data.body.trim(),
      },
      select: { id: true, createdAt: true },
    });

    await prisma.supportConversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: msg.createdAt },
      select: { id: true },
    });

    void logAdminAction({
      actorUserId: adminId,
      action: "support.chat_reply",
      targetType: "SupportConversation",
      targetId: String(conversationId),
      metadata: { messageId: msg.id },
    });

    return NextResponse.json({ ok: true, messageId: msg.id });
  } catch (error) {
    return jsonInternalServerError(
      error,
      "[admin/api/support/conversations/[id]/messages POST]",
    );
  }
}
