import { Label } from "@/src/components/ui/label";
import { cn } from "@/src/lib/utils";

interface LabelWithCounterProps {
  id: string;
  label: string;
  value: string;
  maxLength?: number | null;
  warningThreshold?: number;
  className?: string;
}

export function LabelWithCounter({
  id,
  label,
  value,
  maxLength,
  warningThreshold = 0.9,
  className,
}: LabelWithCounterProps) {
  const length = value?.length ?? 0;
  const isNearLimit = maxLength && length >= maxLength * warningThreshold;

  return (
    <div className={cn("flex items-center justify-between", className)}>
      <Label htmlFor={id}>{label}</Label>

      <span
        className={cn(
          "text-xs",
          isNearLimit ? "text-muted-foreground" : "text-muted-foreground",
        )}
      >
        {maxLength ? `${length}/${maxLength}` : length}
      </span>
    </div>
  );
}
