import * as cloudinary from "cloudinary";
import sharp from "sharp";
import { Readable } from "stream";
import { adminApiRequireAny } from "@/backend/lib/admin-api-guard";
import {
  adminActorNumericId,
  logAdminAction,
} from "@/backend/lib/admin-action-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function POST(req: Request) {
  const g = await adminApiRequireAny(["product.create", "product.update"]);
  if (!g.ok) return g.response;

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

    const uploadToCloudinary = () =>
      new Promise<{ secure_url: string; public_id?: string }>(
        (resolve, reject) => {
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
          Readable.from(compressedBuffer).pipe(uploadStream);
        },
      );

    const { secure_url: secureUrl, public_id: publicId } =
      await uploadToCloudinary();
    const aid = adminActorNumericId(g.user);
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
      JSON.stringify({ message: "Upload failed", error: String(error) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
