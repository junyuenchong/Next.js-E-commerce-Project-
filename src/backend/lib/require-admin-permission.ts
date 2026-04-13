import {
  adminUserHasCatalogAccess,
  adminUserHasPermission,
} from "@/backend/lib/permission-resolver";
import { getCurrentAdminUser } from "@/backend/lib/session";

export class AdminActionUnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "AdminActionUnauthorizedError";
  }
}

export class AdminActionForbiddenError extends Error {
  constructor(message = "You don't have permission to do this.") {
    super(message);
    this.name = "AdminActionForbiddenError";
  }
}

export async function requireAdminPermission(
  permission: string,
): Promise<void> {
  const user = await getCurrentAdminUser();
  if (!user) throw new AdminActionUnauthorizedError();
  if (!(await adminUserHasPermission(user, permission))) {
    throw new AdminActionForbiddenError();
  }
}

export async function requireAdminCatalogAccess(): Promise<void> {
  const user = await getCurrentAdminUser();
  if (!user) throw new AdminActionUnauthorizedError();
  if (!(await adminUserHasCatalogAccess(user))) {
    throw new AdminActionForbiddenError();
  }
}
