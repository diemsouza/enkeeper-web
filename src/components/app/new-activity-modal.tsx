"use client";

import { useEffect, useState } from "react";
import type { Level } from "@/src/lib/prisma";
import { Dialog, DialogContent } from "@/src/components/ui/dialog";
import { NewActivityMainStep } from "./new-activity-main-step";
import { NewActivityMaterialStep } from "./new-activity-material-step";

export type NewActivityStep = "main" | "material";

// Altura fixa para a lista de sugestoes rolar por dentro. O conteudo desmonta
// ao fechar, entao o estado zera.
export function NewActivityModal({
  open,
  onOpenChange,
  initialStep,
  initialText,
  initialLevel,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStep: NewActivityStep;
  initialText: string;
  initialLevel: Level;
  onCreated: (level: Level) => void;
}) {
  const [step, setStep] = useState<NewActivityStep>(initialStep);
  const [level, setLevel] = useState<Level>(initialLevel);

  useEffect(() => {
    if (!open) return;
    setStep(initialStep);
    setLevel(initialLevel);
  }, [open, initialStep, initialLevel]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        isFullScreenOnMobile
        className="flex h-[min(820px,90dvh)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        {step === "main" ? (
          <NewActivityMainStep
            initialText={initialText}
            level={level}
            onLevelChange={setLevel}
            onUseMaterial={() => setStep("material")}
            onCreated={() => onCreated(level)}
          />
        ) : (
          <NewActivityMaterialStep
            level={level}
            onLevelChange={setLevel}
            onBack={() => setStep("main")}
            onCreated={() => onCreated(level)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
