const nextConfig = {
  output: "standalone",
  /** Extra dev hostnames so session/API calls work when using 127.0.0.1 vs localhost (see Next.js `allowedDevOrigins`). */
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async redirects() {
    return [
      {
        source: "/admin",
        destination: "/features/admin",
        permanent: false,
      },
      {
        source: "/admin/:path*",
        destination: "/features/admin/:path*",
        permanent: false,
      },
    ];
  },
  /** NextAuth lives under `modules/user/api/auth`; keep `/api/auth/*` working for existing OAuth redirect URIs. */
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: "/features/user/api/auth/:path*",
      },
    ];
  },
  images: {
    unoptimized: process.env.NEXT_IMAGE_UNOPTIMIZED === "1",
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "platform-lookaside.fbsbx.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  reactStrictMode: true,
};

module.exports = nextConfig;
