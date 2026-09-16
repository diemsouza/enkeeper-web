import type { ReactNode } from "react";
import { BatteryFull } from "lucide-react";

export function IphoneShell({ children }: { children: ReactNode }) {
  return (
    <div className="hidden lg:block absolute top-1/2 -translate-y-1/2 right-[-70px] w-[260px] h-[520px] z-20">
      <div className="relative w-full h-full rounded-[36px] border-[6px] border-neutral-900 dark:border-neutral-700 bg-background shadow-2xl overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 rounded-full bg-black z-30"
        />
        <div className="absolute top-0 inset-x-0 h-9 flex items-center justify-between px-4 z-20">
          <span className="text-[10px] font-medium">9:41</span>
          <BatteryFull
            className="w-3.5 h-3.5"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </div>
        <div className="absolute inset-0 pt-9">{children}</div>
      </div>
    </div>
  );
}
