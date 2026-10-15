import { getTranslations } from "next-intl/server";
import HomePage from "@/src/components/home/page";
import { buildHomeJsonLd } from "@/src/lib/structured-data";

export default async function Home() {
  const [tFaq, tSeo] = await Promise.all([
    getTranslations("home.faq"),
    getTranslations("common.seo"),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildHomeJsonLd(tFaq, tSeo("description"))),
        }}
      />
      <HomePage />
    </>
  );
}
