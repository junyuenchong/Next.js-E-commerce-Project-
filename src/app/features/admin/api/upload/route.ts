/**
 * admin api route
 * handle upload
 */

import * as cloudinary from "cloudinary";
import sharp from "sharp";
import { Readable } from "stream";
import { adminApiRequireAny } from "@/backend/core/admin-api-guard";
import {
  adminActorNumericId,
  logAdminAction,
} from "@/backend/core/admin-action-log";
import { unknownErrorMessage } from "@/backend/lib/api-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

type CloudinaryUploadResult = { secure_url: string; public_id?: string };

// Stream an in-memory image buffer to Cloudinary and return the public URL.
function uploadImageBufferToCloudinary(
  buffer: Buffer,
): Promise<CloudinaryUploadResult> {
  return new Promise<CloudinaryUploadResult>((resolve, reject) => {
    const uploadStream = cloudinary.v2.uploader.upload_stream(
      { folder: "products" },
      (error, result) => {
        if (error || !result?.secure_url) {
          console.error("Cloudinary upload error:", error);
          reject(error ?? new Error("Upload failed"));
          return;
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
        });
      },
    );
    Readable.from(buffer).pipe(uploadStream);
  });
}

// Compress and upload one product image to Cloudinary.
export async function POST(req: Request) {
  const guard = await adminApiRequireAny(["product.create", "product.update"]);
  if (!guard.ok) return guard.response;

  try {
    const formData = await req.formData();
    const entry = formData.get("file");
    if (
      !entry ||
      typeof entry === "string" ||
      !(entry instanceof Blob) ||
      entry.size === 0
    ) {
      return new Response(JSON.stringify({ message: "No file uploaded" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const buffer = Buffer.from(await entry.arrayBuffer());

    const compressedBuffer = await sharp(buffer)
      .resize({ width: 800 })
      .jpeg({ quality: 70 })
      .toBuffer();

    const { secure_url: secureUrl, public_id: publicId } =
      await uploadImageBufferToCloudinary(compressedBuffer);
    const aid = adminActorNumericId(guard.user);
    if (aid != null) {
      void logAdminAction({
        actorUserId: aid,
        action: "media.upload",
        targetType: "CloudinaryAsset",
        targetId: publicId ?? "unknown",
        metadata: { bytes: buffer.byteLength },
      });
    }

    return new Response(JSON.stringify({ secure_url: secureUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Upload handler error:", error);
    return new Response(
      JSON.stringify({
        message: "Upload failed",
        error:
          process.env.NODE_ENV === "development"
            ? unknownErrorMessage(error)
            : "Internal Server Error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
