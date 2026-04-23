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
 * Start password reset flow for an email address.
 */
export async function createPasswordResetForEmail(email: string) {
  return createPasswordResetForEmailImpl(email);
}

/**
 * Consume a password reset token and set a new password.
 */
export async function consumePasswordResetToken(
  rawToken: string,
  newPasswordHash: string,
) {
  return consumePasswordResetTokenImpl(rawToken, newPasswordHash);
}

/**
 * Forward GET admin session request to route handler.
 */
export async function getAdminSessionAction(request: Request) {
  return getAdminSessionRoute(request);
}

/**
 * Forward POST admin session request to route handler.
 */
export async function postAdminSessionAction(request: Request) {
  return postAdminSessionRoute(request);
}

/**
 * Forward DELETE admin session request to route handler.
 */
export async function deleteAdminSessionAction() {
  return deleteAdminSessionRoute();
}
