import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { resolveUserId } from "@/backend/lib/session";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rows = await prisma.supportConversation.findMany({
    where: { userId },
    orderBy: [{ lastMessageAt: "desc" }],
    select: {
      id: true,
      status: true,
      subject: true,
      lastMessageAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json(
    { conversations: rows },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const createSchema = z.object({
  subject: z.string().trim().max(200).optional().nullable(),
});

export async function POST(req: Request) {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  // One open conversation per user for simplicity.
  const existing = await prisma.supportConversation.findFirst({
    where: { userId, status: "OPEN" },
    select: { id: true },
    orderBy: { lastMessageAt: "desc" },
  });
  if (existing) {
    return NextResponse.json({ conversationId: existing.id, reused: true });
  }

  const row = await prisma.supportConversation.create({
    data: {
      userId,
      subject: parsed.data.subject?.trim() || null,
      status: "OPEN",
    },
    select: { id: true },
  });
  return NextResponse.json(
    { conversationId: row.id, reused: false },
    { status: 201 },
  );
}
