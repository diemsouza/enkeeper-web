import type { MetadataRoute } from "next";
import { SITE_URL } from "@/src/lib/constants";
import { BLOG_PATH, buildBlogPostPath, getBlogModifiedDate } from "@/src/core/blog";
import { listBlogPosts } from "@/src/services/blog-service";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await listBlogPosts();
  const latestPostDate = posts[0]?.frontmatter.date;

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}${BLOG_PATH}`,
      lastModified: latestPostDate ? new Date(latestPostDate) : new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...posts.map(({ frontmatter }) => ({
      url: `${SITE_URL}${buildBlogPostPath(frontmatter.slug)}`,
      lastModified: new Date(getBlogModifiedDate(frontmatter)),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    {
      url: `${SITE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
