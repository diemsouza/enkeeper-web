import { cn } from "@/src/lib/utils";

export function Loading({
  fullScreen = false,
  className,
}: {
  fullScreen?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex justify-center",
        fullScreen ? "h-full items-start pt-16" : "items-center p-4",
        className
      )}
    >
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
