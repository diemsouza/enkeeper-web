import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { DomainId } from "@/src/lib/constants";
import { buildAppEntryUrl } from "@/src/core/domain-param";
import { Button } from "@/src/components/ui/button";

type BlogCtaProps = {
  domain?: DomainId;
  variant: "inline" | "button";
  label?: string;
  children?: React.ReactNode;
};

// Link puro, sem JS: quem nao tem sessao passa pelo login e volta com o domain
// (sem domain, cai no /app normal). children e div: o MDX ja envolve o texto em <p>.
export async function BlogCta({ domain, variant, label, children }: BlogCtaProps) {
  const t = await getTranslations("blog.cta");
  const href = buildAppEntryUrl(domain ?? null);

  if (variant === "inline") {
    return (
      <aside className="not-prose my-8 rounded-panel border border-border bg-muted/40 px-5 py-4">
        {children && (
          <div className="text-[16px] leading-relaxed text-foreground/85">{children}</div>
        )}
        <a
          href={href}
          className="mt-2 inline-flex min-h-touch items-center gap-1.5 font-semibold text-primary hover:underline underline-offset-4"
        >
          {label ?? t("inline_link")}
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </a>
      </aside>
    );
  }

  return (
    <div className="not-prose my-10 flex flex-col items-center gap-4 text-center">
      {children && (
        <div className="max-w-md text-[16px] leading-relaxed text-muted-foreground">
          {children}
        </div>
      )}
      <Button asChild size="lg" className="gap-2">
        <a href={href}>
          {label ?? t("button")}
          <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
        </a>
      </Button>
    </div>
  );
}
