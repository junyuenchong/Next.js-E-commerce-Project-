import type { PrismaClient } from "@prisma/client";

const BUILTIN_ROLE_SLUGS = ["super_admin", "admin", "staff"] as const;

/** Matches migrations + `src/backend/lib/permissions.ts` defaults. */
const ADMIN_PERMISSION_SEED_ROWS: {
  key: string;
  label: string;
  sortOrder: number;
}[] = [
  { key: "user.read", label: "View users", sortOrder: 0 },
  { key: "user.update", label: "Edit users (role, profile)", sortOrder: 1 },
  { key: "user.ban", label: "Block or activate users", sortOrder: 2 },
  { key: "order.read", label: "View orders", sortOrder: 3 },
  { key: "order.update", label: "Update orders", sortOrder: 4 },
  { key: "order.refund", label: "Refund orders", sortOrder: 5 },
  { key: "product.create", label: "Create products", sortOrder: 6 },
  { key: "product.update", label: "Edit products & categories", sortOrder: 7 },
  { key: "product.delete", label: "Delete products", sortOrder: 8 },
  { key: "coupon.read", label: "View coupons", sortOrder: 9 },
  { key: "coupon.manage", label: "Create & edit coupons", sortOrder: 10 },
  {
    key: "role.profile.delete",
    label: "Remove permission profiles",
    sortOrder: 11,
  },
  {
    key: "role.profile.update",
    label: "Edit permission profiles",
    sortOrder: 12,
  },
  { key: "audit.read", label: "View admin audit log", sortOrder: 13 },
  { key: "*", label: "Full access (all permissions)", sortOrder: 100 },
];

const BUILTIN_ROLE_GRANTS: Record<
  (typeof BUILTIN_ROLE_SLUGS)[number],
  readonly string[]
> = {
  super_admin: ["*"],
  admin: [
    "user.read",
    "user.update",
    "user.ban",
    "order.read",
    "order.update",
    "order.refund",
    "product.create",
    "product.update",
    "product.delete",
    "coupon.read",
    "coupon.manage",
    "role.profile.update",
    "audit.read",
  ],
  staff: ["user.read", "order.read", "coupon.read", "audit.read"],
};

const BUILTIN_ROLE_META: Record<
  (typeof BUILTIN_ROLE_SLUGS)[number],
  { name: string; sortOrder: number }
> = {
  super_admin: { name: "Super admin", sortOrder: 0 },
  admin: { name: "Admin", sortOrder: 1 },
  staff: { name: "Staff", sortOrder: 2 },
};

const DEMO_PERMISSION_PROFILES: {
  slug: string;
  name: string;
  sortOrder: number;
  permissionKeys: string[];
}[] = [
  {
    slug: "warehouse_ops",
    name: "Warehouse ops",
    sortOrder: 20,
    permissionKeys: [
      "user.read",
      "order.read",
      "order.update",
      "product.update",
    ],
  },
  {
    slug: "profile_curator",
    name: "Profile curator",
    sortOrder: 21,
    permissionKeys: ["user.read", "role.profile.update", "role.profile.delete"],
  },
  {
    slug: "support_l1",
    name: "Support L1",
    sortOrder: 22,
    permissionKeys: ["user.read", "order.read"],
  },
];

async function upsertAdminRoleDefinition(
  prisma: PrismaClient,
  opts: { slug: string; name: string; isSystem: boolean; sortOrder: number },
): Promise<number> {
  const row = await prisma.adminRoleDefinition.upsert({
    where: { slug: opts.slug },
    update: {
      name: opts.name,
      isSystem: opts.isSystem,
      sortOrder: opts.sortOrder,
      isActive: true,
    },
    create: {
      slug: opts.slug,
      name: opts.name,
      isSystem: opts.isSystem,
      sortOrder: opts.sortOrder,
      isActive: true,
    },
  });
  return row.id;
}

async function ensureBuiltinAdminPermissionProfiles(prisma: PrismaClient) {
  try {
    await prisma.adminPermission.findFirst();
  } catch {
    console.log("[seed] Skipping admin RBAC (AdminPermission table missing).");
    return;
  }

  for (const row of ADMIN_PERMISSION_SEED_ROWS) {
    await prisma.adminPermission.upsert({
      where: { key: row.key },
      update: { label: row.label, sortOrder: row.sortOrder },
      create: { key: row.key, label: row.label, sortOrder: row.sortOrder },
    });
  }

  const existingBuiltins = await prisma.adminRoleDefinition.findMany({
    where: { slug: { in: [...BUILTIN_ROLE_SLUGS] } },
    select: { slug: true },
  });
  if (existingBuiltins.length >= BUILTIN_ROLE_SLUGS.length) {
    console.log(
      "[seed] Built-in permission profiles already present (super_admin, admin, staff); catalog synced.",
    );
    return;
  }

  console.log(
    "[seed] Installing built-in permission profiles (super_admin, admin, staff)…",
  );

  const permissions = await prisma.adminPermission.findMany({
    select: { id: true, key: true },
  });
  const keyToId = new Map(permissions.map((p) => [p.key, p.id] as const));

  const roleIds: Record<(typeof BUILTIN_ROLE_SLUGS)[number], number> = {
    super_admin: 0,
    admin: 0,
    staff: 0,
  };
  for (const slug of BUILTIN_ROLE_SLUGS) {
    const meta = BUILTIN_ROLE_META[slug];
    roleIds[slug] = await upsertAdminRoleDefinition(prisma, {
      slug,
      name: meta.name,
      isSystem: true,
      sortOrder: meta.sortOrder,
    });
  }

  const idList = [roleIds.super_admin, roleIds.admin, roleIds.staff];
  await prisma.adminRolePermission.deleteMany({
    where: { roleId: { in: idList } },
  });

  const grantRows: { roleId: number; permissionId: number }[] = [];
  for (const slug of BUILTIN_ROLE_SLUGS) {
    for (const key of BUILTIN_ROLE_GRANTS[slug]) {
      const permissionId = keyToId.get(key);
      if (permissionId == null) {
        console.log(
          `[seed] Warning: missing permission key "${key}" for ${slug}`,
        );
        continue;
      }
      grantRows.push({ roleId: roleIds[slug], permissionId });
    }
  }
  if (grantRows.length > 0) {
    await prisma.adminRolePermission.createMany({ data: grantRows });
  }

  console.log(
    "[seed] Built-in permission profiles ready (super_admin, admin, staff).",
  );
}

async function seedDemoPermissionProfiles(prisma: PrismaClient) {
  const allKeys = [
    ...new Set(DEMO_PERMISSION_PROFILES.flatMap((p) => p.permissionKeys)),
  ];
  let permissions: { id: number; key: string }[];
  try {
    permissions = await prisma.adminPermission.findMany({
      select: { id: true, key: true },
    });
  } catch {
    console.log(
      "[seed] Skipping demo permission profiles (AdminPermission unavailable).",
    );
    return;
  }

  const keyToId = new Map(permissions.map((p) => [p.key, p.id] as const));
  const missing = allKeys.filter((k) => !keyToId.has(k));
  if (missing.length > 0) {
    console.log(
      `[seed] Skipping demo permission profiles — missing keys: ${missing.join(", ")}. Run migrations.`,
    );
    return;
  }

  for (const def of DEMO_PERMISSION_PROFILES) {
    try {
      const roleId = await upsertAdminRoleDefinition(prisma, {
        slug: def.slug,
        name: def.name,
        isSystem: false,
        sortOrder: def.sortOrder,
      });

      await prisma.adminRolePermission.deleteMany({ where: { roleId } });
      const rows = def.permissionKeys
        .map((key) => {
          const permissionId = keyToId.get(key);
          return permissionId != null ? { roleId, permissionId } : null;
        })
        .filter(
          (row): row is { roleId: number; permissionId: number } => row != null,
        );
      if (rows.length > 0) {
        await prisma.adminRolePermission.createMany({ data: rows });
      }
      console.log(`Permission profile ready: ${def.name} (${def.slug})`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(
        `[seed] Could not upsert permission profile "${def.slug}": ${msg}`,
      );
    }
  }
}

/**
 * Align `User.adminPermissionRoleId` with app rules: only `ADMIN` / `STAFF` may reference a custom profile.
 * (Same data fix as migration `20260420120000_clear_invalid_user_admin_permission_profile`.)
 */
async function clearInvalidUserAdminPermissionProfiles(prisma: PrismaClient) {
  const onUser = await prisma.user.updateMany({
    where: { role: "USER", adminPermissionRoleId: { not: null } },
    data: { adminPermissionRoleId: null },
  });
  const onSuper = await prisma.user.updateMany({
    where: { role: "SUPER_ADMIN", adminPermissionRoleId: { not: null } },
    data: { adminPermissionRoleId: null },
  });
  const n = onUser.count + onSuper.count;
  if (n > 0) {
    console.log(
      `[seed] Cleared adminPermissionRoleId on ${n} user row(s) (USER / SUPER_ADMIN must not use custom RBAC profiles).`,
    );
  }
}

/** Syncs permission catalog, built-ins, demo profiles, and user↔RBAC invariants (expects migrated schema). */
/** Grant new catalog keys to built-in admin/staff when permissions were added after first install. */
async function ensureCouponGrantsForBuiltins(prisma: PrismaClient) {
  try {
    await prisma.adminPermission.findFirst();
  } catch {
    return;
  }
  const adminRole = await prisma.adminRoleDefinition.findUnique({
    where: { slug: "admin" },
    select: { id: true },
  });
  const staffRole = await prisma.adminRoleDefinition.findUnique({
    where: { slug: "staff" },
    select: { id: true },
  });
  if (!adminRole || !staffRole) return;

  const read = await prisma.adminPermission.findUnique({
    where: { key: "coupon.read" },
    select: { id: true },
  });
  const manage = await prisma.adminPermission.findUnique({
    where: { key: "coupon.manage" },
    select: { id: true },
  });
  if (!read || !manage) return;

  await prisma.adminRolePermission.createMany({
    data: [
      { roleId: adminRole.id, permissionId: read.id },
      { roleId: adminRole.id, permissionId: manage.id },
      { roleId: staffRole.id, permissionId: read.id },
    ],
    skipDuplicates: true,
  });
}

export async function seedAdminPermissionData(
  prisma: PrismaClient,
): Promise<void> {
  await ensureBuiltinAdminPermissionProfiles(prisma);
  await ensureCouponGrantsForBuiltins(prisma);
  await seedDemoPermissionProfiles(prisma);
  await clearInvalidUserAdminPermissionProfiles(prisma);
}
