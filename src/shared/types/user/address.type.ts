// Shared user address types (used by profile + checkout).
export type SavedAddress = {
  id: number;
  label: string | null;
  line1: string;
  city: string;
  postcode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};
