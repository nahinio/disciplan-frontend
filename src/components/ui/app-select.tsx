"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const APP_SELECT_EMPTY = "__empty__";

export type AppSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type AppSelectGroup = {
  label: string;
  options: AppSelectOption[];
};

const sizeClasses = {
  pill: "h-11 rounded-full px-4 text-sm min-w-[10rem]",
  md: "h-10 rounded-xl px-3 text-sm",
  sm: "h-9 rounded-xl px-3 text-xs",
  xs: "h-7 rounded-full px-2.5 text-[11px] font-semibold",
} as const;

export type AppSelectSize = keyof typeof sizeClasses;

function toSelectValue(value: string) {
  return value === "" ? APP_SELECT_EMPTY : value;
}

function fromSelectValue(value: string) {
  return value === APP_SELECT_EMPTY ? "" : value;
}

type AppSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options?: AppSelectOption[];
  groups?: AppSelectGroup[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  size?: AppSelectSize;
};

function renderOptions(items: AppSelectOption[]) {
  return items.map((opt) => (
    <SelectItem
      key={opt.value === "" ? APP_SELECT_EMPTY : opt.value}
      value={toSelectValue(opt.value)}
      disabled={opt.disabled}
    >
      {opt.label}
    </SelectItem>
  ));
}

export function AppSelect({
  value,
  onValueChange,
  options = [],
  groups,
  placeholder,
  disabled,
  className,
  size = "md",
}: AppSelectProps) {
  const selectValue = toSelectValue(value);

  return (
    <Select
      value={selectValue}
      onValueChange={(v) => onValueChange(fromSelectValue(v))}
      disabled={disabled}
    >
      <SelectTrigger className={cn(sizeClasses[size], className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {groups
          ? groups.map((group) => (
              <SelectGroup key={group.label}>
                <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
                  {group.label}
                </SelectLabel>
                {renderOptions(group.options)}
              </SelectGroup>
            ))
          : renderOptions(options)}
      </SelectContent>
    </Select>
  );
}
