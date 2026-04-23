/**
 * admin api route
 * handle audit-log
 */

import { NextResponse } from "next/server";
import {
  ADMIN_LIST_DEFAULT,
  buildCursorResponseMeta,
  parseAdminListParams,
} from "@/backend/shared/pagination/list-pagination";
import prisma from "@/app/lib/prisma";
import { adminApiRequire } from "@/backend/core/admin-api-guard";
import { jsonInternalServerError } from "@/backend/lib/api-error";

export const dynamic = "force-dynamic";

type AuditSort = "newest" | "oldest" | "action-a-z";

function parseAuditSort(value: string | null): AuditSort {
  if (value === "oldest") return "oldest";
  // Keep backward compatibility with legacy client value "action_az".
  if (value === "action-a-z" || value === "action_az") return "action-a-z";
  return "newest";
}

export async function GET(req: Request) {
  try {
    const guard = await adminApiRequire("audit.read");
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(req.url);
    const { take, cursorId } = parseAdminListParams(
      searchParams,
      ADMIN_LIST_DEFAULT.audit,
    );
    const sort = parseAuditSort(searchParams.get("sort"));

    const whereByCursor =
      cursorId == null
        ? undefined
        : sort === "oldest"
          ? { id: { gt: cursorId } }
          : { id: { lt: cursorId } };

    const orderBy =
      sort === "oldest"
        ? [{ id: "asc" as const }]
        : sort === "action-a-z"
          ? [{ action: "asc" as const }, { id: "desc" as const }]
          : [{ id: "desc" as const }];

    const rows = await prisma.adminActionLog.findMany({
      where: whereByCursor,
      orderBy,
      take: take + 1,
      select: {
        id: true,
        action: true,
        targetType: true,
        targetId: true,
        metadata: true,
        createdAt: true,
        actorUserId: true,
      },
    });

    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    const nextCursor =
      hasMore && (sort === "newest" || sort === "oldest")
        ? page[page.length - 1]!.id
        : null;

    // Prevent N+1: fetch all actors used by this page in one query.
    const actorIds = [
      ...new Set(
        page.map((r) => r.actorUserId).filter((v): v is number => v != null),
      ),
    ];
    const actors = actorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, email: true, name: true },
        })
      : [];
    const actorById = new Map(actors.map((a) => [a.id, a]));

    return NextResponse.json(
      {
        items: page.map((r) => ({
          id: r.id,
          action: r.action,
          targetType: r.targetType,
          targetId: r.targetId,
          metadata: r.metadata,
          createdAt: r.createdAt.toISOString(),
          actor:
            r.actorUserId != null && actorById.has(r.actorUserId)
              ? actorById.get(r.actorUserId)!
              : null,
        })),
        ...buildCursorResponseMeta(take, nextCursor),
        sort,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return jsonInternalServerError(error, "[admin/api/audit-log GET]");
  }
}
