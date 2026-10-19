"use client";

import { useRef, type MouseEvent, type PointerEvent } from "react";

type FocusKeepingProps = {
  onPointerDown: (e: PointerEvent<HTMLElement>) => void;
  onMouseDown: (e: MouseEvent<HTMLElement>) => void;
};

// Controles de audio nao podem tirar o foco do composer: no celular isso fecha
// o teclado enquanto o usuario ouve a pergunta e escreve. O iOS move o foco no
// mousedown sintetizado depois do toque, que o preventDefault no pointerdown
// nao cancela. O click continua disparando, entao o unlock do audio segue
// sincrono dentro do gesto. restoreFocus cobre o caso em que o foco saiu mesmo
// assim e precisa ser chamado depois do trabalho do click.
export function useKeepComposerFocus(): {
  buttonProps: FocusKeepingProps;
  sliderProps: FocusKeepingProps;
  restoreFocus: () => void;
} {
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const pointerTypeRef = useRef<string>("mouse");

  function rememberComposer(e: PointerEvent<HTMLElement>): void {
    pointerTypeRef.current = e.pointerType;
    const active = document.activeElement;
    composerRef.current = active instanceof HTMLTextAreaElement ? active : null;
  }

  function restoreFocus(): void {
    const composer = composerRef.current;
    composerRef.current = null;
    if (composer && document.activeElement !== composer) {
      composer.focus({ preventScroll: true });
    }
  }

  return {
    buttonProps: {
      onPointerDown: (e) => {
        e.preventDefault();
        rememberComposer(e);
      },
      onMouseDown: (e) => e.preventDefault(),
    },
    // No mouse o mousedown do range e o que inicia o arraste; so o toque
    // pode ter o mousedown sintetizado cancelado.
    sliderProps: {
      onPointerDown: rememberComposer,
      onMouseDown: (e) => {
        if (pointerTypeRef.current !== "mouse") e.preventDefault();
      },
    },
    restoreFocus,
  };
}
