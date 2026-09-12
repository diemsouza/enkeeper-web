import { cn } from "@/src/lib/utils";

const SPINNER_SIZE_CLASSES = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-8 w-8",
} as const;

export function Spinner({
  size = "md",
  centerHorizontal = false,
  centerVertical = false,
  className,
}: {
  size?: keyof typeof SPINNER_SIZE_CLASSES;
  centerHorizontal?: boolean;
  centerVertical?: boolean;
  className?: string;
}) {
  const circle = (
    <div
      className={cn(
        "animate-spin rounded-full border-b-2 border-foreground/40",
        SPINNER_SIZE_CLASSES[size],
        !centerHorizontal && !centerVertical && className,
      )}
    />
  );

  if (!centerHorizontal && !centerVertical) return circle;

  return (
    <div
      className={cn(
        "flex",
        centerHorizontal && "justify-center",
        centerVertical && "items-center",
        className,
      )}
    >
      {circle}
    </div>
  );
}
