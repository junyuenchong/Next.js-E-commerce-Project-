import { fetchSameOriginJson } from "@/app/modules/admin/helpers";

/** Uses {@link fetchSameOriginJson} so cookies are sent regardless of `NEXT_PUBLIC_API_BASE_URL`. */
const ADMIN_UPLOAD_PATH = "/modules/admin/api/upload";

export async function postImageUpload(formData: FormData) {
  const data = await fetchSameOriginJson<{ secure_url?: string }>(
    ADMIN_UPLOAD_PATH,
    {
      method: "POST",
      body: formData,
    },
  );

  if (typeof data.secure_url !== "string" || data.secure_url.trim() === "") {
    throw new Error("Upload response missing image URL.");
  }

  return { secure_url: data.secure_url };
}
