"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { PhoneConfirmModal } from "@/src/components/shared/phone-confirm-modal";
import { AddToCalendarModal } from "./add-to-calendar-modal";

type ReminderFlowContextValue = {
  openReminder: () => void;
};

const ReminderFlowContext = createContext<ReminderFlowContextValue | null>(
  null,
);

export function useReminderFlow(): ReminderFlowContextValue {
  const ctx = useContext(ReminderFlowContext);
  if (!ctx) throw new Error("useReminderFlow fora do ReminderFlowProvider");
  return ctx;
}

// Lembrete sai pelo WhatsApp: conta sem número cadastra e confirma o número
// antes, e o lembrete abre já ativado no horário da conta.
export function ReminderFlowProvider({
  hasPhone,
  dailyReminderEnabled,
  dailyReminderTime,
  children,
}: {
  hasPhone: boolean;
  dailyReminderEnabled: boolean;
  dailyReminderTime: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("app.account");
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [isPreset, setIsPreset] = useState(false);

  const openReminder = useCallback(() => {
    if (hasPhone) {
      setIsPreset(false);
      setReminderOpen(true);
      return;
    }
    setPhoneOpen(true);
  }, [hasPhone]);

  function handlePhoneConfirmed(): void {
    setPhoneOpen(false);
    setIsPreset(true);
    setReminderOpen(true);
  }

  const value = useMemo(() => ({ openReminder }), [openReminder]);

  return (
    <ReminderFlowContext.Provider value={value}>
      {children}
      <PhoneConfirmModal
        open={phoneOpen}
        onOpenChange={setPhoneOpen}
        title={t("phone_prompt_title")}
        subtitle={t("phone_prompt_subtitle")}
        onConfirmed={handlePhoneConfirmed}
      />
      <AddToCalendarModal
        open={reminderOpen}
        onOpenChange={setReminderOpen}
        dailyReminderEnabled={isPreset || dailyReminderEnabled}
        dailyReminderTime={dailyReminderTime}
        isPreset={isPreset}
      />
    </ReminderFlowContext.Provider>
  );
}
