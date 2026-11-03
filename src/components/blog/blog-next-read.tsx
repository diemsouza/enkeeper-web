import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { BLOG_PATH, buildBlogPostPath } from "@/src/core/blog";
import type { BlogFrontmatter } from "@/src/core/blog";

type BlogNextReadProps = { next: BlogFrontmatter | null };

export async function BlogNextRead({ next }: BlogNextReadProps) {
  const t = await getTranslations("blog.post");
  const href = next ? buildBlogPostPath(next.slug) : BLOG_PATH;
  const title = next ? next.title : t("all_posts");
  const description = next ? next.description : t("all_posts_description");

  return (
    <nav aria-label={t("next_read")} className="mt-12 border-t border-border pt-8">
      <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
        {t("next_read")}
      </p>
      <Link
        href={href}
        className="group mt-3 flex items-start justify-between gap-4 rounded-panel border border-border p-5 transition-colors hover:bg-accent"
      >
        <span>
          <span className="block text-lg font-semibold leading-snug">{title}</span>
          <span className="mt-1 block text-[15px] leading-relaxed text-muted-foreground">
            {description}
          </span>
        </span>
        <ArrowRight className="mt-1 h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </nav>
  );
}
