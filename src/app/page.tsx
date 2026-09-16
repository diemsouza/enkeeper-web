import { getTranslations } from "next-intl/server";
import HomePage from "@/src/components/home/page";
import { FAQ_IDS } from "@/src/components/home/faq-data";

export default async function Home() {
  const t = await getTranslations("home.faq");

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_IDS.map((id) => ({
      "@type": "Question",
      name: t(`items.${id}.question`),
      acceptedAnswer: {
        "@type": "Answer",
        text: t(`items.${id}.answer`),
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Fluizer",
            applicationCategory: "EducationalApplication",
            operatingSystem: "Web",
            description:
              "Pratique inglês com IA, todo dia, no seu ritmo, sobre o que você quiser.",
            url: "https://fluizer.com",
            offers: {
              "@type": "Offer",
              price: "21.90",
              priceCurrency: "BRL",
              availability: "https://schema.org/InStock",
              category: "Subscription",
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <HomePage />
    </>
  );
}
