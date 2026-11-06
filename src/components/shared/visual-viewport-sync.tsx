"use client";

import { useEffect } from "react";

function revealFocusedDialogField(): void {
  const focused = document.activeElement;
  if (focused?.closest('[role="dialog"]')) {
    focused.scrollIntoView({ block: "nearest" });
  }
}

// O teclado do celular nao muda o layout nem o dvh, so o visualViewport.
// As modais se posicionam por estas variaveis para ficar acima dele.
export function VisualViewportSync(): null {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const root = document.documentElement;
    let lastHeight = viewport.height;

    const syncViewport = (): void => {
      root.style.setProperty("--vv-top", `${viewport.offsetTop}px`);
      root.style.setProperty("--vv-height", `${viewport.height}px`);
      if (viewport.height < lastHeight) revealFocusedDialogField();
      lastHeight = viewport.height;
    };

    syncViewport();
    viewport.addEventListener("resize", syncViewport);
    viewport.addEventListener("scroll", syncViewport);

    return () => {
      viewport.removeEventListener("resize", syncViewport);
      viewport.removeEventListener("scroll", syncViewport);
      root.style.removeProperty("--vv-top");
      root.style.removeProperty("--vv-height");
    };
  }, []);

  return null;
}
