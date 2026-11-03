import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { SITE_URL } from "@/src/lib/constants";
import {
  BLOG_COVER_HEIGHT,
  BLOG_COVER_WIDTH,
  BLOG_PATH,
  BLOG_POST_ORDER,
  buildBlogPostPath,
  formatBlogDate,
  getBlogModifiedDate,
  getNextReadSlug,
} from "@/src/core/blog";
import { buildBlogPostJsonLd } from "@/src/lib/structured-data";
import { getBlogPost } from "@/src/services/blog-service";
import { BlogNextRead } from "@/src/components/blog/blog-next-read";

export const dynamic = "force-static";
export const dynamicParams = false;

type BlogPostPageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams(): { slug: string }[] {
  return BLOG_POST_ORDER.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return {};
  const { title, description, cover, coverAlt, date } = post.frontmatter;
  const modifiedTime = getBlogModifiedDate(post.frontmatter);
  const url = `${SITE_URL}${buildBlogPostPath(slug)}`;
  const image = { url: cover, width: BLOG_COVER_WIDTH, height: BLOG_COVER_HEIGHT, alt: coverAlt };
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Fluizer",
      locale: "pt_BR",
      type: "article",
      publishedTime: date,
      modifiedTime,
      images: [image],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();
  const nextSlug = getNextReadSlug(slug);
  const [next, t, locale] = await Promise.all([
    nextSlug ? getBlogPost(nextSlug) : null,
    getTranslations("blog.post"),
    getLocale(),
  ]);
  const { frontmatter, Content } = post;

  return (
    <article className="mx-auto w-full max-w-[68ch]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBlogPostJsonLd(frontmatter)) }}
      />
      <Link
        href={BLOG_PATH}
        className="-my-3 inline-flex min-h-touch items-center text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        {t("back_to_blog")}
      </Link>
      <h1 className="mt-2 text-[32px] font-bold leading-tight tracking-tight sm:text-[42px]">
        {frontmatter.title}
      </h1>
      <p className="mt-3 flex flex-wrap gap-x-3 text-sm text-muted-foreground">
        <time dateTime={frontmatter.date}>
          {t("published_at", { date: formatBlogDate(frontmatter.date, locale) })}
        </time>
        {frontmatter.updated && (
          <time dateTime={frontmatter.updated}>
            {t("updated_at", { date: formatBlogDate(frontmatter.updated, locale) })}
          </time>
        )}
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element -- imagens sao unoptimized no projeto */}
      <img
        src={frontmatter.cover}
        alt={frontmatter.coverAlt}
        width={BLOG_COVER_WIDTH}
        height={BLOG_COVER_HEIGHT}
        fetchPriority="high"
        className="mt-6 aspect-[1200/630] h-auto w-full rounded-panel border border-border object-cover"
      />
      <div className="prose prose-fluizer mt-8 max-w-none text-[17px] leading-[1.75] prose-headings:tracking-tight prose-h2:mt-12 prose-h2:text-[26px] prose-h3:text-[19px] prose-a:font-medium prose-a:underline-offset-4 prose-li:my-1">
        <Content />
      </div>
      <BlogNextRead next={next?.frontmatter ?? null} />
    </article>
  );
}
