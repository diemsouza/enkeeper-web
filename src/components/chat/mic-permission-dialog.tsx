"use client";

import { useEffect, useState } from "react";
import { MicOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/src/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/src/components/ui/drawer";
import { useIsMobile } from "@/src/hooks/use-is-mobile";
import {
  detectPermissionPlatform,
  type PermissionPlatform,
} from "@/src/lib/voice-recording";

type MicPermissionDialogProps = {
  open: boolean;
  onConfirm: () => void;
  onAfterClose: () => void;
};

function PermissionSteps({
  platform,
}: {
  platform: PermissionPlatform;
}): React.JSX.Element {
  const t = useTranslations("app.chat.mic_permission");
  const steps = t.raw(`${platform}.steps`) as string[];
  const note = t(`${platform}.note`);
  return (
    <div className="rounded-xl bg-muted px-4 py-3 text-left text-sm">
      <ol className="list-decimal space-y-1.5 pl-4">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {note && <p className="mt-2.5 text-muted-foreground">{note}</p>}
    </div>
  );
}

function PermissionIcon(): React.JSX.Element {
  return (
    <div className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
      <MicOff className="h-6 w-6" />
    </div>
  );
}

function PermissionBody({
  platform,
  onConfirm,
}: {
  platform: PermissionPlatform;
  onConfirm: () => void;
}): React.JSX.Element {
  const t = useTranslations("app.chat.mic_permission");
  return (
    <div className="flex flex-col gap-4">
      <PermissionSteps platform={platform} />
      <Button type="button" className="h-11 w-full" onClick={onConfirm}>
        {t("confirm")}
      </Button>
    </div>
  );
}

export function MicPermissionDialog({
  open,
  onConfirm,
  onAfterClose,
}: MicPermissionDialogProps): React.JSX.Element {
  const t = useTranslations("app.chat.mic_permission");
  const isMobile = useIsMobile();
  const [platform, setPlatform] = useState<PermissionPlatform>("desktop");

  useEffect(() => {
    if (open) setPlatform(detectPermissionPlatform());
  }, [open]);

  const handleOpenChange = (next: boolean): void => {
    if (!next) onConfirm();
  };

  // O foco vai para o campo de texto, nao volta para o botao do microfone.
  const handleCloseAutoFocus = (event: Event): void => {
    event.preventDefault();
    onAfterClose();
  };

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent
          className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          onCloseAutoFocus={handleCloseAutoFocus}
        >
          <div className="mx-auto flex w-full max-w-sm flex-col gap-2 pt-4 text-center">
            <PermissionIcon />
            <DrawerTitle>{t("title")}</DrawerTitle>
            <DrawerDescription>{t("description")}</DrawerDescription>
          </div>
          <div className="mx-auto mt-4 w-full max-w-sm">
            <PermissionBody platform={platform} onConfirm={onConfirm} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-sm gap-2 text-center"
        onCloseAutoFocus={handleCloseAutoFocus}
      >
        <PermissionIcon />
        <DialogTitle className="text-center">{t("title")}</DialogTitle>
        <DialogDescription className="text-center">
          {t("description")}
        </DialogDescription>
        <div className="mt-2">
          <PermissionBody platform={platform} onConfirm={onConfirm} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
