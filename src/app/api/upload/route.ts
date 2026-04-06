import * as cloudinary from "cloudinary";
import formidable from "formidable";
import type { File } from "formidable";
import fs from "fs/promises";
import sharp from "sharp";
import { Readable } from "stream";

// Route-level config equivalent: disable body parsing in pages router.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function POST(req: Request) {
  // Next.js App Router streams the body; we need a Node-style request for formidable.
  const form = formidable({ keepExtensions: true });

  const nodeReq = req as unknown as import("http").IncomingMessage;

  const parseForm = () =>
    new Promise<{ filepath: string }>((resolve, reject) => {
      form.parse(nodeReq, (err, _fields, files) => {
        if (err) {
          console.error("Formidable parse error:", err);
          reject(err);
          return;
        }
        const file = Array.isArray(files.file) ? files.file[0] : files.file;
        if (!file) {
          reject(new Error("No file uploaded"));
          return;
        }
        resolve({ filepath: (file as File).filepath });
      });
    });

  try {
    const file = await parseForm();
    const buffer = await fs.readFile(file.filepath);

    const compressedBuffer = await sharp(buffer)
      .resize({ width: 800 })
      .jpeg({ quality: 70 })
      .toBuffer();

    const uploadToCloudinary = () =>
      new Promise<string>((resolve, reject) => {
        const uploadStream = cloudinary.v2.uploader.upload_stream(
          { folder: "products" },
          (error, result) => {
            if (error || !result?.secure_url) {
              console.error("Cloudinary upload error:", error);
              reject(error ?? new Error("Upload failed"));
              return;
            }
            resolve(result.secure_url);
          },
        );
        Readable.from(compressedBuffer).pipe(uploadStream);
      });

    const secureUrl = await uploadToCloudinary();

    return new Response(JSON.stringify({ secure_url: secureUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
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
