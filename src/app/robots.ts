import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/app/lib/auth";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/features/admin/", "/api/"] },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
