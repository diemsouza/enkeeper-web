import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { SITE_URL } from "@/src/lib/constants";
import {
  BLOG_COVER_HEIGHT,
  BLOG_COVER_WIDTH,
  BLOG_PATH,
  buildBlogPostPath,
  formatBlogDate,
} from "@/src/core/blog";
import { buildBlogIndexJsonLd } from "@/src/lib/structured-data";
import { listBlogPosts } from "@/src/services/blog-service";

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("blog.index");
  const url = `${SITE_URL}${BLOG_PATH}`;
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: url },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url,
      siteName: "Fluizer",
      locale: "pt_BR",
      type: "website",
    },
  };
}

export default async function BlogIndexPage() {
  const [posts, t, locale] = await Promise.all([
    listBlogPosts(),
    getTranslations("blog.index"),
    getLocale(),
  ]);
  const frontmatters = posts.map((post) => post.frontmatter);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildBlogIndexJsonLd(frontmatters, t("description"))),
        }}
      />
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t("heading")}</h1>
      <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
        {t("description")}
      </p>

      <ul className="mt-10 flex flex-col gap-10">
        {frontmatters.map((post) => (
          <li key={post.slug}>
            <Link href={buildBlogPostPath(post.slug)} className="group block">
              {/* eslint-disable-next-line @next/next/no-img-element -- imagens sao unoptimized no projeto */}
              <img
                src={post.cover}
                alt={post.coverAlt}
                width={BLOG_COVER_WIDTH}
                height={BLOG_COVER_HEIGHT}
                loading="lazy"
                decoding="async"
                className="aspect-[1200/630] h-auto w-full rounded-panel border border-border object-cover"
              />
              <h2 className="mt-4 text-2xl font-bold leading-snug tracking-tight group-hover:text-primary">
                {post.title}
              </h2>
              <p className="mt-2 text-[16px] leading-relaxed text-muted-foreground">
                {post.description}
              </p>
              <time dateTime={post.date} className="mt-2 block text-sm text-muted-foreground">
                {formatBlogDate(post.date, locale)}
              </time>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
