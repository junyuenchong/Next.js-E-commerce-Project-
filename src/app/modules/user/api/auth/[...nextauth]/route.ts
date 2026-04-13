import NextAuth from "next-auth";
import { authOptions } from "@/app/lib/authOptions";

/** Canonical NextAuth App Router handler (`SessionProvider` basePath). Legacy `/api/auth/*` rewrites here. */
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
