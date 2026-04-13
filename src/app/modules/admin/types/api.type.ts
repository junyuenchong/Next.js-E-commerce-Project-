import type { z } from "zod";
import {
  adminCategoryCreateBodySchema,
  adminCategoryPatchBodySchema,
} from "../schema/category-api.schema";
import { adminUserPatchBodySchema } from "../schema/users-api.schema";
import {
  adminRolePatchPermissionsSchema,
  adminRolePatchProfileMetaSchema,
  adminRolePostBodySchema,
} from "../schema/role-config.schema";
import { updateOrderStatusSchema } from "../schema/order.schema";
import { updateReviewReplySchema } from "../schema/review.schema";

export type AdminCategoryCreateBody = z.infer<
  typeof adminCategoryCreateBodySchema
>;
export type AdminCategoryPatchBody = z.infer<
  typeof adminCategoryPatchBodySchema
>;
export type AdminUserPatchBody = z.infer<typeof adminUserPatchBodySchema>;
export type AdminRolePatchPermissionsBody = z.infer<
  typeof adminRolePatchPermissionsSchema
>;
export type AdminRolePatchProfileMetaBody = z.infer<
  typeof adminRolePatchProfileMetaSchema
>;
export type AdminRolePostBody = z.infer<typeof adminRolePostBodySchema>;
export type AdminUpdateOrderStatusBody = z.infer<
  typeof updateOrderStatusSchema
>;
export type AdminUpdateReviewReplyBody = z.infer<
  typeof updateReviewReplySchema
>;
