import { z } from "zod";
import { DOMAINS, type DomainId } from "../lib/constants";

// Ordem unica da "Proxima leitura". A ultima aponta para /blog (sem loop).
export const BLOG_POST_ORDER = [
  "ingles-para-entrevista-de-emprego",
  "ingles-para-viagem-frases-essenciais",
  "ingles-para-intercambio-primeiro-mes",
  "expressoes-em-ingles-de-series",
  "repeticao-espacada-ingles",
  "curso-de-ingles-e-pratica-diaria",
  "nivel-de-ingles-no-brasil",
  "aprender-ingles-sem-intercambio",
  "perder-vergonha-de-falar-ingles",
  "entendo-ingles-mas-nao-consigo-falar",
] as const;

export const BLOG_PATH = "/blog";
export const BLOG_COVER_WIDTH = 1200;
export const BLOG_COVER_HEIGHT = 630;

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const DOMAIN_IDS = DOMAINS.map((domain) => domain.id) as [
  DomainId,
  ...DomainId[],
];

// Sem domain, o CTA leva ao /app normal (materias que nao sao de um objetivo).
// updated: so quando o texto mudou depois de publicado; nunca antes de date.
export const BlogFrontmatterSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().min(1),
    slug: z.string().regex(SLUG_PATTERN),
    date: z.string().regex(ISO_DATE_PATTERN),
    updated: z.string().regex(ISO_DATE_PATTERN).optional(),
    cover: z.string().startsWith("/blog/"),
    coverAlt: z.string().min(1),
    domain: z.enum(DOMAIN_IDS).optional(),
    faq: z
      .array(z.object({ question: z.string().min(1), answer: z.string().min(1) }))
      .min(1),
  })
  .refine((post) => !post.updated || post.updated >= post.date, {
    message: "updated antes de date",
    path: ["updated"],
  });

export type BlogFrontmatter = z.infer<typeof BlogFrontmatterSchema>;
export type BlogFaqItem = BlogFrontmatter["faq"][number];

export function isValidBlogSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}

export function getNextReadSlug(slug: string): string | null {
  const order: readonly string[] = BLOG_POST_ORDER;
  const index = order.indexOf(slug);
  if (index === -1 || index === order.length - 1) return null;
  return order[index + 1];
}

export function getBlogModifiedDate(post: { date: string; updated?: string }): string {
  return post.updated ?? post.date;
}

export function buildBlogPostPath(slug: string): string {
  return `${BLOG_PATH}/${slug}`;
}

export function sortPostsByDateDesc<T extends { frontmatter: { date: string } }>(
  posts: T[],
): T[] {
  return [...posts].sort((a, b) =>
    b.frontmatter.date.localeCompare(a.frontmatter.date),
  );
}

export function formatBlogDate(isoDate: string, locale: string): string {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString(locale, {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
