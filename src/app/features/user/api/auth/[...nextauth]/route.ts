import NextAuth from "next-auth";
import { authOptions } from "@/backend/modules/auth";

/**
 * nextauth api route
 * handle nextauth GET and POST requests
 */
const handler = NextAuth(authOptions);
export { handler as GET };
export { handler as POST };
