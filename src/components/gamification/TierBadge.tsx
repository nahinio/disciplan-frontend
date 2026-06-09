import { tierBadgeUrl, tierDisplayLabel } from "@/lib/tierBadges";
import { cn } from "@/lib/utils";

const SIZE_CLASS = {
  xs: "w-4 h-4",
  sm: "w-6 h-6",
  md: "w-9 h-9",
  lg: "w-12 h-12",
  xl: "w-16 h-16",
  "2xl": "w-20 h-20",
  "3xl": "w-24 h-24",
} as const;

const LABEL_CLASS = {
  xs: "text-[9px]",
  sm: "text-[11px]",
  md: "text-xs",
  lg: "text-sm",
  xl: "text-base",
  "2xl": "text-lg",
  "3xl": "text-xl",
} as const;

export function TierBadge({
  tierCode,
  tierLabel,
  size = "md",
  showLabel = false,
  labelPosition = "right",
  dimmed = false,
  className,
  imgClassName,
  labelClassName,
}: {
  tierCode?: string | null;
  tierLabel?: string | null;
  size?: keyof typeof SIZE_CLASS;
  showLabel?: boolean;
  labelPosition?: "right" | "below";
  dimmed?: boolean;
  className?: string;
  imgClassName?: string;
  labelClassName?: string;
}) {
  const url = tierBadgeUrl(tierCode, tierLabel);
  const label = tierDisplayLabel(tierCode, tierLabel);

  if (!url) {
    if (!showLabel || !label) return null;
    return (
      <span className={cn("font-semibold text-muted-foreground", LABEL_CLASS[size], className)}>
        {label}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center",
        labelPosition === "below" ? "flex-col gap-1" : "flex-row gap-1.5",
        className
      )}
      title={label ?? undefined}
    >
      <img
        src={url}
        alt={label ? `${label} tier` : "Tier badge"}
        className={cn(
          SIZE_CLASS[size],
          "object-contain shrink-0 drop-shadow-sm",
          dimmed && "opacity-35 grayscale",
          imgClassName
        )}
      />
      {showLabel && label && (
        <span
          className={cn(
            "font-semibold leading-none",
            LABEL_CLASS[size],
            dimmed ? "text-muted-foreground" : "text-foreground",
            labelClassName
          )}
        >
          {label}
        </span>
      )}
    </div>
  );
}

/** Compact pill for headers and inline UI */
export function TierBadgePill({
  tierCode,
  tierLabel,
  className,
}: {
  tierCode?: string | null;
  tierLabel?: string | null;
  className?: string;
}) {
  const label = tierDisplayLabel(tierCode, tierLabel);
  if (!label && !tierBadgeUrl(tierCode, tierLabel)) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
        "bg-rose-50 border border-rose-100 text-rose-800",
        "text-[10px] font-bold",
        className
      )}
    >
      <TierBadge tierCode={tierCode} tierLabel={tierLabel} size="xs" />
      {label}
    </span>
  );
}
