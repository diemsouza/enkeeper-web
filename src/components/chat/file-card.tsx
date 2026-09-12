import { useTranslations } from "next-intl";

export function FileCard({
  fileName,
  fileSize,
  mediaType,
}: {
  fileName: string;
  fileSize: string;
  mediaType?: "image" | "pdf" | "text";
}) {
  const t = useTranslations("app.chat");
  const badge =
    mediaType === "image"
      ? t("file_badge_img")
      : mediaType === "text"
        ? t("file_badge_txt")
        : t("file_badge_pdf");
  const badgeColor =
    mediaType === "image"
      ? "bg-blue-500"
      : mediaType === "text"
        ? "bg-gray-500"
        : "bg-red-500";
  return (
    <div className="flex items-center gap-3 py-1">
      <div
        className={`w-10 h-10 rounded-lg ${badgeColor} flex items-center justify-center shrink-0`}
      >
        <span className="text-white text-[10px] font-bold tracking-wide">
          {badge}
        </span>
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-[13px] leading-tight">{fileName}</p>
        <p className="text-[11px] opacity-50 mt-0.5">{fileSize}</p>
      </div>
    </div>
  );
}
