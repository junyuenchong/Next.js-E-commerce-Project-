"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import http from "@/app/utils/http";
import Link from "next/link";

type PermissionRow = { id: number; key: string; label: string };

type RoleRow = {
  id: number;
  slug: string;
  name: string;
  isSystem: boolean;
  isActive?: boolean;
  sortOrder: number;
  permissionIds: number[];
};

type RoleConfigPayload = {
  canEditProfiles: boolean;
  canAddProfile: boolean;
  canDeleteProfile: boolean;
  editableRoleSlugs?: string[];
  permissionCatalog: PermissionRow[];
  roles: RoleRow[];
};

const FULL_ACCESS_PERMISSION_KEY = "*";

async function fetchRoleConfig(): Promise<RoleConfigPayload> {
  const { data } = await http.get<RoleConfigPayload>(
    "/features/admin/api/role-config",
  );
  return data;
}

function groupLabel(key: string): string {
  const i = key.indexOf(".");
  return i === -1 ? "General" : key.slice(0, i);
}

export default function RolePermissionsClient() {
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-role-config"],
    queryFn: fetchRoleConfig,
    staleTime: 30_000,
  });

  const [draftByRole, setDraftByRole] = useState<Record<number, number[]>>({});
  const [nameDraft, setNameDraft] = useState<Record<number, string>>({});
  const [busyRoleId, setBusyRoleId] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!data?.roles) return;
    const next: Record<number, number[]> = {};
    const names: Record<number, string> = {};
    for (const r of data.roles) {
      if (r.isActive === false) continue;
      next[r.id] = [...r.permissionIds];
      names[r.id] = r.name;
    }
    setDraftByRole(next);
    setNameDraft(names);
  }, [data?.roles]);

  const catalogByGroup = useMemo(() => {
    const cat = data?.permissionCatalog ?? [];
    const m = new Map<string, PermissionRow[]>();
    for (const p of cat) {
      const g = groupLabel(p.key);
      const list = m.get(g) ?? [];
      list.push(p);
      m.set(g, list);
    }
    for (const list of m.values()) {
      list.sort((a, b) => a.label.localeCompare(b.label));
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [data?.permissionCatalog]);

  const permissionKeyById = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of data?.permissionCatalog ?? []) {
      map.set(p.id, p.key);
    }
    return map;
  }, [data?.permissionCatalog]);

  const togglePermission = useCallback(
    (roleId: number, permId: number, on: boolean) => {
      setDraftByRole((prev) => {
        const set = new Set(prev[roleId] ?? []);
        const targetKey = permissionKeyById.get(permId);
        const fullAccessId = [...permissionKeyById.entries()].find(
          ([, key]) => key === FULL_ACCESS_PERMISSION_KEY,
        )?.[0];

        if (on) {
          if (targetKey === FULL_ACCESS_PERMISSION_KEY) {
            // Full access must be exclusive: selecting it clears all other permissions.
            if (fullAccessId != null) {
              set.clear();
              set.add(fullAccessId);
            } else {
              set.add(permId);
            }
          } else {
            // Selecting any specific permission removes full access.
            if (fullAccessId != null) {
              set.delete(fullAccessId);
            }
            set.add(permId);
          }
        } else {
          set.delete(permId);
        }

        return { ...prev, [roleId]: [...set].sort((a, b) => a - b) };
      });
    },
    [permissionKeyById],
  );

  const savePermissions = async (roleId: number) => {
    setBusyRoleId(roleId);
    setErr(null);
    setMsg(null);
    try {
      const permissionIds = draftByRole[roleId] ?? [];
      await http.patch("/features/admin/api/role-config", {
        roleId,
        permissionIds,
      });
      setMsg("Saved permissions.");
      await qc.invalidateQueries({ queryKey: ["admin-role-config"] });
      await refetch();
    } catch {
      setErr("Could not save permissions for this profile.");
    } finally {
      setBusyRoleId(null);
    }
  };

  const saveName = async (roleId: number) => {
    const name = (nameDraft[roleId] ?? "").trim();
    if (!name) {
      setErr("Display name is required.");
      return;
    }
    setBusyRoleId(roleId);
    setErr(null);
    setMsg(null);
    try {
      await http.patch("/features/admin/api/role-config", {
        action: "profile",
        roleId,
        name,
      });
      setMsg("Profile name updated.");
      await qc.invalidateQueries({ queryKey: ["admin-role-config"] });
      await refetch();
    } catch {
      setErr("Could not rename this profile.");
    } finally {
      setBusyRoleId(null);
    }
  };

  const createProfile = async () => {
    const slug = newSlug.trim().toLowerCase();
    const name = newName.trim();
    if (!slug || !name) {
      setErr("Slug and name are required.");
      return;
    }
    setCreating(true);
    setErr(null);
    setMsg(null);
    try {
      await http.post("/features/admin/api/role-config", { slug, name });
      setNewSlug("");
      setNewName("");
      setMsg("New permission profile created.");
      await qc.invalidateQueries({ queryKey: ["admin-role-config"] });
      await refetch();
    } catch {
      setErr("Could not create profile (slug may be taken).");
    } finally {
      setCreating(false);
    }
  };

  const removeProfile = async (roleId: number) => {
    if (
      !confirm(
        "Remove this custom profile? Users assigned to it will fall back to default.",
      )
    ) {
      return;
    }
    setBusyRoleId(roleId);
    setErr(null);
    setMsg(null);
    try {
      await http.delete(`/features/admin/api/role-config?id=${roleId}`);
      setMsg("Profile removed.");
      await qc.invalidateQueries({ queryKey: ["admin-role-config"] });
      await refetch();
    } catch {
      setErr("Could not remove profile.");
    } finally {
      setBusyRoleId(null);
    }
  };

  if (isLoading) {
    return <p className="text-gray-600">Loading permission profiles…</p>;
  }

  if (error || !data) {
    return (
      <p className="text-red-600 text-sm">
        Failed to load role configuration. Check the database schema and try
        again.
      </p>
    );
  }

  const roles = (data.roles ?? []).filter((r) => r.isActive !== false);

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Permission profiles
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Custom profiles attach to team accounts on the Users page. Built-in
            super admin permissions are not edited here.
          </p>
        </div>
        <Link
          href="/features/admin/users"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Users
        </Link>
      </div>

      {msg && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
          {msg}
        </p>
      )}
      {err && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {err}
        </p>
      )}

      {data.canAddProfile && (
        <section className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">
            Add custom profile
          </h2>
          <p className="text-xs text-gray-500">
            Super admin only. Slug: lowercase letters, digits, underscore.
          </p>
          <div className="flex flex-wrap gap-2 items-end">
            <label className="text-xs block">
              <span className="text-gray-600">Slug</span>
              <input
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                className="mt-0.5 block border rounded px-2 py-1.5 text-sm w-40"
                placeholder="warehouse_lead"
              />
            </label>
            <label className="text-xs block flex-1 min-w-[12rem]">
              <span className="text-gray-600">Display name</span>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="mt-0.5 block border rounded px-2 py-1.5 text-sm w-full max-w-xs"
                placeholder="Warehouse lead"
              />
            </label>
            <button
              type="button"
              disabled={creating}
              onClick={() => void createProfile()}
              className="text-sm font-medium bg-gray-900 text-white px-3 py-2 rounded-md hover:bg-gray-800 disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create"}
            </button>
          </div>
        </section>
      )}

      <div className="space-y-6">
        {roles.map((role) => {
          const ids = new Set(draftByRole[role.id] ?? []);
          const allowedSlugs = data.editableRoleSlugs ?? [];
          const canEditByRole =
            allowedSlugs.includes("*") || allowedSlugs.includes(role.slug);
          const canEdit =
            data.canEditProfiles &&
            role.slug !== "super_admin" &&
            canEditByRole;
          const saving = busyRoleId === role.id;

          return (
            <section
              key={role.id}
              className="rounded-lg border border-gray-200 bg-white overflow-hidden"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span className="font-semibold text-gray-900 truncate">
                    {role.name}
                  </span>
                  <code className="text-[11px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                    {role.slug}
                  </code>
                  {role.isSystem && (
                    <span className="text-[10px] uppercase tracking-wide text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded">
                      system
                    </span>
                  )}
                  {role.slug === "super_admin" && (
                    <span className="text-[10px] uppercase tracking-wide text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                      all permissions locked
                    </span>
                  )}
                </div>
                {data.canDeleteProfile && !role.isSystem && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void removeProfile(role.id)}
                    className="text-xs text-red-600 hover:underline disabled:opacity-50"
                  >
                    Remove profile
                  </button>
                )}
              </div>

              <div className="p-4 space-y-3">
                <div className="flex flex-wrap gap-2 items-end">
                  <label className="text-xs block flex-1 min-w-[12rem]">
                    <span className="text-gray-600">Display name</span>
                    <input
                      value={nameDraft[role.id] ?? ""}
                      onChange={(e) =>
                        setNameDraft((d) => ({
                          ...d,
                          [role.id]: e.target.value,
                        }))
                      }
                      disabled={!canEdit || saving}
                      className="mt-0.5 block border rounded px-2 py-1.5 text-sm w-full max-w-md disabled:bg-gray-50"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={!canEdit || saving}
                    onClick={() => void saveName(role.id)}
                    className="text-sm border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Save name
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto border border-gray-100 rounded-md p-3 space-y-4 bg-gray-50/50">
                  {catalogByGroup.map(([group, perms]) => (
                    <div key={group}>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        {group}
                      </p>
                      <ul className="grid sm:grid-cols-2 gap-2">
                        {perms.map((p) => (
                          <li key={p.id} className="flex gap-2 items-start">
                            <input
                              type="checkbox"
                              id={`r${role.id}-p${p.id}`}
                              checked={ids.has(p.id)}
                              disabled={!canEdit || saving}
                              onChange={(e) =>
                                togglePermission(
                                  role.id,
                                  p.id,
                                  e.target.checked,
                                )
                              }
                              className="mt-1"
                            />
                            <label
                              htmlFor={`r${role.id}-p${p.id}`}
                              className="text-sm leading-snug cursor-pointer"
                            >
                              <span className="font-medium text-gray-800">
                                {p.label}
                              </span>
                              <span className="block text-[11px] text-gray-400 font-mono">
                                {p.key}
                              </span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    disabled={!canEdit || saving}
                    onClick={() => void savePermissions(role.id)}
                    className="text-sm font-medium bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save permissions"}
                  </button>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
