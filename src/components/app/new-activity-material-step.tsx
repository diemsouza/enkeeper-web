"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Check, FileText, X } from "lucide-react";
import { ulid } from "ulid";
import type { Level } from "@/src/lib/prisma";
import {
  MATERIAL_ACCEPT,
  MATERIAL_MAX_BYTES,
  MAX_DOC_ITEMS_PER_DOC,
} from "@/src/lib/constants";
import { postForm, postJson } from "@/src/lib/api-client";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/button";
import { DialogDescription, DialogTitle } from "@/src/components/ui/dialog";
import { Spinner } from "@/src/components/ui/spinner";
import { NewActivityLevelSelect } from "./new-activity-level-select";
import { NewActivityFeedbackView } from "./new-activity-feedback";
import {
  ActivityOutcomeBody,
  NewActivityFeedback,
  resolveActivityFeedback,
} from "./new-activity-outcome";

type FileErrorCode =
  | "blocked"
  | "unreadable"
  | "empty"
  | "unsupported"
  | "too_large"
  | "failed";

type ExtractedFile = {
  messageId: string;
  mediaType: "image" | "pdf" | "text";
  text: string;
  mediaId: string | null;
};

type MaterialFile = {
  key: string;
  file: File;
  status: "extracting" | "ready" | "error";
  errorCode?: FileErrorCode;
  extracted?: ExtractedFile;
};

const FILE_ERROR_CODES: FileErrorCode[] = [
  "blocked",
  "unreadable",
  "empty",
  "unsupported",
  "too_large",
];

async function extractFile(
  file: File,
): Promise<{ extracted: ExtractedFile } | { errorCode: FileErrorCode }> {
  if (file.size > MATERIAL_MAX_BYTES) return { errorCode: "too_large" };
  const form = new FormData();
  form.append("file", file);
  const { ok, body } = await postForm<ExtractedFile & { code?: string }>(
    "/api/app/activities/material/extract",
    form,
  );
  if (ok) return { extracted: body };
  const code = FILE_ERROR_CODES.find((c) => c === body.code);
  return { errorCode: code ?? "failed" };
}

export function NewActivityMaterialStep({
  level,
  onLevelChange,
  onBack,
  onCreated,
}: {
  level: Level;
  onLevelChange: (level: Level) => void;
  onBack: () => void;
  onCreated: () => void;
}) {
  const t = useTranslations("app.new_activity");
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<MaterialFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<NewActivityFeedback | null>(null);

  const readyFiles = files.filter((f) => f.status === "ready");
  const isExtracting = files.some((f) => f.status === "extracting");
  const canAddMore = files.length < MAX_DOC_ITEMS_PER_DOC;
  const canSubmit = readyFiles.length > 0 && !isExtracting && !isSubmitting;

  function updateFile(key: string, patch: Partial<MaterialFile>): void {
    setFiles((prev) => prev.map((f) => (f.key === key ? { ...f, ...patch } : f)));
  }

  async function addFile(file: File): Promise<void> {
    const key = ulid();
    setFiles((prev) => [...prev, { key, file, status: "extracting" }]);
    const result = await extractFile(file);
    if ("extracted" in result) {
      updateFile(key, { status: "ready", extracted: result.extracted });
      return;
    }
    updateFile(key, { status: "error", errorCode: result.errorCode });
  }

  function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = "";
    setFeedback(null);
    const slots = MAX_DOC_ITEMS_PER_DOC - files.length;
    selected.slice(0, slots).forEach((file) => void addFile(file));
  }

  async function handleSubmit(): Promise<void> {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setFeedback(null);
    const items = readyFiles.flatMap(({ file, extracted }) =>
      extracted
        ? [
            {
              messageId: extracted.messageId,
              mediaType: extracted.mediaType,
              fileName: file.name,
              sizeBytes: file.size,
              text: extracted.mediaType === "image" ? undefined : extracted.text,
              mediaId: extracted.mediaId ?? undefined,
            },
          ]
        : [],
    );
    const { ok, body } = await postJson<ActivityOutcomeBody>(
      "/api/app/activities",
      { source: "material", level, items },
    );
    setIsSubmitting(false);
    if (ok) {
      onCreated();
      return;
    }
    setFeedback(resolveActivityFeedback(body));
  }

  return (
    <>
      <div className="px-5 pt-5 sm:px-6 sm:pt-6">
        <DialogTitle className="pr-8">
          {t("material.title")}
        </DialogTitle>
        <DialogDescription className="mt-1">
          {t("material.subtitle")}
        </DialogDescription>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={MATERIAL_ACCEPT}
          onChange={handleFilesChange}
          className="hidden"
        />
        <button
          type="button"
          disabled={!canAddMore}
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-1 rounded-panel border border-dashed border-input bg-muted/40 px-4 py-6 transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
        >
          <span className="font-semibold">{t("material.upload")}</span>
          <span className="text-sm text-muted-foreground">
            {t("material.upload_hint", { max: MAX_DOC_ITEMS_PER_DOC })}
          </span>
        </button>

        {files.length > 0 && (
          <ul className="space-y-2">
            {files.map((item) => (
              <MaterialFileRow
                key={item.key}
                item={item}
                onRemove={() =>
                  setFiles((prev) => prev.filter((f) => f.key !== item.key))
                }
              />
            ))}
          </ul>
        )}

        <ul className="list-disc space-y-1 rounded-panel bg-muted/40 px-8 py-4 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">{t("material.tip_photo_label")}</strong>{" "}
            {t("material.tip_photo")}
          </li>
          <li>
            <strong className="text-foreground">{t("material.tip_pdf_label")}</strong>{" "}
            {t("material.tip_pdf")}
          </li>
          <li>
            <strong className="text-foreground">{t("material.tip_text_label")}</strong>{" "}
            {t("material.tip_text")}
          </li>
        </ul>

        {feedback && <NewActivityFeedbackView feedback={feedback} />}
      </div>

      <div className="border-t border-border px-5 py-3 sm:px-6">
        <NewActivityLevelSelect value={level} onChange={onLevelChange} />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
        <button
          type="button"
          onClick={onBack}
          className="flex min-h-touch items-center gap-1 text-sm font-medium hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("material.back")}
        </button>
        <Button
          type="button"
          size="lg"
          disabled={!canSubmit}
          onClick={() => void handleSubmit()}
        >
          {isSubmitting && <Spinner size="sm" className="mr-2 border-primary-foreground" />}
          {isSubmitting ? t("creating") : t("continue")}
        </Button>
      </div>
    </>
  );
}

function MaterialFileRow({
  item,
  onRemove,
}: {
  item: MaterialFile;
  onRemove: () => void;
}) {
  const t = useTranslations("app.new_activity.material");
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-control border px-3 py-2",
        item.status === "error" ? "border-destructive/50" : "border-border",
      )}
    >
      <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.file.name}</p>
        <p
          className={cn(
            "text-xs",
            item.status === "error" ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {item.status === "extracting" && t("extracting")}
          {item.status === "ready" && t("ready")}
          {item.status === "error" && t(`file_errors.${item.errorCode ?? "failed"}`)}
        </p>
      </div>
      {item.status === "extracting" && <Spinner size="sm" />}
      {item.status === "ready" && <Check className="h-4 w-4 text-primary" />}
      <button
        type="button"
        onClick={onRemove}
        disabled={item.status === "extracting"}
        aria-label={t("remove")}
        className="touch-target rounded-full p-1 text-muted-foreground hover:bg-accent disabled:opacity-40"
      >
        <X className="h-4 w-4" />
      </button>
    </li>
  );
}
