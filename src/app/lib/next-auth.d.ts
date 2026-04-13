import type { UserRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: UserRole;
      isActive: boolean;
      /** Linked sign-in methods: local = email/password, plus OAuth providers. */
      loginProviders?: ("local" | "google" | "facebook")[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
    isActive?: boolean;
    /** JSON-stringified `("local"|"google"|"facebook")[]` */
    loginProvidersJson?: string;
  }
}
