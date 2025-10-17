import type { NextApiRequest, NextApiResponse } from "next";
import * as cloudinary from "cloudinary";
import formidable from "formidable";
import fs from "fs/promises";
import sharp from "sharp";
import { Readable } from "stream";

export const config = {
  api: {
    bodyParser: false, // 关闭默认body解析，方便处理文件上传
  },
};

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const form = formidable({ keepExtensions: true });

  // 用 Promise 包装 formidable 解析
  const parseForm = () =>
    new Promise<{ filepath: string }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
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
        resolve(file);
      });
    });

  try {
    const file = await parseForm();

    // 读取文件缓冲区
    const buffer = await fs.readFile(file.filepath);

    // 用 sharp 压缩，调整宽度为800px，质量70%
    const compressedBuffer = await sharp(buffer)
      .resize({ width: 800 })
      .jpeg({ quality: 70 })
      .toBuffer();

    // 上传到 Cloudinary，使用 upload_stream 方式
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
          }
        );
        Readable.from(compressedBuffer).pipe(uploadStream);
      });

    const secureUrl = await uploadToCloudinary();

    return res.status(200).json({ secure_url: secureUrl });
  } catch (error) {
    console.error("Upload handler error:", error);
    return res.status(500).json({ message: "Upload failed", error: String(error) });
  }
}