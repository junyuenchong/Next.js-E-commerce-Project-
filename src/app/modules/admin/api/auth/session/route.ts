import {
  deleteAdminSessionAction,
  getAdminSessionAction,
  postAdminSessionAction,
} from "@/backend/modules/auth";

export async function GET(request: Request) {
  return getAdminSessionAction(request);
}

export async function POST(request: Request) {
  return postAdminSessionAction(request);
}

export async function DELETE() {
  return deleteAdminSessionAction();
}
