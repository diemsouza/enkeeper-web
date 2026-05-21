"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import {
  MyDialog,
  MyDialogContent,
  MyDialogHeader,
  MyDialogBody,
} from "@/src/components/shared/MyDialog";
import { Button } from "@/src/components/ui/button";

type Status = "idle" | "submitting" | "success" | "error" | "already";

type WaitlistModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function WaitlistModal({ open, onOpenChange }: WaitlistModalProps) {
  const t = useTranslations("home.waitlist.modal");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        return;
      }
      setStatus(data.already ? "already" : "success");
    } catch {
      setStatus("error");
    }
  }

  const isDone = status === "success" || status === "already";

  return (
    <MyDialog open={open} onOpenChange={onOpenChange}>
      <MyDialogContent size="sm">
        <MyDialogHeader title={t("title")} />
        <MyDialogBody>
          {isDone ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">
                {status === "already" ? t("already_waitlisted") : t("success")}
              </p>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t("close")}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">{t("description")}</p>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("name_placeholder")}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <PhoneInput
                country="br"
                value={phone}
                onChange={(value) => setPhone(value)}
                inputStyle={{
                  width: "100%",
                  height: "40px",
                  fontSize: "14px",
                  borderRadius: "6px",
                }}
                containerStyle={{ width: "100%" }}
              />
              {status === "error" && (
                <p className="text-sm text-destructive">{t("error")}</p>
              )}
              <Button
                type="submit"
                disabled={status === "submitting"}
                className="w-full"
              >
                {t("submit")}
              </Button>
            </form>
          )}
        </MyDialogBody>
      </MyDialogContent>
    </MyDialog>
  );
}
