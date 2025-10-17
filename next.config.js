const nextConfig = {
  // ✅ Enable standalone build for optimized Docker/Nixpacks deployment
  output: 'standalone',

  // ✅ Allow loading remote images from specific domains
  images: {
    domains: [
      'lh3.googleusercontent.com',
      'platform-lookaside.fbsbx.com',
      // add other domains as needed
    ],
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

module.exports = nextConfig;
