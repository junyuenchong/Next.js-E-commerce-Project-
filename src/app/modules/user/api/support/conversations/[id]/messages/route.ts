import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { resolveUserId } from "@/backend/lib/session";
import { z } from "zod";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function parseParamId(raw: string | undefined): number | null {
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function GET(_req: Request, ctx: RouteContext) {
  const userId = await resolveUserId();
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const conversationId = parseParamId(id);
  if (!conversationId)
    return NextResponse.json(
      { error: "invalid_conversation" },
      { status: 400 },
    );

  const convo = await prisma.supportConversation.findFirst({
    where: { id: conversationId, userId },
    select: { id: true },
  });
  if (!convo) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const messages = await prisma.supportMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: {
      id: true,
      senderType: true,
      body: true,
      createdAt: true,
    },
  });

  return NextResponse.json(
    { messages },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const postSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export async function POST(req: Request, ctx: RouteContext) {
  const userId = await resolveUserId();
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const conversationId = parseParamId(id);
  if (!conversationId)
    return NextResponse.json(
      { error: "invalid_conversation" },
      { status: 400 },
    );

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const convo = await prisma.supportConversation.findFirst({
    where: { id: conversationId, userId },
    select: { id: true, status: true },
  });
  if (!convo) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (convo.status !== "OPEN") {
    return NextResponse.json({ error: "conversation_closed" }, { status: 400 });
  }

  const msg = await prisma.supportMessage.create({
    data: {
      conversationId,
      senderType: "USER",
      userSenderId: userId,
      body: parsed.data.body.trim(),
    },
    select: { id: true, createdAt: true },
  });

  await prisma.supportConversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: msg.createdAt },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, messageId: msg.id });
}
