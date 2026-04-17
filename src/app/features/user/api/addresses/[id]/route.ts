import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/app/lib/prisma";
import { rateLimit } from "@/app/lib/rate-limit";
import { resolveUserId } from "@/backend/core/session";
import { ensureOneDefault } from "../address-db";

const patchSchema = z.object({
  label: z.string().max(80).nullable().optional(),
  line1: z.string().min(1).max(200).optional(),
  city: z.string().min(1).max(100).optional(),
  postcode: z.string().min(1).max(20).optional(),
  country: z.string().min(1).max(80).optional(),
  isDefault: z.boolean().optional(),
});

// Verifies the target address belongs to the authenticated user.
async function addressOwnedByUser(addressId: number, userId: number) {
  return prisma.userAddress.findFirst({
    where: { id: addressId, userId, isActive: true },
  });
}

// Updates one owned address and handles default-address transitions.
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: idParam } = await ctx.params;
  const addressId = Number.parseInt(idParam, 10);
  if (!Number.isFinite(addressId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const current = await addressOwnedByUser(addressId, userId);
  if (!current) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const json = (await request.json().catch(() => null)) as unknown;
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const data = parsed.data;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ address: current });
  }

  const row = await prisma.$transaction(async (tx) => {
    if (data.isDefault === true) {
      await tx.userAddress.updateMany({
        where: { userId, isActive: true },
        data: { isDefault: false },
      });
    }

    const patch: {
      label?: string | null;
      line1?: string;
      city?: string;
      postcode?: string;
      country?: string;
      isDefault?: boolean;
    } = {};
    if (data.label !== undefined) {
      patch.label = data.label === null ? null : data.label.trim() || null;
    }
    if (data.line1 !== undefined) patch.line1 = data.line1.trim();
    if (data.city !== undefined) patch.city = data.city.trim();
    if (data.postcode !== undefined) patch.postcode = data.postcode.trim();
    if (data.country !== undefined) patch.country = data.country.trim();
    if (data.isDefault === true) patch.isDefault = true;

    return tx.userAddress.update({
      where: { id: addressId },
      data: patch,
    });
  });

  return NextResponse.json({ address: row });
}

// Soft-deletes one owned address and re-balances default address state.
export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: idParam } = await ctx.params;
  const addressId = Number.parseInt(idParam, 10);
  if (!Number.isFinite(addressId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const current = await addressOwnedByUser(addressId, userId);
  if (!current) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const rl = await rateLimit(`addr:del:${userId}`, 60, 300);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  await prisma.userAddress.update({
    where: { id: addressId },
    data: { isActive: false, isDefault: false },
  });
  await ensureOneDefault(userId);

  return NextResponse.json({ ok: true });
}
