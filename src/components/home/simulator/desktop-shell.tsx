import type { ReactNode } from "react";

export function DesktopShell({ children }: { children: ReactNode }) {
  return (
    <div className="w-full h-[620px] rounded-xl border border-border shadow-2xl overflow-hidden bg-background flex flex-col">
      <div className="flex items-center gap-2 h-9 px-4 border-b border-border bg-muted/50 shrink-0">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 flex justify-center">
          <span className="text-xs text-muted-foreground bg-background rounded-full px-3 py-0.5">
            fluizer.com/app
          </span>
        </div>
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
