import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { adminApiRequire } from "@/backend/core/admin-api-guard";
import { jsonInternalServerError } from "@/backend/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const g = await adminApiRequire("user.read");
    if (!g.ok) return g.response;

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const q = url.searchParams.get("q")?.trim() ?? "";

    const rows = await prisma.supportConversation.findMany({
      where: {
        ...(status === "OPEN" || status === "CLOSED" ? { status } : {}),
        ...(q
          ? {
              user: {
                OR: [
                  { email: { contains: q, mode: "insensitive" } },
                  { name: { contains: q, mode: "insensitive" } },
                ],
              },
            }
          : {}),
      },
      orderBy: [{ lastMessageAt: "desc" }],
      take: 200,
      select: {
        id: true,
        status: true,
        subject: true,
        lastMessageAt: true,
        createdAt: true,
        user: { select: { id: true, email: true, name: true } },
        _count: { select: { messages: true } },
      },
    });

    return NextResponse.json(
      { conversations: rows },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return jsonInternalServerError(
      error,
      "[admin/api/support/conversations GET]",
    );
  }
}
