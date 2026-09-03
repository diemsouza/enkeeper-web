import HomePage from "@/src/components/home/page";

export default function Home() {
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
      />{" "}
      <HomePage />
    </>
  );
}
