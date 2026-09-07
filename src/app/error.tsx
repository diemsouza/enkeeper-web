"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/src/components/ui/button";
import { postJson } from "@/src/lib/api-client";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("app.error");
  const router = useRouter();

  async function goToLogin() {
    await postJson("/api/auth/logout", {});
    router.replace("/login");
  }

  return (
    <section className="grid min-h-screen place-items-center bg-white px-6 py-24 sm:py-32 lg:px-8">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-balance text-gray-900">
          {t("title")}
        </h1>
        <p className="mt-6 text-lg font-medium text-pretty text-gray-500 sm:text-xl/8">
          {t("description")}
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-4">
          <Button
            size="lg"
            className="rounded-full px-5"
            onClick={() => reset()}
          >
            {t("cta_retry")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="rounded-full px-5"
            onClick={goToLogin}
          >
            {t("cta_login")}
          </Button>
        </div>
      </div>
    </section>
  );
}
