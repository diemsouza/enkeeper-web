"use client";

import { SidebarTrigger, useSidebar } from "@/src/components/ui/sidebar";

export function AppHeader() {
  const { isMobile } = useSidebar();
  if (!isMobile) return null;

  return (
    <header
      className="glass-effect flex min-h-14 shrink-0 items-center gap-2 border-b border-border/40 px-2"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <SidebarTrigger />
      <span className="truncate text-sm font-medium">Fluizer</span>
    </header>
  );
}
