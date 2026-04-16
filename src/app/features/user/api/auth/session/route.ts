import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/backend/modules/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    return NextResponse.json({ user: session.user });
  }
  return NextResponse.json({ user: null });
}
