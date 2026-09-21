"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { Label } from "@/src/components/ui/label";
import { Switch } from "@/src/components/ui/switch";
import { Separator } from "@/src/components/ui/separator";
import { Spinner } from "@/src/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { postJson } from "@/src/lib/api-client";
import { getDailyReminderTimeSlots } from "@/src/core/daily-reminder-time";
import {
  buildGoogleCalendarUrl,
  buildIcsFileContent,
  type CalendarEventInput,
} from "@/src/core/calendar-event";
import { LogoGoogle } from "@/src/components/icons";
import { useToast } from "@/src/hooks/use-toast";

const ICS_FILE_NAME = "fluizer-pratica-diaria.ics";

function downloadIcsFile(content: string): void {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = ICS_FILE_NAME;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function AddToCalendarModal({
  open,
  onOpenChange,
  dailyReminderEnabled,
  dailyReminderTime,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dailyReminderEnabled: boolean;
  dailyReminderTime: string;
}) {
  const t = useTranslations("app.account");
  const router = useRouter();
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(dailyReminderEnabled);
  const [time, setTime] = useState(dailyReminderTime);
  const [savedEnabled, setSavedEnabled] = useState(dailyReminderEnabled);
  const [savedTime, setSavedTime] = useState(dailyReminderTime);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setEnabled(dailyReminderEnabled);
      setTime(dailyReminderTime);
      setSavedEnabled(dailyReminderEnabled);
      setSavedTime(dailyReminderTime);
    }
  }, [open, dailyReminderEnabled, dailyReminderTime]);

  const isDirty = enabled !== savedEnabled || time !== savedTime;

  function buildInput(): CalendarEventInput {
    const appUrl = `${process.env.NEXT_PUBLIC_APP_URL}/app`;
    return {
      time,
      appUrl,
      now: new Date(),
      eventTitle: t("add_to_calendar_event_title"),
      eventDescription: t("add_to_calendar_event_description") + appUrl,
    };
  }

  function handleGoogleClick(): void {
    window.open(
      buildGoogleCalendarUrl(buildInput()),
      "_blank",
      "noopener,noreferrer",
    );
  }

  function handleIcsClick(): void {
    downloadIcsFile(buildIcsFileContent(buildInput()));
  }

  async function handleSave(): Promise<void> {
    setSaving(true);
    const { ok } = await postJson("/api/app/account/daily-reminder", {
      enabled,
      time,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    setSaving(false);
    if (!ok) {
      toast({
        variant: "destructive",
        title: t("daily_reminder_save_error"),
      });
      return;
    }
    setSavedEnabled(enabled);
    setSavedTime(time);
    router.refresh();
    toast({ description: t("daily_reminder_save_success") });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("add_to_calendar_modal_title")}</DialogTitle>
          <DialogDescription>
            {t("daily_reminder_modal_subtitle")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div>
            <p className="text-sm font-medium">
              {t("daily_reminder_toggle_label")}
            </p>
            <p className="text-xs text-muted-foreground">
              {enabled
                ? t("daily_reminder_toggle_on")
                : t("daily_reminder_toggle_off")}
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="add-to-calendar-time">
            {t("add_to_calendar_time_label")}
          </Label>
          <Select value={time} onValueChange={setTime}>
            <SelectTrigger id="add-to-calendar-time">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getDailyReminderTimeSlots().map((slot) => (
                <SelectItem key={slot} value={slot}>
                  {slot}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          className="w-full"
          disabled={!isDirty || saving}
          onClick={handleSave}
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <Spinner size="xs" className="border-primary-foreground" />
              {t("daily_reminder_saving")}
            </span>
          ) : (
            t("daily_reminder_save_button")
          )}
        </Button>

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">
            {t("daily_reminder_calendar_divider")}
          </span>
          <Separator className="flex-1" />
        </div>

        <div className="grid gap-2">
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleGoogleClick}
          >
            <LogoGoogle size={16} />
            {t("add_to_calendar_google_button")}
          </Button>
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleIcsClick}
          >
            <Download className="h-4 w-4" />
            {t("add_to_calendar_ics_button")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
