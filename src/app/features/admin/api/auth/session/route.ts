/**
 * Admin HTTP route: auth/session.
 */

import {
  deleteAdminSessionAction,
  getAdminSessionAction,
  postAdminSessionAction,
} from "@/backend/modules/auth";

// Read current admin session state.
export async function GET(request: Request) {
  return getAdminSessionAction(request);
}

// Create admin session from sign-in payload.
export async function POST(request: Request) {
  return postAdminSessionAction(request);
}

// Clear current admin session.
export async function DELETE() {
  return deleteAdminSessionAction();
}
