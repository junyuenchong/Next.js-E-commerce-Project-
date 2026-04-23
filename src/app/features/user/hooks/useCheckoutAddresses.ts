"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { http, getErrorMessage } from "@/app/lib/network";
import type { SavedAddress } from "@/shared/types";

async function fetchAddresses(): Promise<SavedAddress[]> {
  const { data } = await http.get<{ addresses: SavedAddress[] }>(
    "/features/user/api/addresses",
  );
  return data.addresses ?? [];
}

type Params = {
  enabled: boolean;
  onError: (message: string) => void;
};

// Checkout-scoped hook: loads saved addresses and manages "prefill + select + set default" actions.
export function useCheckoutAddresses(params: Params) {
  const { enabled, onError } = params;
  const qc = useQueryClient();

  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [country, setCountry] = useState("Malaysia");
  const [shippingMethod, setShippingMethod] = useState("standard");
  const [shippingPrefilled, setShippingPrefilled] = useState(false);
  const [selectedSavedId, setSelectedSavedId] = useState<number | "">("");

  const query = useQuery({
    queryKey: ["user-addresses"],
    queryFn: fetchAddresses,
    enabled,
  });

  // Memoize the array so hook dependencies stay stable.
  const savedAddresses = useMemo(() => query.data ?? [], [query.data]);
  const addressesLoaded = query.isSuccess;

  // Prefill shipping form once from default saved address (when available).
  useEffect(() => {
    if (!enabled || !addressesLoaded || shippingPrefilled) return;
    if (savedAddresses.length) {
      const defaultAddress =
        savedAddresses.find((address) => address.isDefault) ??
        savedAddresses[0];
      setLine1(defaultAddress.line1);
      setCity(defaultAddress.city);
      setPostcode(defaultAddress.postcode);
      setCountry(defaultAddress.country);
      setSelectedSavedId(defaultAddress.id);
    }
    setShippingPrefilled(true);
  }, [enabled, savedAddresses, addressesLoaded, shippingPrefilled]);

  const applySavedAddress = useCallback(
    (id: number | "") => {
      setSelectedSavedId(id);
      if (id === "") return;
      const matchedAddress = savedAddresses.find(
        (savedAddress) => savedAddress.id === id,
      );
      if (matchedAddress) {
        setLine1(matchedAddress.line1);
        setCity(matchedAddress.city);
        setPostcode(matchedAddress.postcode);
        setCountry(matchedAddress.country);
      }
    },
    [savedAddresses],
  );

  const setDefaultSavedAddress = useCallback(
    async (id: number) => {
      onError("");
      try {
        await http.patch(`/features/user/api/addresses/${id}`, {
          isDefault: true,
        });
        void qc.invalidateQueries({ queryKey: ["user-addresses"] });
      } catch (error) {
        onError(getErrorMessage(error, "Could not set default address."));
      }
    },
    [onError, qc],
  );

  const shippingPayload = useMemo(() => {
    // Only attach shipping when the address is complete enough to store on the order.
    if (!line1.trim() || !city.trim() || !postcode.trim() || !country.trim()) {
      return undefined;
    }
    return {
      line1: line1.trim(),
      city: city.trim(),
      postcode: postcode.trim(),
      country: country.trim(),
      method: shippingMethod,
    };
  }, [line1, city, postcode, country, shippingMethod]);

  return {
    savedAddresses,
    addressesLoaded,
    shippingPrefilled,
    selectedSavedId,
    applySavedAddress,
    setDefaultSavedAddress,
    line1,
    setLine1,
    city,
    setCity,
    postcode,
    setPostcode,
    country,
    setCountry,
    shippingMethod,
    setShippingMethod,
    shippingPayload,
  };
}
