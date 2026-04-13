import { NextResponse } from "next/server";
import {
  ADMIN_LIST_DEFAULT,
  clampAdminListLimit,
  parseAdminCursorId,
} from "@/app/lib/admin-pagination";
import prisma from "@/app/lib/prisma";
import { adminApiRequire } from "@/backend/lib/admin-api-guard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const g = await adminApiRequire("audit.read");
  if (!g.ok) return g.response;

  const { searchParams } = new URL(req.url);
  const take = clampAdminListLimit(
    searchParams.get("limit"),
    ADMIN_LIST_DEFAULT.audit,
  );
  const cursorId = parseAdminCursorId(searchParams.get("cursor"));

  const rows = await prisma.adminActionLog.findMany({
    where: cursorId != null ? { id: { lt: cursorId } } : undefined,
    orderBy: { id: "desc" },
    take: take + 1,
    include: {
      actor: {
        select: { id: true, email: true, name: true },
      },
    },
  });

  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;
  const nextCursor = hasMore ? page[page.length - 1]!.id : null;

  return NextResponse.json(
    {
      items: page.map((r) => ({
        id: r.id,
        action: r.action,
        targetType: r.targetType,
        targetId: r.targetId,
        metadata: r.metadata,
        createdAt: r.createdAt.toISOString(),
        actor: r.actor
          ? { id: r.actor.id, email: r.actor.email, name: r.actor.name }
          : null,
      })),
      nextCursor,
      hasMore: nextCursor != null,
      limit: take,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
