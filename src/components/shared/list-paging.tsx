import { cn } from "@/src/lib/utils";
import { Button } from "../ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

interface ListPagingProps {
  className?: string;
  count?: number;
  current?: number;
  hasMore?: boolean;
  onChange?: (nextPage: number) => void;
}

export function ListPaging({
  className,
  count = 0,
  current = 0,
  hasMore,
  onChange,
}: ListPagingProps) {
  const t = useTranslations("app");

  const handlePrevPage = () => {
    if (onChange) onChange(Math.max(0, current - 1));
  };

  const handleNextPage = () => {
    if (onChange) onChange(current + 1);
  };

  if (!count) return null;

  return (
    <div className={cn("flex justify-between items-center", className)}>
      <Button
        variant="outline"
        onClick={handlePrevPage}
        disabled={current === 0}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline-block ms-2">{t("paging_back")}</span>
      </Button>
      <span className="text-sm text-muted-foreground">
        {t("paging_current", { page: current + 1 })}
      </span>
      <Button variant="outline" onClick={handleNextPage} disabled={!hasMore}>
        <span className="hidden sm:inline-block">{t("paging_next")}</span>
        <ChevronRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
}
