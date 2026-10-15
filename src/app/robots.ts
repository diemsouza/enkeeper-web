import type { MetadataRoute } from "next";
import { SITE_URL } from "@/src/lib/constants";

const ALLOWED_CRAWLERS = [
  "Googlebot",
  "Bingbot",
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "PerplexityBot",
  "Google-Extended",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: ALLOWED_CRAWLERS, allow: "/", disallow: "/app" },
      { userAgent: "*", allow: "/", disallow: "/app" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
