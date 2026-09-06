export function TypingIndicatorBubble() {
  return (
    <div className="relative z-10 flex justify-start">
      <div className="flex items-center gap-1 rounded-[10px_10px_10px_2px] bg-white px-3.5 py-3 dark:bg-[#1C1C1E]">
        <span className="h-1 w-1 animate-typing-dot rounded-full bg-muted-foreground/60 [animation-delay:0s]" />
        <span className="h-1 w-1 animate-typing-dot rounded-full bg-muted-foreground/60 [animation-delay:0.15s]" />
        <span className="h-1 w-1 animate-typing-dot rounded-full bg-muted-foreground/60 [animation-delay:0.3s]" />
      </div>
    </div>
  );
}
