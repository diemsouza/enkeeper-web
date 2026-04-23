"use client";

import { useState } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/src/components/ui/popover";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Label } from "@/src/components/ui/label";
import { Badge } from "@/src/components/ui/badge";

interface MultiSelectOption {
  label: string;
  value: string;
}

interface MultiSelectProps {
  label?: string;
  options: MultiSelectOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  helperText?: string;
  maxTagsToShow?: number;
  maxSelected?: number;
}

export function MultiSelect({
  label,
  options,
  selectedValues,
  onChange,
  placeholder = "Selecione...",
  helperText,
  maxTagsToShow = 2,
  maxSelected,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);

  const toggleValue = (value: string) => {
    const alreadySelected = selectedValues.includes(value);

    if (alreadySelected) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      if (!maxSelected || selectedValues.length < maxSelected) {
        onChange([...selectedValues, value]);
      }
    }
  };

  const selectedOptions = options.filter((opt) =>
    selectedValues.includes(opt.value)
  );

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div
            role="button"
            className="w-full border border-input bg-background rounded-md flex flex-wrap items-center gap-1 px-3 py-2 text-sm shadow-sm hover:bg-accent cursor-pointer"
          >
            {selectedOptions.length > 0 ? (
              <>
                {selectedOptions.slice(0, maxTagsToShow).map((opt) => (
                  <Badge key={opt.value} variant="secondary">
                    {opt.label}
                  </Badge>
                ))}
                {selectedOptions.length > maxTagsToShow && (
                  <span className="text-sm text-muted-foreground">
                    +{selectedOptions.length - maxTagsToShow}
                  </span>
                )}
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent
          side="bottom"
          align="start"
          className="w-72 space-y-2 max-h-60 overflow-auto"
        >
          {options.map((option) => {
            const isSelected = selectedValues.includes(option.value);
            const isDisabled =
              !isSelected &&
              maxSelected !== undefined &&
              selectedValues.length >= maxSelected;

            return (
              <div key={option.value} className="flex items-center gap-2">
                <Checkbox
                  id={option.value}
                  checked={isSelected}
                  onCheckedChange={() => toggleValue(option.value)}
                  disabled={isDisabled}
                />
                <label
                  htmlFor={option.value}
                  className={`text-sm cursor-pointer ${
                    isDisabled
                      ? "text-muted-foreground opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  {option.label}
                </label>
              </div>
            );
          })}
        </PopoverContent>
      </Popover>
      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}
