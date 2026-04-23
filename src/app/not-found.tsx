import { Button } from "@/src/components/ui/button";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("app.not_found");
  return (
    <section className="grid min-h-screen place-items-center bg-white px-6 py-24 sm:py-32 lg:px-8">
      <div className="text-center">
        <p className="text-base font-semibold text-primary">{t("code_404")}</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-tight text-balance text-gray-900">
          {t("title_page_not_found")}
        </h1>
        <p className="mt-6 text-lg font-medium text-pretty text-gray-500 sm:text-xl/8">
          {t("description_generic")}
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Button
            asChild
            size="lg"
            className="md:inline-flex rounded-full px-5"
          >
            <a href="/">{t("cta_back_home")}</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
