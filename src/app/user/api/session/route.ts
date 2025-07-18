import { NextResponse } from "next/server";
import { getCurrentSession } from "@/actions/auth";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

// Returns the current user session, checking custom session first, then NextAuth
export async function GET() {
  const { user: customUser } = await getCurrentSession();
  if (customUser) {
    return NextResponse.json({ user: customUser });
  }
  const nextAuthSession = await getServerSession(authOptions);
  if (nextAuthSession?.user) {
    return NextResponse.json({ user: nextAuthSession.user });
  }
  return NextResponse.json({ user: null });
} 