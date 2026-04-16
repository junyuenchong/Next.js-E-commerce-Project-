import NextAuth from "next-auth";
import { authOptions } from "@/backend/modules/auth";

/**
 * Feature: canonical NextAuth App Router handler for user auth endpoints.
 * Guard: use shared backend auth options to keep callback/session policy consistent.
 * Note: legacy `/api/auth/*` requests are still rewritten here by middleware config.
 */
const handler = NextAuth(authOptions);
export { handler as GET };
export { handler as POST };
