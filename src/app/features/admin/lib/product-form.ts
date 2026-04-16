type AdminProductFormLike = {
  title: string;
  description?: string;
  price: string;
  compareAtPrice?: string;
  stock?: string;
  imageUrl?: string;
  categoryId: string;
};

function toFiniteNumberOrNull(raw: string): number | null {
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

function toFiniteIntOrNull(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

export type AdminProductPayload = {
  title: string;
  description?: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  categoryId: number;
  imageUrl?: string;
};

/** Normalize admin product form strings into API payload. */
export function buildAdminProductPayload(
  form: AdminProductFormLike,
  options?: { imageUrl?: string | undefined },
): AdminProductPayload {
  const stockNum = toFiniteIntOrNull((form.stock ?? "0").trim());
  const priceNum = toFiniteNumberOrNull(form.price.trim()) ?? NaN;

  const compareAtRaw = (form.compareAtPrice ?? "").trim();
  const compareAtParsed =
    compareAtRaw === "" ? null : toFiniteNumberOrNull(compareAtRaw);

  // Guard: invalid compare-at values are treated as "unset" (backend validates strict > price when set).
  const compareAtPrice =
    compareAtParsed != null && compareAtParsed > 0 ? compareAtParsed : null;

  const imageUrl =
    (options?.imageUrl ?? form.imageUrl ?? "").trim() || undefined;

  const title = form.title.trim();
  const description = (form.description ?? "").trim() || undefined;
  const categoryId = toFiniteIntOrNull(form.categoryId.trim()) ?? NaN;

  return {
    title,
    description,
    price: priceNum,
    compareAtPrice,
    stock: stockNum != null ? Math.max(0, Math.trunc(stockNum)) : 0,
    categoryId,
    ...(imageUrl ? { imageUrl } : {}),
  };
}
