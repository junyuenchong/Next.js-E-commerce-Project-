import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ Enable standalone build for optimized Docker/Nixpacks deployment
  output: 'standalone',

  // ✅ Allow loading remote images from specific domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },

  // ✅ Optional: Enable strict React rendering rules (can be removed if not needed)
  reactStrictMode: true,

  // ✅ Optional: Set up i18n or trailingSlash if needed later
  // trailingSlash: true,
  // i18n: {
  //   locales: ['en'],
  //   defaultLocale: 'en',
  // },
};

export default nextConfig;
