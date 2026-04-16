import type { MetadataRoute } from "next";
import prisma from "@/app/lib/prisma";
import { getSiteUrl } from "@/app/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      select: { id: true, updatedAt: true },
    }),
    prisma.category.findMany({
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${base}/features/user`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${base}/features/user/search`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map(
    (c: { slug: string; updatedAt: Date }) => ({
      url: `${base}/features/user/category/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }),
  );

  const productRoutes: MetadataRoute.Sitemap = products.map(
    (p: { id: number; updatedAt: Date }) => ({
      url: `${base}/features/user/product/${p.id}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }),
  );

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
