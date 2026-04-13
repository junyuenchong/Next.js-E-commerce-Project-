import type { ReactNode } from "react";

/** User-facing labels for common payload keys (catalog, orders, users). */
const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  description: "Description",
  price: "Price",
  compareAtPrice: "Compare-at price",
  stock: "Stock",
  categoryId: "Category",
  imageUrl: "Image",
  slug: "Slug",
  name: "Name",
  email: "Email",
  role: "Role",
  from: "Previous",
  to: "New",
  bytes: "Upload size",
  permissionCount: "Permissions assigned",
  adminPermissionRoleId: "Permission profile",
  hasReply: "Reply set",
  restored: "Restored profile",
  fields: "Fields changed",
  discountType: "Discount type",
  code: "Code",
};

function labelForKey(key: string): string {
  return (
    FIELD_LABELS[key] ??
    key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (c) => c.toUpperCase())
      .trim()
  );
}

function formatScalar(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value > 512 * 1024) return `${(value / 1024).toFixed(0)} KB`;
    return String(value);
  }
  if (typeof value === "string")
    return value.length > 120 ? `${value.slice(0, 117)}…` : value;
  return JSON.stringify(value);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Renders audit `metadata` as short, labeled lines. Falls back to indented JSON for uncommon shapes.
 */
export function AuditLogDetailsCell(props: {
  action: string;
  metadata: unknown;
}): ReactNode {
  const { action, metadata } = props;

  if (metadata == null) {
    return <span className="text-gray-400">—</span>;
  }

  const lines: { label: string; value: string }[] = [];

  if (isPlainObject(metadata)) {
    const m = metadata;

    if (action === "product.update") {
      if (typeof m.slug === "string") {
        lines.push({ label: "Product slug", value: m.slug });
      }
      if (Array.isArray(m.fields)) {
        const fieldKeys = m.fields.filter(
          (x): x is string => typeof x === "string",
        );
        if (fieldKeys.length > 0) {
          lines.push({
            label: "Changes",
            value: fieldKeys.map(labelForKey).join(" · "),
          });
        }
      }
    } else if (action === "coupon.create") {
      if (typeof m.code === "string")
        lines.push({ label: "Code", value: m.code });
      if (m.discountType != null)
        lines.push({ label: "Type", value: String(m.discountType) });
      if (typeof m.value === "number")
        lines.push({ label: "Value", value: String(m.value) });
    } else if (action === "product.create" && typeof m.title === "string") {
      lines.push({ label: "Title", value: m.title });
    } else if (action === "product.soft_delete" && typeof m.slug === "string") {
      lines.push({ label: "Slug", value: m.slug });
    } else if (
      (action === "order.status" || action === "order.refund") &&
      (m.from != null || m.to != null)
    ) {
      if (m.from != null)
        lines.push({ label: "Previous status", value: String(m.from) });
      if (m.to != null)
        lines.push({ label: "New status", value: String(m.to) });
    } else if (
      (action === "user.ban" ||
        action === "user.activate" ||
        action === "user.profile_update") &&
      typeof m.email === "string"
    ) {
      lines.push({ label: "Account", value: m.email });
    } else if (action === "user.role_change" && m.role != null) {
      lines.push({ label: "New role", value: String(m.role) });
    } else if (action === "user.permission_profile") {
      if (m.adminPermissionRoleId === null) {
        lines.push({
          label: "Permission profile",
          value: "Cleared (built-in role defaults)",
        });
      } else if (typeof m.adminPermissionRoleId === "number") {
        lines.push({
          label: "Profile ID",
          value: String(m.adminPermissionRoleId),
        });
      }
    } else if (action === "category.create" || action === "category.update") {
      if (typeof m.name === "string")
        lines.push({ label: "Name", value: m.name });
    } else if (action === "review.reply" && typeof m.hasReply === "boolean") {
      lines.push({
        label: "Staff reply",
        value: m.hasReply ? "Saved" : "Cleared",
      });
    } else if (action === "media.upload") {
      if (typeof m.bytes === "number") {
        const kb = m.bytes / 1024;
        lines.push({
          label: "Source file",
          value: `${kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(2)} MB`} (approx.)`,
        });
      }
    } else if (action.startsWith("role.")) {
      if (typeof m.slug === "string")
        lines.push({ label: "Profile slug", value: m.slug });
      if (typeof m.name === "string")
        lines.push({ label: "Display name", value: m.name });
      if (typeof m.permissionCount === "number") {
        lines.push({ label: "Permissions", value: String(m.permissionCount) });
      }
      if (m.restored === true)
        lines.push({
          label: "Note",
          value: "Previously inactive profile reactivated",
        });
    }

    if (lines.length === 0) {
      for (const [key, val] of Object.entries(m)) {
        if (val === undefined) continue;
        if (Array.isArray(val)) {
          lines.push({
            label: labelForKey(key),
            value: val
              .map((x) =>
                typeof x === "string" ? labelForKey(x) : formatScalar(x),
              )
              .join(", "),
          });
        } else if (isPlainObject(val)) {
          lines.push({ label: labelForKey(key), value: JSON.stringify(val) });
        } else {
          lines.push({ label: labelForKey(key), value: formatScalar(val) });
        }
      }
    }
  } else if (Array.isArray(metadata)) {
    lines.push({
      label: "Values",
      value: metadata.map(formatScalar).join(", "),
    });
  } else {
    lines.push({ label: "Value", value: formatScalar(metadata) });
  }

  if (lines.length === 0) {
    return <span className="text-gray-400">—</span>;
  }

  return (
    <dl className="max-w-md space-y-1.5 text-xs leading-snug">
      {lines.map(({ label, value }, i) => (
        <div
          key={`${label}-${i}`}
          className="grid grid-cols-[minmax(0,auto)_1fr] gap-x-3 gap-y-0.5"
        >
          <dt className="shrink-0 font-medium text-gray-500">{label}</dt>
          <dd className="min-w-0 break-words text-gray-800">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Collapsible JSON for verification or uncommon payloads. */
export function AuditLogDetailsRawToggle(props: {
  metadata: unknown;
}): ReactNode {
  const { metadata } = props;
  if (metadata == null) return null;
  if (typeof metadata !== "object") return null;

  let raw: string;
  try {
    raw = JSON.stringify(metadata, null, 2);
  } catch {
    raw = String(metadata);
  }

  return (
    <details className="mt-2 text-[11px]">
      <summary className="cursor-pointer select-none font-medium text-gray-500 hover:text-gray-800">
        View raw JSON
      </summary>
      <pre className="mt-1.5 max-h-44 overflow-auto rounded-md border border-gray-200 bg-gray-50/80 p-2.5 font-mono text-[10px] leading-relaxed text-gray-700 shadow-inner">
        {raw}
      </pre>
    </details>
  );
}
