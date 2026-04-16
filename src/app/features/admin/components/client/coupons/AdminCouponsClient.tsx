"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import http, { getErrorMessage } from "@/app/utils/http";
import { adminApiPaths } from "@/app/features/admin/components/client";
import "react-datepicker/dist/react-datepicker.css";

type CouponDiscountType = "PERCENT" | "FIXED";

type CouponRow = {
  id: number;
  code: string;
  description: string | null;
  discountType: CouponDiscountType;
  value: number;
  minOrderSubtotal: number | null;
  maxDiscount: number | null;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
  redemptionScope: "PUBLIC" | "ASSIGNED_USERS";
  showOnStorefront: boolean;
  voucherHeadline: string | null;
  createdAt: string;
  updatedAt: string;
};

type Me = { can: { couponRead: boolean; couponManage: boolean } };

async function fetchCoupons(): Promise<CouponRow[]> {
  const { data } = await http.get<CouponRow[]>(adminApiPaths.coupons);
  return Array.isArray(data) ? data : [];
}

const emptyForm = {
  code: "",
  description: "",
  discountType: "PERCENT" as CouponDiscountType,
  value: "" as string | number,
  minOrderSubtotal: "",
  maxDiscount: "",
  startsAt: "",
  endsAt: "",
  usageLimit: "",
  isActive: true,
  redemptionScope: "PUBLIC" as "PUBLIC" | "ASSIGNED_USERS",
  showOnStorefront: false,
  voucherHeadline: "",
};

function parseIsoToDate(iso: string): Date | null {
  const t = iso.trim();
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

function CouponDateTimePicker(props: {
  label: string;
  hint?: string;
  valueIso: string;
  onChangeIso: (iso: string) => void;
  placeholder?: string;
}) {
  const { label, hint, valueIso, onChangeIso, placeholder } = props;
  const selected = useMemo(() => parseIsoToDate(valueIso), [valueIso]);

  return (
    <div className="block text-sm text-gray-800">
      <span className="block">{label}</span>
      {hint ? (
        <span className="mt-0.5 block text-xs font-normal text-gray-500">
          {hint}
        </span>
      ) : null}
      <DatePicker
        selected={selected}
        onChange={(date: Date | null) => {
          onChangeIso(date ? date.toISOString() : "");
        }}
        showTimeSelect
        timeIntervals={15}
        timeCaption="Time"
        dateFormat="yyyy-MM-dd HH:mm"
        isClearable
        placeholderText={placeholder ?? "Select date & time"}
        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        wrapperClassName="block w-full mt-1"
        popperClassName="react-datepicker-z-popper"
        calendarClassName="rounded-lg border border-gray-200 shadow-lg"
      />
    </div>
  );
}

export default function AdminCouponsClient() {
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [banner, setBanner] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  // Feature: keep admin permissions responsive without constant refetch jitter.
  // Guard: login/logout path explicitly clears this cache to prevent role bleed.
  // Note: short stale window smooths route switches inside one active session.
  const meQuery = useQuery({
    queryKey: ["admin-me"],
    queryFn: async () => (await http.get<Me>("/features/admin/api/me")).data,
    staleTime: 30_000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const listQuery = useQuery({
    queryKey: ["admin-coupons-list"],
    queryFn: fetchCoupons,
    staleTime: 15_000,
  });

  const canManage = Boolean(meQuery.data?.can.couponManage);

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["admin-coupons-list"] });
  }, [qc]);

  const num = useCallback((s: string) => {
    const t = s.trim();
    if (!t) return null;
    const n = Number.parseFloat(t);
    return Number.isFinite(n) ? n : null;
  }, []);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canManage) return;
      const code = form.code.trim();
      if (!code) {
        setBanner({ kind: "err", text: "Code is required." });
        return;
      }
      const valueN =
        typeof form.value === "number" ? form.value : num(String(form.value));
      if (valueN == null || valueN <= 0) {
        setBanner({ kind: "err", text: "Value must be a positive number." });
        return;
      }
      setBanner(null);
      try {
        if (editId != null) {
          await http.patch(adminApiPaths.coupons, {
            id: editId,
            description: form.description.trim() || null,
            discountType: form.discountType,
            value: valueN,
            minOrderSubtotal: num(form.minOrderSubtotal),
            maxDiscount: num(form.maxDiscount),
            startsAt: form.startsAt.trim() || null,
            endsAt: form.endsAt.trim() || null,
            usageLimit: (() => {
              const t = form.usageLimit.trim();
              if (!t) return null;
              const n = Number.parseInt(t, 10);
              return Number.isFinite(n) && n > 0 ? n : null;
            })(),
            isActive: form.isActive,
            redemptionScope: form.redemptionScope,
            showOnStorefront: form.showOnStorefront,
            voucherHeadline: form.voucherHeadline.trim() || null,
          });
          setBanner({ kind: "ok", text: "Coupon updated." });
        } else {
          await http.post(adminApiPaths.coupons, {
            code,
            description: form.description.trim() || null,
            discountType: form.discountType,
            value: valueN,
            minOrderSubtotal: num(form.minOrderSubtotal),
            maxDiscount: num(form.maxDiscount),
            startsAt: form.startsAt.trim() || null,
            endsAt: form.endsAt.trim() || null,
            usageLimit: (() => {
              const t = form.usageLimit.trim();
              if (!t) return null;
              const n = Number.parseInt(t, 10);
              return Number.isFinite(n) && n > 0 ? n : null;
            })(),
            isActive: form.isActive,
            redemptionScope: form.redemptionScope,
            showOnStorefront: form.showOnStorefront,
            voucherHeadline: form.voucherHeadline.trim() || null,
          });
          setBanner({ kind: "ok", text: "Coupon created." });
        }
        setForm(emptyForm);
        setEditId(null);
        invalidate();
      } catch (err) {
        setBanner({
          kind: "err",
          text: getErrorMessage(err, "Request failed"),
        });
      }
    },
    [canManage, editId, form, invalidate, num],
  );

  const onEdit = useCallback((row: CouponRow) => {
    setEditId(row.id);
    setForm({
      code: row.code,
      description: row.description ?? "",
      discountType: row.discountType,
      value: row.value,
      minOrderSubtotal:
        row.minOrderSubtotal != null ? String(row.minOrderSubtotal) : "",
      maxDiscount: row.maxDiscount != null ? String(row.maxDiscount) : "",
      startsAt: row.startsAt ?? "",
      endsAt: row.endsAt ?? "",
      usageLimit: row.usageLimit != null ? String(row.usageLimit) : "",
      isActive: row.isActive,
      redemptionScope: row.redemptionScope ?? "PUBLIC",
      showOnStorefront: row.showOnStorefront,
      voucherHeadline: row.voucherHeadline ?? "",
    });
    setBanner(null);
  }, []);

  const onDeactivate = useCallback(
    async (id: number) => {
      if (!canManage) return;
      if (
        !window.confirm(
          "Deactivate this coupon? It will stop working at checkout.",
        )
      )
        return;
      setBanner(null);
      try {
        await http.delete(`${adminApiPaths.coupons}?id=${id}`);
        setBanner({ kind: "ok", text: "Coupon deactivated." });
        if (editId === id) {
          setEditId(null);
          setForm(emptyForm);
        }
        invalidate();
      } catch (err) {
        setBanner({
          kind: "err",
          text: getErrorMessage(err, "Request failed"),
        });
      }
    },
    [canManage, editId, invalidate],
  );

  const rows = listQuery.data ?? [];

  const valueHint = useMemo(() => {
    return form.discountType === "PERCENT"
      ? "Percent off subtotal (e.g. 10 = 10%). Optional max caps the discount."
      : "Fixed amount off subtotal (same currency as checkout).";
  }, [form.discountType]);

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 md:p-6">
      <div>
        <Link
          href="/features/admin/dashboard"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">
          Coupons &amp; discounts
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Codes are case-insensitive. <strong>Show on storefront</strong> adds a
          tap-to-apply card on cart and checkout. If you leave it off, shoppers
          can still use the code: share it by email, SMS, social, or ads, and
          they enter it in the <strong>Promo / coupon</strong> box on the cart
          or checkout page. PayPal is charged the discounted total. Changes are
          recorded in the{" "}
          <Link
            href="/features/admin/audit-log"
            className="text-blue-600 hover:underline"
          >
            audit log
          </Link>
          .
        </p>
      </div>

      {banner && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            banner.kind === "ok"
              ? "border-green-200 bg-green-50 text-green-900"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {banner.text}
        </div>
      )}

      {canManage ? (
        <form
          onSubmit={(e) => void onSubmit(e)}
          className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-medium text-gray-900">
            {editId != null ? `Edit coupon #${editId}` : "New coupon"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-gray-800">
              Code {!editId && <span className="text-red-600">*</span>}
              <input
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value }))
                }
                disabled={editId != null}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm uppercase disabled:bg-gray-100"
                placeholder="SAVE10"
              />
            </label>
            <label className="block text-sm text-gray-800">
              Discount type
              <select
                value={form.discountType}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    discountType: e.target.value as CouponDiscountType,
                  }))
                }
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="PERCENT">Percent (%)</option>
                <option value="FIXED">Fixed amount</option>
              </select>
            </label>
            <label className="block text-sm text-gray-800 sm:col-span-2">
              Value <span className="text-gray-500">({valueHint})</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.value}
                onChange={(e) =>
                  setForm((f) => ({ ...f, value: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm text-gray-800">
              Min. subtotal (optional)
              <input
                value={form.minOrderSubtotal}
                onChange={(e) =>
                  setForm((f) => ({ ...f, minOrderSubtotal: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="0"
              />
            </label>
            <label className="block text-sm text-gray-800">
              Max discount cap (optional, % only)
              <input
                value={form.maxDiscount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, maxDiscount: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <CouponDateTimePicker
              label="Starts (optional)"
              hint="Stored in UTC (ISO). Picker uses your local time."
              valueIso={form.startsAt}
              onChangeIso={(iso) => setForm((f) => ({ ...f, startsAt: iso }))}
              placeholder="Coupon valid from…"
            />
            <CouponDateTimePicker
              label="Ends (optional)"
              hint="Stored in UTC (ISO). Picker uses your local time."
              valueIso={form.endsAt}
              onChangeIso={(iso) => setForm((f) => ({ ...f, endsAt: iso }))}
              placeholder="Coupon valid until…"
            />
            <label className="block text-sm text-gray-800">
              Usage limit (optional)
              <input
                value={form.usageLimit}
                onChange={(e) =>
                  setForm((f) => ({ ...f, usageLimit: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Unlimited"
              />
            </label>
            <label className="block text-sm text-gray-800">
              Redemption
              <select
                value={form.redemptionScope}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    redemptionScope: e.target.value as
                      | "PUBLIC"
                      | "ASSIGNED_USERS",
                  }))
                }
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="PUBLIC">Public (anyone can use)</option>
                <option value="ASSIGNED_USERS">
                  Targeted (assigned users only)
                </option>
              </select>
              <span className="mt-0.5 block text-xs text-gray-500">
                Targeted coupons require sign-in and must be assigned to
                selected users.
              </span>
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-800 pt-6">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isActive: e.target.checked }))
                }
              />
              Active
            </label>
            <label className="flex flex-col gap-1 text-sm text-gray-800 pt-2 sm:col-span-2">
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.showOnStorefront}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      showOnStorefront: e.target.checked,
                    }))
                  }
                />
                Show on storefront (voucher strip)
              </span>
              <span className="text-xs font-normal text-gray-500 pl-6">
                Off = private campaigns only: you share the code by email, SMS,
                or social; shoppers type it on the cart or checkout page. On =
                the code also appears as a voucher card on the site.
              </span>
            </label>
            <label className="block text-sm text-gray-800 sm:col-span-2">
              Voucher headline (optional)
              <input
                value={form.voucherHeadline}
                onChange={(e) =>
                  setForm((f) => ({ ...f, voucherHeadline: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="e.g. Extra 10% off this weekend"
              />
              <span className="mt-0.5 block text-xs text-gray-500">
                Shown on the voucher card; code still applies at checkout.
              </span>
            </label>
            <label className="block text-sm text-gray-800 sm:col-span-2">
              Description (optional)
              <input
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
            >
              {editId != null ? "Save changes" : "Create coupon"}
            </button>
            {editId != null && (
              <button
                type="button"
                onClick={() => {
                  setEditId(null);
                  setForm(emptyForm);
                  setBanner(null);
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm"
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>
      ) : (
        <p className="text-sm text-gray-600">
          You can view coupons. Ask an admin to grant{" "}
          <strong>Create &amp; edit coupons</strong> to add or change codes.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                Code
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                Type
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                Value
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                Uses
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                Storefront
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                Status
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {listQuery.isLoading ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                  No coupons yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className={!r.isActive ? "bg-gray-50 text-gray-500" : ""}
                >
                  <td className="px-3 py-3 font-mono font-medium">{r.code}</td>
                  <td className="px-3 py-3">{r.discountType}</td>
                  <td className="px-3 py-3 tabular-nums">
                    {r.discountType === "PERCENT"
                      ? `${r.value}%`
                      : r.value.toFixed(2)}
                  </td>
                  <td className="px-3 py-3 tabular-nums">
                    {r.usedCount}
                    {r.usageLimit != null ? ` / ${r.usageLimit}` : ""}
                  </td>
                  <td className="px-3 py-3">
                    {r.showOnStorefront ? (
                      <span className="text-emerald-700">Yes</span>
                    ) : (
                      <span className="text-gray-400">No</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {r.isActive ? "Active" : "Inactive"}
                  </td>
                  <td className="px-3 py-3 text-right space-x-2">
                    {canManage && r.isActive ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onEdit(r)}
                          className="text-blue-600 hover:underline"
                        >
                          Edit
                        </button>
                        <Link
                          href={`/features/admin/users?couponId=${encodeURIComponent(String(r.id))}`}
                          className="text-emerald-700 hover:underline"
                          title="Assign this coupon to selected users"
                        >
                          Assign users
                        </Link>
                        <button
                          type="button"
                          onClick={() => void onDeactivate(r.id)}
                          className="text-red-600 hover:underline"
                        >
                          Deactivate
                        </button>
                      </>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
