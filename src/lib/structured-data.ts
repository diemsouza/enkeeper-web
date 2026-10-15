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
