import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: ["res.cloudinary.com", "images.unsplash.com"], // ✅ Allow Cloudinary and Unsplash images
  },
};

export default nextConfig;
