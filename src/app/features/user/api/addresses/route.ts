import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/app/lib/prisma";
import { rateLimit } from "@/app/lib/rate-limit";
import { resolveUserId } from "@/backend/core/session";

const addressFields = {
  label: z.string().max(80).nullable().optional(),
  line1: z.string().min(1).max(200),
  city: z.string().min(1).max(100),
  postcode: z.string().min(1).max(20),
  country: z.string().min(1).max(80).optional(),
  isDefault: z.boolean().optional(),
};

const postSchema = z.object(addressFields);

// Lists active addresses for the authenticated user.
export async function GET() {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const list = await prisma.userAddress.findMany({
    where: { userId, isActive: true },
    orderBy: [{ isDefault: "desc" }, { id: "asc" }],
  });

  return NextResponse.json({ addresses: list });
}

// Creates a new address and optionally marks it as default.
export async function POST(request: Request) {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rl = await rateLimit(`addr:post:${userId}`, 60, 300);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const json = (await request.json().catch(() => null)) as unknown;
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const existing = await prisma.userAddress.count({
    where: { userId, isActive: true },
  });
  const wantDefault = parsed.data.isDefault === true || existing === 0;

  const country = parsed.data.country?.trim() || "Malaysia";
  const label =
    parsed.data.label === undefined ? null : parsed.data.label?.trim() || null;

  const row = await prisma.$transaction(async (tx) => {
    if (wantDefault) {
      await tx.userAddress.updateMany({
        where: { userId, isActive: true },
        data: { isDefault: false },
      });
    }
    return tx.userAddress.create({
      data: {
        userId,
        label,
        line1: parsed.data.line1.trim(),
        city: parsed.data.city.trim(),
        postcode: parsed.data.postcode.trim(),
        country,
        isDefault: wantDefault,
      },
    });
  });

  return NextResponse.json({ address: row }, { status: 201 });
}
