"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import http, { isAxiosError } from "@/app/utils/http";
import type { SavedAddress } from "@/shared/types";

const EMPTY_FORM = {
  label: "",
  line1: "",
  city: "",
  postcode: "",
  country: "Malaysia",
  isDefault: false,
};

async function fetchAddresses(): Promise<SavedAddress[]> {
  const { data } = await http.get<{ addresses: SavedAddress[] }>(
    "/features/user/api/addresses",
  );
  return data.addresses ?? [];
}

// Component-level hook: owns address CRUD and form state for the profile page section.
export function useAddressBookSection() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["user-addresses"],
    queryFn: fetchAddresses,
  });

  // Keep a stable array reference for downstream memo/callback dependencies.
  const addresses = useMemo(() => query.data ?? [], [query.data]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [adding, setAdding] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["user-addresses"] });
  }, [queryClient]);

  const startEdit = (address: SavedAddress) => {
    setEditingId(address.id);
    setEditForm({
      label: address.label ?? "",
      line1: address.line1,
      city: address.city,
      postcode: address.postcode,
      country: address.country,
      isDefault: address.isDefault,
    });
    setStatusMessage(null);
  };

  const cancelEdit = () => setEditingId(null);

  const addAddress = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatusMessage(null);
    if (!form.line1.trim() || !form.city.trim() || !form.postcode.trim()) {
      setStatusMessage("Fill in address line, city, and postcode.");
      return;
    }
    setAdding(true);
    try {
      await http.post("/features/user/api/addresses", {
        label: form.label.trim() || undefined,
        line1: form.line1.trim(),
        city: form.city.trim(),
        postcode: form.postcode.trim(),
        country: form.country.trim() || "Malaysia",
        isDefault: form.isDefault,
      });
      setForm(EMPTY_FORM);
      setStatusMessage("Address saved.");
      invalidate();
    } catch (error: unknown) {
      setStatusMessage(
        isAxiosError(error) && error.response?.status === 400
          ? "Check your inputs."
          : "Could not save address.",
      );
    } finally {
      setAdding(false);
    }
  };

  const saveEdit = async () => {
    if (editingId == null) return;
    setStatusMessage(null);
    const previousAddress = addresses.find(
      (address) => address.id === editingId,
    );
    try {
      const body: Record<string, unknown> = {
        label: editForm.label.trim() || null,
        line1: editForm.line1.trim(),
        city: editForm.city.trim(),
        postcode: editForm.postcode.trim(),
        country: editForm.country.trim(),
      };
      if (!previousAddress?.isDefault && editForm.isDefault) {
        body.isDefault = true;
      }
      await http.patch(`/features/user/api/addresses/${editingId}`, body);
      setEditingId(null);
      setStatusMessage("Address updated.");
      invalidate();
    } catch {
      setStatusMessage("Could not update address.");
    }
  };

  const setDefault = async (id: number) => {
    setStatusMessage(null);
    try {
      await http.patch(`/features/user/api/addresses/${id}`, {
        isDefault: true,
      });
      invalidate();
    } catch {
      setStatusMessage("Could not set default.");
    }
  };

  const remove = async (id: number) => {
    if (!globalThis.confirm("Remove this address?")) return;
    setStatusMessage(null);
    try {
      await http.delete(`/features/user/api/addresses/${id}`);
      if (editingId === id) setEditingId(null);
      invalidate();
    } catch {
      setStatusMessage("Could not remove address.");
    }
  };

  const editingIsDefault = useMemo(() => {
    if (editingId == null) return false;
    return (
      addresses.find((address) => address.id === editingId)?.isDefault ?? false
    );
  }, [addresses, editingId]);

  return {
    addresses,
    isLoading: query.isLoading,
    msg: statusMessage,
    adding,
    form,
    setForm,
    editingId,
    editForm,
    setEditForm,
    editingIsDefault,
    addAddress,
    startEdit,
    cancelEdit,
    saveEdit,
    setDefault,
    remove,
  };
}
