import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: ["res.cloudinary.com"], // ✅ Allow Cloudinary images
  },
  experimental: {
    // Disable static generation for admin pages that require database access
    workerThreads: false,
    cpus: 1,
  },
};

export default nextConfig;
