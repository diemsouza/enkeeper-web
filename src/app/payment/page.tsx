/* eslint-disable @next/next/no-html-link-for-pages */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import Nav from "@/src/components/home/nav";
import Footer from "@/src/components/home/footer";
import { Button } from "@/src/components/ui/button";

export const metadata: Metadata = {
  title: "Pagamento - Fluizer",
  robots: "noindex",
};

type PaymentStatus = "success" | "canceled";

const STATUS_CONTENT: Record<
  PaymentStatus,
  { title: string; message: string }
> = {
  success: {
    title: "Pagamento confirmado",
    message: "Volte para o WhatsApp para continuar praticando.",
  },
  canceled: {
    title: "Pagamento cancelado",
    message: "Seu link continua válido. Volte quando quiser para concluir.",
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

  const { title, message } = STATUS_CONTENT[status];

  return (
    <div className="flex flex-col min-h-screen">
      <Nav />
      <main className="flex-1 flex items-center justify-center px-6 pt-28 pb-20">
        <div className="flex flex-col items-center text-center max-w-sm">
          {status === "success" ? (
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-6" />
          ) : (
            <AlertTriangle className="h-16 w-16 text-orange-500 mb-6" />
          )}
          <h1 className="text-2xl font-bold tracking-tight mb-2">{title}</h1>
          <p className="text-[15px] text-muted-foreground mb-8">{message}</p>
          <Button asChild>
            <a href="/">Página inicial</a>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
