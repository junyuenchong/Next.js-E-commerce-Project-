/** Sidebar / `GET /modules/admin/api/me` client shape (subset). */
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
  can: AdminMeCan;
};
