import { cn } from "@/src/lib/utils";
import { Spinner } from "@/src/components/ui/spinner";

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
        className,
      )}
    >
      <Spinner />
    </div>
  );
}
