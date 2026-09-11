import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/src/components/ui/button";

export const metadata: Metadata = {
  title: "Fluizer | Pagamento",
  robots: "noindex",
};

type PaymentStatus = "success" | "canceled";

const STATUS_CONTENT: Record<
  PaymentStatus,
  { title: string; message: string; cta: string }
> = {
  success: {
    title: "Pagamento confirmado",
    message: "Seu acesso está liberado. Continue praticando.",
    cta: "Continuar",
  },
  canceled: {
    title: "Pagamento cancelado",
    message: "Seu link continua válido. Volte quando quiser para concluir.",
    cta: "Voltar",
  },
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

  const { title, message, cta } = STATUS_CONTENT[status];

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
