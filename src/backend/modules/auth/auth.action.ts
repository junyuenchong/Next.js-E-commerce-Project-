// defines auth server actions for admin session lifecycle operations.
"use server";

import {
  deleteAdminSessionRoute,
  getAdminSessionRoute,
  postAdminSessionRoute,
} from "./admin-session.route-handler";
import {
  consumePasswordResetToken as consumePasswordResetTokenImpl,
  createPasswordResetForEmail as createPasswordResetForEmailImpl,
} from "./auth.service";

/**
 * Handles create password reset for email.
 */
export async function createPasswordResetForEmail(email: string) {
  return createPasswordResetForEmailImpl(email);
}

/**
 * Handles consume password reset token.
 */
export async function consumePasswordResetToken(
  rawToken: string,
  newPasswordHash: string,
) {
  return consumePasswordResetTokenImpl(rawToken, newPasswordHash);
}

/**
 * Handles get admin session action.
 */
export async function getAdminSessionAction(request: Request) {
  return getAdminSessionRoute(request);
}

/**
 * Handles post admin session action.
 */
export async function postAdminSessionAction(request: Request) {
  return postAdminSessionRoute(request);
}

/**
 * Handles delete admin session action.
 */
export async function deleteAdminSessionAction() {
  return deleteAdminSessionRoute();
}
