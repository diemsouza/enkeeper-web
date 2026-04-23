"use client";

import {
  forwardRef,
  useImperativeHandle,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";

export type Plan = "lite" | "essential" | "pro";

export type UpgradeModalOpenOptions = {
  upgradeUrl?: string; // default: "/billing/upgrade"
  title?: string; // sobrepõe título traduzido
  message?: ReactNode; // sobrepõe mensagem traduzida
  allowWhileLoading?: boolean; // se true, permite ação enquanto session carrega
};

export type UpgradeModalRef = {
  open: (need: Plan, options?: UpgradeModalOpenOptions) => void;
  close: () => void;
  /** Retorna true se permitiu e executou a ação; caso contrário abre a modal e retorna false */
  guard: (
    need: Plan,
    action?: () => void,
    options?: UpgradeModalOpenOptions,
  ) => boolean;
};

function canAccess(current: Plan | undefined, need: Plan) {
  if (need === "lite")
    return current === "lite" || current === "essential" || current === "pro";
  if (need === "essential") return current === "essential" || current === "pro";
  if (need === "pro") return current === "pro";
  return false;
}

export const UpgradeModal = forwardRef<UpgradeModalRef, {}>(
  function UpgradeModal(_, ref) {
    const { data, status } = useSession(); // lê plano internamente
    const t = useTranslations("upgrade_modal");

    const plan = (data?.user as any)?.plan?.code as Plan | undefined;

    const [isOpen, setIsOpen] = useState(false);
    const [need, setNeed] = useState<Plan>("pro");
    const [opts, setOpts] = useState<UpgradeModalOpenOptions>({});

    useImperativeHandle(
      ref,
      () => ({
        open: (n, options) => {
          setNeed(n);
          setOpts(options ?? {});
          setIsOpen(true);
        },
        close: () => setIsOpen(false),
        guard: (n, action, options) => {
          const allowLoading = options?.allowWhileLoading ?? false;
          const loading = status === "loading" && plan === undefined;

          if (loading && allowLoading) {
            action?.();
            return true;
          }

          if (canAccess(plan, n)) {
            action?.();
            return true;
          }

          // bloqueado → abre modal
          setNeed(n);
          setOpts(options ?? {});
          setIsOpen(true);
          return false;
        },
      }),
      [plan, status],
    );

    const needLabel = useMemo(() => {
      try {
        return t(`plans.${need}`);
      } catch {
        return need[0].toUpperCase() + need.slice(1);
      }
    }, [need]);

    const title = opts.title ?? t("title");
    // Evita t.rich (fonte do erro do "Functions are not valid as a React child"):
    const defaultMessage = t("message", { plan: needLabel });
    const messageNode = opts.message ?? defaultMessage;

    const upgradeUrl =
      (opts.upgradeUrl ?? plan) ? "/api/billing/portal" : "/app/billing";

    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground mt-2">{messageNode}</p>

          <div className="mt-4 grid gap-2">
            <Button
              className="w-full"
              onClick={() => {
                window.location.href = upgradeUrl;
              }}
            >
              {t("button_upgrade")}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setIsOpen(false)}
            >
              {t("button_cancel")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  },
);
