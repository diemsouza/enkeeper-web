// h-7 = altura exata da bolha (py-3 + ponto de 4px): o slot fica sempre no
// fim da lista e a altura do conteudo nao muda quando o digitando liga/desliga.
export const TYPING_SLOT_PX = 28;

export function TypingIndicatorSlot({ isVisible }: { isVisible: boolean }) {
  return (
    <div className="h-7 shrink-0" aria-hidden={!isVisible}>
      {isVisible && <TypingIndicatorBubble />}
    </div>
  );
}

function TypingIndicatorBubble() {
  return (
    <div className="relative z-10 flex justify-start">
      <div className="flex items-center gap-1 rounded-[10px_10px_10px_2px] bg-white px-3.5 py-3 dark:bg-[#252529]">
        <span className="h-1 w-1 animate-typing-dot rounded-full bg-muted-foreground/60 [animation-delay:0s]" />
        <span className="h-1 w-1 animate-typing-dot rounded-full bg-muted-foreground/60 [animation-delay:0.15s]" />
        <span className="h-1 w-1 animate-typing-dot rounded-full bg-muted-foreground/60 [animation-delay:0.3s]" />
      </div>
    </div>
  );
}
