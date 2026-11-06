import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useTranslations } from "next-intl";

export function QuestionRatingBadge({ rating }: { rating: boolean }) {
  const t = useTranslations("app.practice_actions");
  const Icon = rating ? ThumbsUp : ThumbsDown;

  return (
    <div className="mt-1 flex items-center gap-1 px-1 text-caption text-muted-foreground">
      <Icon className="h-3 w-3 fill-current" aria-hidden />
      <span>{t("rating_sent")}</span>
    </div>
  );
}
