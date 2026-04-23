import { useTranslations } from "next-intl";

interface NotFoundContentProps {
  className?: string;
}

export function NotFoundContent({ className }: NotFoundContentProps) {
  const t = useTranslations("app");

  return (
    <div className={className}>
      <div>
        <h1 className="text-2xl font-bold mb-2">
          {t("not_found_content.title")}
        </h1>
        <p className="text-muted-foreground">
          {t("not_found_content.message")}
        </p>
      </div>
    </div>
  );
}
