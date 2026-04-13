import { postImageUpload } from "@/app/modules/admin/client";

export async function uploadImageToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const { secure_url } = await postImageUpload(formData);
  return secure_url;
}
