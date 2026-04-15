export type AdminSessionClaims = {
  sub: string;
  role: "SUPER_ADMIN" | "ADMIN" | "STAFF";
  isActive: boolean;
};
