/**
 * Admin HTTP route: coupons.
 */

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import {
  ADMIN_CACHE_KEYS,
  ADMIN_CACHE_TTL_SECONDS,
  bustAdminCouponsListCache,
  getAdminCachedJson,
  setAdminCachedJson,
} from "@/backend/modules/admin-cache";
import {
  adminActorNumericId,
  logAdminAction,
} from "@/backend/core/admin-action-log";
import { adminApiRequire } from "@/backend/core/admin-api-guard";
import { moneyToNumber } from "@/backend/core/money";
import {
  adminCouponCreateBodySchema,
  adminCouponPatchBodySchema,
  createCouponAdminService,
  deactivateCouponAdminService,
  listCouponsAdminService,
  updateCouponAdminService,
} from "@/backend/modules/coupon";
import { jsonInternalServerError } from "@/backend/lib/api-error";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Parse optional date input from admin form payload.
function parseDateInput(v: unknown): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Convert coupon row into JSON shape used by admin pages.
function serializeCoupon(
  c: Awaited<ReturnType<typeof listCouponsAdminService>>[number],
) {
  return {
    id: c.id,
    code: c.code,
    description: c.description,
    discountType: c.discountType,
    value: moneyToNumber(c.value),
    minOrderSubtotal:
      c.minOrderSubtotal != null ? moneyToNumber(c.minOrderSubtotal) : null,
    maxDiscount: c.maxDiscount != null ? moneyToNumber(c.maxDiscount) : null,
    startsAt: c.startsAt?.toISOString() ?? null,
    endsAt: c.endsAt?.toISOString() ?? null,
    usageLimit: c.usageLimit,
    usedCount: c.usedCount,
    isActive: c.isActive,
    redemptionScope: c.redemptionScope,
    showOnStorefront: c.showOnStorefront,
    voucherHeadline: c.voucherHeadline,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

// Return admin coupon list, using short-lived cache when available.
export async function GET() {
  try {
    const guard = await adminApiRequire("coupon.read");
    if (!guard.ok) return guard.response;

    const cacheKey = ADMIN_CACHE_KEYS.couponsList;
    const hit =
      await getAdminCachedJson<ReturnType<typeof serializeCoupon>[]>(cacheKey);
    if (hit) {
      return NextResponse.json(hit, {
        headers: { "Cache-Control": "private, max-age=30" },
      });
    }

    const rows = await listCouponsAdminService();
    const body = rows.map(serializeCoupon);
    await setAdminCachedJson(
      cacheKey,
      body,
      ADMIN_CACHE_TTL_SECONDS.couponsList,
    );
    return NextResponse.json(body, {
      headers: { "Cache-Control": "private, max-age=30" },
    });
  } catch (error) {
    return jsonInternalServerError(error, "[admin/api/coupons GET]");
  }
}

// Create a new coupon from admin payload.
export async function POST(req: Request) {
  const guard = await adminApiRequire("coupon.manage");
  if (!guard.ok) return guard.response;

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = adminCouponCreateBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const d = parsed.data;

  try {
    const row = await createCouponAdminService({
      code: d.code,
      description: d.description,
      discountType: d.discountType,
      value: d.value,
      minOrderSubtotal: d.minOrderSubtotal ?? null,
      maxDiscount: d.maxDiscount ?? null,
      startsAt: parseDateInput(d.startsAt),
      endsAt: parseDateInput(d.endsAt),
      usageLimit: d.usageLimit ?? null,
      isActive: d.isActive,
      redemptionScope: d.redemptionScope,
      showOnStorefront: d.showOnStorefront,
      voucherHeadline: d.voucherHeadline ?? null,
    });
    const aid = adminActorNumericId(guard.user);
    if (aid != null) {
      void logAdminAction({
        actorUserId: aid,
        action: "coupon.create",
        targetType: "Coupon",
        targetId: String(row.id),
        metadata: {
          code: row.code,
          discountType: row.discountType,
          value: moneyToNumber(row.value),
        },
      });
    }
    void bustAdminCouponsListCache();
    return NextResponse.json(serializeCoupon(row), { status: 201 });
  } catch (e: unknown) {
    if (
      e &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code: string }).code === "P2002"
    ) {
      return NextResponse.json({ error: "code_taken" }, { status: 409 });
    }
    return jsonInternalServerError(e, "[admin/api/coupons POST]");
  }
}

// Update coupon fields from admin edit payload.
export async function PATCH(req: Request) {
  const guard = await adminApiRequire("coupon.manage");
  if (!guard.ok) return guard.response;

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = adminCouponPatchBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { id, ...rest } = parsed.data;
  const data: Prisma.CouponUpdateInput = {};

  if (rest.description !== undefined) {
    data.description =
      rest.description === null ? null : rest.description.trim() || null;
  }
  if (rest.discountType !== undefined) data.discountType = rest.discountType;
  if (rest.value !== undefined) data.value = new Decimal(rest.value.toFixed(2));
  if (rest.minOrderSubtotal !== undefined) {
    data.minOrderSubtotal =
      rest.minOrderSubtotal == null
        ? null
        : new Decimal(rest.minOrderSubtotal.toFixed(2));
  }
  if (rest.maxDiscount !== undefined) {
    data.maxDiscount =
      rest.maxDiscount == null
        ? null
        : new Decimal(rest.maxDiscount.toFixed(2));
  }
  if (rest.startsAt !== undefined)
    data.startsAt = parseDateInput(rest.startsAt);
  if (rest.endsAt !== undefined) data.endsAt = parseDateInput(rest.endsAt);
  if (rest.usageLimit !== undefined) data.usageLimit = rest.usageLimit;
  if (rest.isActive !== undefined) data.isActive = rest.isActive;
  if (rest.redemptionScope !== undefined)
    data.redemptionScope = rest.redemptionScope;
  if (rest.showOnStorefront !== undefined)
    data.showOnStorefront = rest.showOnStorefront;
  if (rest.voucherHeadline !== undefined) {
    data.voucherHeadline =
      rest.voucherHeadline === null
        ? null
        : rest.voucherHeadline.trim() || null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "no_changes" }, { status: 400 });
  }

  try {
    const row = await updateCouponAdminService(id, data);
    const aid = adminActorNumericId(guard.user);
    if (aid != null) {
      void logAdminAction({
        actorUserId: aid,
        action: "coupon.update",
        targetType: "Coupon",
        targetId: String(id),
        metadata: { code: row.code, fields: Object.keys(data) },
      });
    }
    void bustAdminCouponsListCache();
    return NextResponse.json(serializeCoupon(row));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return jsonInternalServerError(error, "[admin/api/coupons PATCH]");
  }
}

// Deactivate a coupon by id.
export async function DELETE(req: Request) {
  const guard = await adminApiRequire("coupon.manage");
  if (!guard.ok) return guard.response;

  const idRaw = new URL(req.url).searchParams.get("id");
  const id = idRaw ? Number.parseInt(idRaw, 10) : NaN;
  if (!Number.isFinite(id) || id < 1) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  try {
    const row = await deactivateCouponAdminService(id);
    const aid = adminActorNumericId(guard.user);
    if (aid != null) {
      void logAdminAction({
        actorUserId: aid,
        action: "coupon.delete",
        targetType: "Coupon",
        targetId: String(id),
        metadata: { code: row.code },
      });
    }
    void bustAdminCouponsListCache();
    return NextResponse.json(serializeCoupon(row));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return jsonInternalServerError(error, "[admin/api/coupons DELETE]");
  }
}
