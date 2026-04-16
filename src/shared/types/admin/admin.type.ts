import type { UserRole } from "@prisma/client";

export type AdminMeCan = {
  userRead: boolean;
  orderRead: boolean;
  productCreate?: boolean;
  productUpdate?: boolean;
  productDelete?: boolean;
  couponRead?: boolean;
  couponManage?: boolean;
  auditRead?: boolean;
};

export type AdminMe = {
  role?: UserRole;
  can: AdminMeCan;
};
