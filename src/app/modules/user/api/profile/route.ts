import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/app/lib/prisma";
import { resolveUserId } from "@/backend/lib/session";
import { loginProvidersFromRow } from "@/app/lib/login-providers";

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
});

export async function GET() {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true,
      passwordHash: true,
      accounts: { select: { provider: true } },
    },
  });

  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { passwordHash, accounts, ...rest } = row;
  return NextResponse.json({
    user: {
      ...rest,
      hasPassword: Boolean(passwordHash),
      loginProviders: loginProvidersFromRow(passwordHash, accounts),
    },
  });
}

export async function PATCH(request: Request) {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const json = (await request.json().catch(() => null)) as unknown;
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
    },
    select: { id: true, name: true, email: true, image: true, role: true },
  });

  return NextResponse.json({ user: updated });
}
