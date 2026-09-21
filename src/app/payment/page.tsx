import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/src/components/ui/button";

export const metadata: Metadata = {
  title: "Fluizer | Pagamento",
  robots: "noindex",
};

export default async function PaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  if (status !== "success" && status !== "canceled") {
    redirect("/");
  }

  const t = await getTranslations("payment");
  const { title, message, cta } =
    status === "success"
      ? {
          title: t("success.title"),
          message: t("success.message"),
          cta: t("success.cta"),
        }
      : {
          title: t("canceled.title"),
          message: t("canceled.message"),
          cta: t("canceled.cta"),
        };

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="flex flex-col items-center text-center max-w-sm">
        {status === "success" ? (
          <CheckCircle2 className="h-16 w-16 text-green-500 mb-6" />
        ) : (
          <AlertTriangle className="h-16 w-16 text-orange-500 mb-6" />
        )}
        <h1 className="text-2xl font-bold tracking-tight mb-2">{title}</h1>
        <p className="text-[15px] text-muted-foreground mb-8">{message}</p>
        <Button asChild>
          <Link href="/app">{cta}</Link>
        </Button>
      </div>
    </div>
  );
}
