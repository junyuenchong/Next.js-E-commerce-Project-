import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/app/lib/prisma";
import { resolveUserId } from "@/backend/core/session";
import { loginProvidersFromRow } from "@/backend/modules/auth/dto/login-providers.dto";

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
});

// Returns current user profile data for the account page.
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

// Updates editable profile fields for the authenticated user.
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
