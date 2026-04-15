"use client";

/** Admin: customers + team, roles, permission profiles. */
import { UserRole } from "@prisma/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import http from "@/app/lib/http";
import {
  formatLoginProviderLabel,
  type LoginProviderId,
} from "@/app/lib/login-providers";
import Link from "next/link";
import {
  setUserActiveAction,
  setUserRoleAction,
  updateUserProfileAdminAction,
} from "@/app/modules/admin/actions/userAdminActions";
import { useSearchParams } from "next/navigation";

type U = {
  id: number;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  loginProviders: LoginProviderId[];
  adminPermissionRoleId: number | null;
};

type RoleConfigResponse = {
  roles: { id: number; slug: string; name: string; isActive?: boolean }[];
};

type Me = {
  id?: string;
  role: UserRole;
  can: {
    userRead: boolean;
    userUpdate: boolean;
    userBan: boolean;
    couponRead?: boolean;
    couponManage?: boolean;
  };
};

async function fetchAdminMe(): Promise<Me> {
  const { data } = await http.get<Me>("/modules/admin/api/me");
  return data;
}

function UserLeadCells({ u }: { u: U }) {
  return (
    <>
      <td className="p-3">{u.id}</td>
      <td className="p-3 break-all max-w-[200px]">{u.email}</td>
      <td className="p-3">{u.name ?? "—"}</td>
      <td className="p-3">
        <div className="flex flex-wrap gap-1">
          {u.loginProviders.length === 0 ? (
            <span className="text-xs text-gray-400">—</span>
          ) : (
            u.loginProviders.map((p) => (
              <span
                key={p}
                className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-100 text-gray-700"
              >
                {formatLoginProviderLabel(p)}
              </span>
            ))
          )}
        </div>
      </td>
    </>
  );
}

function UserTailCells({
  u,
  canBan,
  canUpdate,
  onToggleActive,
  onEdit,
}: {
  u: U;
  canBan: boolean;
  canUpdate: boolean;
  onToggleActive: (userId: number, isActive: boolean) => void;
  onEdit: (u: U) => void;
}) {
  return (
    <>
      <td className="p-3">
        <button
          type="button"
          className={`text-xs px-2 py-1 rounded disabled:opacity-50 ${u.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
          disabled={u.isActive ? !canBan : !canUpdate}
          onClick={() => void onToggleActive(u.id, !u.isActive)}
        >
          {u.isActive ? "active" : "blocked"}
        </button>
      </td>
      <td className="p-3">
        <button
          type="button"
          className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-50"
          disabled={!canUpdate}
          onClick={() => onEdit(u)}
        >
          Edit
        </button>
      </td>
    </>
  );
}

export default function AdminUsersPage() {
  const searchParams = useSearchParams();
  const { data: me } = useQuery({
    queryKey: ["admin-me"],
    queryFn: fetchAdminMe,
    staleTime: 60_000,
  });

  const isSuper = String(me?.role ?? "") === "SUPER_ADMIN";

  const { data: roleCfg } = useQuery({
    queryKey: ["admin-role-config"],
    queryFn: async () => {
      const { data } = await http.get<RoleConfigResponse>(
        "/modules/admin/api/role-config",
      );
      return data;
    },
    enabled: isSuper,
    staleTime: 60_000,
  });

  const [rows, setRows] = useState<U[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkCouponId, setBulkCouponId] = useState<number | "">("");
  const [bulkSendEmail, setBulkSendEmail] = useState(false);
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkBanner, setBulkBanner] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  const couponsQuery = useQuery({
    queryKey: ["admin-coupons-list-for-assign"],
    queryFn: async () => {
      const { data } = await http.get<
        {
          id: number;
          code: string;
          isActive: boolean;
          redemptionScope?: "PUBLIC" | "ASSIGNED_USERS";
        }[]
      >("/modules/admin/api/coupons");
      return Array.isArray(data) ? data : [];
    },
    enabled: Boolean(me?.can?.couponRead || me?.can?.couponManage),
    staleTime: 30_000,
  });

  const loadInitial = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await http.get<{
        users: U[];
        nextCursor: number | null;
      }>("/modules/admin/api/users?limit=50");
      setRows(Array.isArray(data.users) ? data.users : []);
      setNextCursor(data.nextCursor ?? null);
      setErr(null);
    } catch {
      setErr("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (nextCursor == null) return;
    try {
      setLoadingMore(true);
      const { data } = await http.get<{
        users: U[];
        nextCursor: number | null;
      }>(`/modules/admin/api/users?cursor=${nextCursor}&limit=50`);
      setRows((r) => [...r, ...(Array.isArray(data.users) ? data.users : [])]);
      setNextCursor(data.nextCursor ?? null);
    } catch {
      setErr("Failed to load more users");
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const canBan = me?.can.userBan ?? false;
  const canUpdate = me?.can.userUpdate ?? false;
  const canManageCoupons = Boolean(me?.can?.couponManage);

  const customers = useMemo(
    () => rows.filter((u) => u.role === "USER"),
    [rows],
  );
  const team = useMemo(() => rows.filter((u) => u.role !== "USER"), [rows]);

  const allCustomersSelected =
    customers.length > 0 &&
    customers.every((u) => selectedCustomerIds.has(u.id));

  const toggleCustomerSelected = useCallback((id: number) => {
    setSelectedCustomerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAllCustomers = useCallback(() => {
    setSelectedCustomerIds((prev) => {
      const next = new Set(prev);
      const all =
        customers.length > 0 && customers.every((u) => next.has(u.id));
      if (all) {
        for (const u of customers) next.delete(u.id);
      } else {
        for (const u of customers) next.add(u.id);
      }
      return next;
    });
  }, [customers]);

  const clearSelection = useCallback(
    () => setSelectedCustomerIds(new Set()),
    [],
  );

  const openBulkAssign = useCallback(() => {
    setBulkBanner(null);
    setBulkCouponId("");
    setBulkSendEmail(false);
    setBulkMessage("");
    setBulkOpen(true);
  }, []);

  useEffect(() => {
    const raw = searchParams.get("couponId");
    if (!raw) return;
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 1) return;
    if (!canManageCoupons) return;
    setBulkCouponId(n);
    setBulkOpen(true);
  }, [searchParams, canManageCoupons]);

  const submitBulkAssign = useCallback(async () => {
    if (!canManageCoupons) return;
    if (bulkCouponId === "") {
      setBulkBanner({ kind: "err", text: "Select a coupon first." });
      return;
    }
    const userIds = Array.from(selectedCustomerIds);
    if (userIds.length === 0) {
      setBulkBanner({ kind: "err", text: "Select at least one customer." });
      return;
    }
    setBulkBusy(true);
    setBulkBanner(null);
    try {
      const { data } = await http.post<{
        ok: boolean;
        created: number;
        emailed: number;
      }>("/modules/admin/api/user-vouchers/bulk", {
        couponId: bulkCouponId,
        userIds,
        sendEmail: bulkSendEmail,
        message: bulkMessage.trim() || undefined,
      });
      setBulkBanner({
        kind: "ok",
        text: `Assigned voucher to ${userIds.length} users (new: ${data.created}). Emails sent: ${data.emailed}.`,
      });
    } catch {
      setBulkBanner({
        kind: "err",
        text: "Bulk assign failed. Check your permissions.",
      });
    } finally {
      setBulkBusy(false);
    }
  }, [
    canManageCoupons,
    bulkCouponId,
    bulkMessage,
    bulkSendEmail,
    selectedCustomerIds,
  ]);

  const toggleActive = async (userId: number, isActive: boolean) => {
    const r = await setUserActiveAction(userId, isActive);
    if (!r.ok) {
      setErr("Update failed");
      return;
    }
    await loadInitial();
  };

  const setRole = async (userId: number, role: UserRole) => {
    const r = await setUserRoleAction(userId, role);
    if (!r.ok) {
      setErr("Role update failed");
      return;
    }
    await loadInitial();
  };

  const openEdit = (u: U) => {
    setEditingId(u.id);
    setDraftName(u.name ?? "");
    setDraftEmail(u.email);
    setProfileErr(null);
  };

  const closeEdit = () => {
    setEditingId(null);
    setProfileErr(null);
  };

  const saveProfile = async () => {
    if (editingId == null) return;
    setProfileSaving(true);
    setProfileErr(null);
    try {
      const r = await updateUserProfileAdminAction(
        editingId,
        draftEmail,
        draftName,
      );
      if (!r.ok) {
        if (r.error === "email_taken") {
          setProfileErr("That email is already in use.");
        } else {
          setProfileErr("Could not save profile.");
        }
      } else {
        closeEdit();
        await loadInitial();
      }
    } finally {
      setProfileSaving(false);
    }
  };

  const setPermissionProfile = async (userId: number, roleIdStr: string) => {
    setErr(null);
    try {
      const adminPermissionRoleId =
        roleIdStr === "" ? null : Number.parseInt(roleIdStr, 10);
      if (
        adminPermissionRoleId != null &&
        !Number.isFinite(adminPermissionRoleId)
      ) {
        setErr("Invalid permission profile");
        return;
      }
      await http.patch("/modules/admin/api/users", {
        action: "permissionProfile",
        userId,
        adminPermissionRoleId,
      });
      await loadInitial();
    } catch {
      setErr("Permission profile update failed");
    }
  };

  if (loading) return <p className="text-gray-600">Loading users…</p>;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">Users</h1>
        <Link
          href="/modules/admin/role-permissions"
          className="text-sm text-blue-600 hover:underline"
        >
          Permission profiles →
        </Link>
      </div>
      {err && <p className="text-red-600 text-sm">{err}</p>}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">Customers</h2>
        <p className="text-sm text-gray-600">
          Store accounts only. Change role with the dropdown to add someone to
          the admin team.
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm">
          <div className="text-gray-700">
            Selected:{" "}
            <span className="font-semibold">{selectedCustomerIds.size}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openBulkAssign}
              disabled={!canManageCoupons || selectedCustomerIds.size === 0}
              className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              title={
                !canManageCoupons
                  ? "Requires coupon.manage permission"
                  : selectedCustomerIds.size === 0
                    ? "Select customers first"
                    : "Assign voucher"
              }
            >
              Give voucher…
            </button>
            <button
              type="button"
              onClick={clearSelection}
              disabled={selectedCustomerIds.size === 0}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              Clear selection
            </button>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3 w-[44px]">
                  <input
                    type="checkbox"
                    checked={allCustomersSelected}
                    onChange={toggleSelectAllCustomers}
                    aria-label="Select all customers in this list"
                  />
                </th>
                <th className="p-3">ID</th>
                <th className="p-3">Email</th>
                <th className="p-3">Name</th>
                <th className="p-3">Sign-in</th>
                <th className="p-3">Role</th>
                <th className="p-3">Active</th>
                <th className="p-3">Profile</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="p-4 text-center text-gray-500 text-sm"
                  >
                    No customer accounts in this list.
                  </td>
                </tr>
              ) : (
                customers.map((u) => (
                  <tr key={u.id} className="border-t border-gray-100 align-top">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedCustomerIds.has(u.id)}
                        onChange={() => toggleCustomerSelected(u.id)}
                        aria-label={`Select user ${u.id}`}
                      />
                    </td>
                    <UserLeadCells u={u} />
                    <td className="p-3">
                      <select
                        className="border rounded px-2 py-1 text-xs disabled:opacity-50 max-w-[11rem]"
                        value={u.role}
                        disabled={!canUpdate}
                        onChange={(e) =>
                          void setRole(u.id, e.target.value as UserRole)
                        }
                        aria-label={`Role for user ${u.id}`}
                      >
                        <option value="USER">USER (customer)</option>
                        <option value="STAFF">STAFF</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                    <UserTailCells
                      u={u}
                      canBan={canBan}
                      canUpdate={canUpdate}
                      onToggleActive={toggleActive}
                      onEdit={openEdit}
                    />
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {bulkOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Give voucher to customers
                </h3>
                <p className="mt-1 text-xs text-gray-600">
                  Selected users: {selectedCustomerIds.size}. This sets coupon
                  redemption to <span className="font-medium">Targeted</span>{" "}
                  and assigns it to these accounts.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBulkOpen(false)}
                className="text-sm text-gray-600 hover:text-black"
              >
                ✕
              </button>
            </div>

            {bulkBanner ? (
              <div
                className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
                  bulkBanner.kind === "ok"
                    ? "border-green-200 bg-green-50 text-green-900"
                    : "border-red-200 bg-red-50 text-red-800"
                }`}
              >
                {bulkBanner.text}
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              <label className="block text-sm text-gray-800">
                Coupon
                <select
                  value={bulkCouponId === "" ? "" : String(bulkCouponId)}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) {
                      setBulkCouponId("");
                      return;
                    }
                    const n = Number.parseInt(v, 10);
                    setBulkCouponId(Number.isFinite(n) ? n : "");
                  }}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  disabled={!canManageCoupons}
                >
                  <option value="">Select coupon…</option>
                  {(couponsQuery.data ?? [])
                    .filter((c) => c.isActive)
                    .map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.code}
                      </option>
                    ))}
                </select>
                <span className="mt-1 block text-xs text-gray-500">
                  If you don’t see a code, ensure you have{" "}
                  <code>coupon.read</code> permission.
                </span>
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={bulkSendEmail}
                  onChange={(e) => setBulkSendEmail(e.target.checked)}
                  disabled={!canManageCoupons}
                />
                Send email to selected users
              </label>

              {bulkSendEmail ? (
                <label className="block text-sm text-gray-800">
                  Optional message
                  <textarea
                    value={bulkMessage}
                    onChange={(e) => setBulkMessage(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    rows={3}
                    placeholder="Short campaign note (optional)"
                  />
                </label>
              ) : null}
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setBulkOpen(false)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm"
                disabled={bulkBusy}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => void submitBulkAssign()}
                disabled={!canManageCoupons || bulkBusy}
                className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {bulkBusy ? "Assigning…" : "Assign voucher"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">Admin team</h2>
        <p className="text-sm text-gray-600">
          Staff and admins can use a permission profile for fine-grained access.
          Super admin accounts are not created here — run{" "}
          <code className="rounded bg-gray-100 px-1 py-0.5 text-[11px]">
            npm run db:seed
          </code>{" "}
          with{" "}
          <code className="rounded bg-gray-100 px-1 py-0.5 text-[11px]">
            ADMIN_SEED_EMAIL
          </code>{" "}
          /{" "}
          <code className="rounded bg-gray-100 px-1 py-0.5 text-[11px]">
            ADMIN_SEED_PASSWORD
          </code>
          .
        </p>
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Email</th>
                <th className="p-3">Name</th>
                <th className="p-3">Sign-in</th>
                <th className="p-3">Role</th>
                {isSuper && (
                  <th className="p-3">
                    Permission profile
                    <span className="block text-[11px] font-normal text-gray-500">
                      Admin / staff only
                    </span>
                  </th>
                )}
                <th className="p-3">Active</th>
                <th className="p-3">Profile</th>
              </tr>
            </thead>
            <tbody>
              {team.length === 0 ? (
                <tr>
                  <td
                    colSpan={isSuper ? 8 : 7}
                    className="p-4 text-center text-gray-500 text-sm"
                  >
                    No admin team members yet.
                  </td>
                </tr>
              ) : (
                team.map((u) => (
                  <tr key={u.id} className="border-t border-gray-100 align-top">
                    <UserLeadCells u={u} />
                    <td className="p-3">
                      {u.role === "SUPER_ADMIN" ? (
                        <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-900">
                          Super admin
                        </span>
                      ) : (
                        <select
                          className="border rounded px-2 py-1 text-xs disabled:opacity-50 max-w-[11rem]"
                          value={u.role}
                          disabled={!canUpdate}
                          onChange={(e) =>
                            void setRole(u.id, e.target.value as UserRole)
                          }
                        >
                          <option value="USER">USER (customer)</option>
                          <option value="STAFF">STAFF</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      )}
                    </td>
                    {isSuper && (
                      <td className="p-3 align-top">
                        {u.role === "SUPER_ADMIN" || u.role === "USER" ? (
                          <span
                            className="text-xs text-gray-400"
                            title={
                              u.role === "USER"
                                ? "Customers do not use admin permission profiles"
                                : "Super admins use built-in permissions"
                            }
                          >
                            —
                          </span>
                        ) : (
                          <select
                            className="border rounded px-2 py-1 text-xs max-w-[11rem]"
                            value={
                              u.adminPermissionRoleId != null
                                ? String(u.adminPermissionRoleId)
                                : ""
                            }
                            onChange={(e) =>
                              void setPermissionProfile(u.id, e.target.value)
                            }
                          >
                            <option value="">Default (from role)</option>
                            {(roleCfg?.roles ?? [])
                              .filter((r) => r.isActive !== false)
                              .map((r) => (
                                <option key={r.id} value={String(r.id)}>
                                  {r.name}
                                </option>
                              ))}
                          </select>
                        )}
                      </td>
                    )}
                    <UserTailCells
                      u={u}
                      canBan={canBan}
                      canUpdate={canUpdate}
                      onToggleActive={toggleActive}
                      onEdit={openEdit}
                    />
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {nextCursor != null && (
        <div className="pt-2">
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => void loadMore()}
            className="text-sm font-medium text-blue-600 hover:underline disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : "Load more users"}
          </button>
        </div>
      )}

      {editingId != null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={closeEdit}
          role="presentation"
        >
          <div
            className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-edit-profile-title"
          >
            <h2 id="admin-edit-profile-title" className="text-lg font-semibold">
              Edit user profile
            </h2>
            <p className="text-xs text-gray-500">User ID: {editingId}</p>
            <label className="block text-sm font-medium text-gray-800">
              Display name
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                placeholder="Optional"
              />
            </label>
            <label className="block text-sm font-medium text-gray-800">
              Email
              <input
                type="email"
                value={draftEmail}
                onChange={(e) => setDraftEmail(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                required
              />
            </label>
            {profileErr && <p className="text-sm text-red-600">{profileErr}</p>}
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                className="px-3 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50"
                onClick={closeEdit}
                disabled={profileSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-3 py-2 text-sm rounded-md bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-60"
                onClick={() => void saveProfile()}
                disabled={profileSaving || !draftEmail.trim()}
              >
                {profileSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
