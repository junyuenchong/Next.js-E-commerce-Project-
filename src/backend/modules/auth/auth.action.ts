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

export async function createPasswordResetForEmail(email: string) {
  return createPasswordResetForEmailImpl(email);
}

export async function consumePasswordResetToken(
  rawToken: string,
  newPasswordHash: string,
) {
  return consumePasswordResetTokenImpl(rawToken, newPasswordHash);
}

export async function getAdminSessionAction(request: Request) {
  return getAdminSessionRoute(request);
}

export async function postAdminSessionAction(request: Request) {
  return postAdminSessionRoute(request);
}

export async function deleteAdminSessionAction() {
  return deleteAdminSessionRoute();
}
