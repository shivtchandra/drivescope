import { MetadataRoute } from "next";
import { models } from "@/lib/data";
import { getSeedSlugs } from "@/lib/compare-seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const staticRoutes = [
    "",
    "/explore",
    "/compare",
    "/cost",
    "/race",
    "/simulate",
    "/drive",
    "/wall",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  const carRoutes = models.map((model) => ({
    url: `${baseUrl}/cars/${model.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  const compareRoutes = getSeedSlugs().map((slug) => ({
    url: `${baseUrl}/compare/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.95,
  }));

  return [...staticRoutes, ...carRoutes, ...compareRoutes];
}
