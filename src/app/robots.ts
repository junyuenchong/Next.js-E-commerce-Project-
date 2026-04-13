import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/app/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/modules/admin/", "/api/"] },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
