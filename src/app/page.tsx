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
            applicationCategory: "EducationApplication",
            operatingSystem: "Android, iOS, Web",
            description:
              "Prática diária de inglês direto no WhatsApp. Envie o material da sua aula e pratica o dia inteiro no seu ritmo.",
            url: "https://fluizer.com",
            offers: {
              "@type": "Offer",
              price: "19.90",
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
