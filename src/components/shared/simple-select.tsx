"use client";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/src/components/ui/select";

type Option = {
  value: string;
  label: string;
};

interface SimpleSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SimpleSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  disabled = false,
  className,
}: SimpleSelectProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} className="text-md" />
      </SelectTrigger>

      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="text-md">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
