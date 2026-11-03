import { getTranslations } from "next-intl/server";
import type { BlogFaqItem } from "@/src/core/blog";

// Respostas sempre visiveis: escaneavel, no HTML e igual ao JSON-LD FAQPage.
export async function BlogFaq({ items }: { items: BlogFaqItem[] }) {
  const t = await getTranslations("blog.post");
  return (
    <section aria-labelledby="faq">
      <h2 id="faq">{t("faq_title")}</h2>
      {items.map((item) => (
        <div key={item.question}>
          <h3>{item.question}</h3>
          <p>{item.answer}</p>
        </div>
      ))}
    </section>
  );
}
