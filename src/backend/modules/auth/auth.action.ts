// Feature: Defines auth server actions for admin session lifecycle operations.
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

// Feature: start password-reset flow by issuing reset token for email.
export async function createPasswordResetForEmail(email: string) {
  return createPasswordResetForEmailImpl(email);
}

// Guard: consume reset token to set a new password hash.
export async function consumePasswordResetToken(
  rawToken: string,
  newPasswordHash: string,
) {
  return consumePasswordResetTokenImpl(rawToken, newPasswordHash);
}

// Feature: read current cookie-based admin session for admin app.
export async function getAdminSessionAction(request: Request) {
  return getAdminSessionRoute(request);
}

// Feature: create admin session (login) and set admin cookie.
export async function postAdminSessionAction(request: Request) {
  return postAdminSessionRoute(request);
}

// Feature: destroy admin session cookie for logout.
export async function deleteAdminSessionAction() {
  return deleteAdminSessionRoute();
}
