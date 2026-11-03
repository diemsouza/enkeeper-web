import { FAQ_IDS } from "@/src/components/home/faq-data";
import {
  SITE_URL,
  SUBSCRIPTION_INTERVAL,
  SUBSCRIPTION_PRICE_BRL,
  TRIAL_DAYS,
  DEFAULT_CURRENCY,
  DEFAULT_LOCALE,
} from "@/src/lib/constants";
import { getPricingDisplay } from "@/src/lib/pricing-display";
import {
  BLOG_PATH,
  buildBlogPostPath,
  getBlogModifiedDate,
  type BlogFrontmatter,
} from "@/src/core/blog";

type Translate = (
  key: string,
  values?: Record<string, string | number>,
) => string;

const OFFER_NAMES = {
  [SUBSCRIPTION_INTERVAL.YEARLY]: "Anual",
  [SUBSCRIPTION_INTERVAL.MONTHLY]: "Mensal",
} as const;

export function buildHomeJsonLd(
  tFaq: Translate,
  description: string,
): Record<string, unknown> {
  const faqValues = { ...getPricingDisplay(), days: TRIAL_DAYS };

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#webapp`,
        name: "Fluizer",
        url: SITE_URL,
        description,
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
        inLanguage: DEFAULT_LOCALE,
        offers: [
          SUBSCRIPTION_INTERVAL.YEARLY,
          SUBSCRIPTION_INTERVAL.MONTHLY,
        ].map((interval) => ({
          "@type": "Offer",
          name: OFFER_NAMES[interval],
          price: SUBSCRIPTION_PRICE_BRL[interval].toFixed(2),
          priceCurrency: DEFAULT_CURRENCY,
          availability: "https://schema.org/InStock",
          category: "Subscription",
        })),
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}/#faq`,
        mainEntity: FAQ_IDS.map((id) => ({
          "@type": "Question",
          name: tFaq(`items.${id}.question`),
          acceptedAnswer: {
            "@type": "Answer",
            text: tFaq(`items.${id}.answer`, faqValues),
          },
        })),
      },
    ],
  };
}

const ORGANIZATION = {
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "Fluizer",
  url: SITE_URL,
  logo: `${SITE_URL}/web-app-manifest-512x512.png`,
} as const;

export function buildBlogPostJsonLd(post: BlogFrontmatter): Record<string, unknown> {
  const url = `${SITE_URL}${buildBlogPostPath(post.slug)}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: post.title,
        description: post.description,
        image: `${SITE_URL}${post.cover}`,
        datePublished: post.date,
        dateModified: getBlogModifiedDate(post),
        inLanguage: DEFAULT_LOCALE,
        author: ORGANIZATION,
        publisher: ORGANIZATION,
        mainEntityOfPage: url,
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: post.faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };
}

export function buildBlogIndexJsonLd(
  posts: BlogFrontmatter[],
  description: string,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${SITE_URL}${BLOG_PATH}#blog`,
    name: "Blog Fluizer",
    url: `${SITE_URL}${BLOG_PATH}`,
    description,
    inLanguage: DEFAULT_LOCALE,
    publisher: ORGANIZATION,
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      url: `${SITE_URL}${buildBlogPostPath(post.slug)}`,
      datePublished: post.date,
      image: `${SITE_URL}${post.cover}`,
    })),
  };
}
