"use client";

import { cn } from "@/src/lib/utils";

// Cores fixas (sem bg-muted/bg-background) para o alternador ficar igual no
// site e no app, independente do tema da página.
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  isOptionDisabled,
  className,
  optionClassName,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
  isOptionDisabled?: (value: T) => boolean;
  className?: string;
  optionClassName?: string;
}) {
  const selectedIndex = options.findIndex((option) => option.value === value);

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "relative grid rounded-full bg-black/5 p-1 dark:bg-white/10",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out dark:bg-[#3A3A3C]"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(${selectedIndex * 100}%)`,
        }}
      />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          disabled={isOptionDisabled?.(option.value)}
          onClick={() => onChange(option.value)}
          className={cn(
            "relative z-10 h-10 px-3 text-[15px] transition-colors disabled:cursor-not-allowed disabled:opacity-50",
            value === option.value
              ? "font-semibold text-foreground"
              : "font-medium text-muted-foreground enabled:hover:text-foreground",
            optionClassName,
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
