import type { ReactNode } from "react";
import { Sparkles, Trophy } from "lucide-react";
import { TierBadge } from "@/components/gamification/TierBadge";
import { tierBadgeUrl } from "@/lib/tierBadges";
import { TIER_LADDER, tierProgress } from "@/lib/tiers";
import { cn } from "@/lib/utils";

export function ProfileGamificationStats({
  tierLabel,
  tierCode,
  totalPoints,
  rank,
  nextTierPoints,
  nextTierLabel,
  compact = false,
}: {
  tierLabel?: string | null;
  tierCode?: string | null;
  totalPoints: number;
  rank?: number | null;
  nextTierPoints?: number | null;
  nextTierLabel?: string | null;
  compact?: boolean;
}) {
  const { percent, nextLabel, remaining } = tierProgress(
    totalPoints,
    tierCode,
    nextTierPoints
  );
  const currentIdx = TIER_LADDER.findIndex((t) => t.code === tierCode);
  const hasBadge = Boolean(tierBadgeUrl(tierCode, tierLabel));

  return (
    <div className={cn("space-y-5", compact && "space-y-4")}>
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div
          className={cn(
            "rounded-2xl border border-border/70 bg-card/60 flex flex-col items-center justify-center text-center gap-3 min-w-0",
            compact ? "p-4 min-h-[140px]" : "p-5 sm:p-6 min-h-[168px]"
          )}
        >
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground self-start w-full">
            Tier
          </span>
          {hasBadge ? (
            <TierBadge
              tierCode={tierCode}
              tierLabel={tierLabel}
              size={compact ? "xl" : "2xl"}
              showLabel
              labelPosition="below"
              labelClassName={cn(
                "font-display font-bold",
                compact ? "text-base" : "text-lg sm:text-xl"
              )}
              className="gap-2"
            />
          ) : (
            <p
              className={cn(
                "font-display font-bold tracking-tight text-foreground",
                compact ? "text-2xl" : "text-3xl sm:text-4xl"
              )}
            >
              {tierLabel ?? "—"}
            </p>
          )}
        </div>

        <StatCard
          icon={<Sparkles className={cn("text-rose-500", compact ? "w-5 h-5" : "w-6 h-6")} />}
          label="Lifetime XP"
          value={totalPoints.toLocaleString()}
          large={!compact}
        />
        <StatCard
          icon={<Trophy className={cn("text-rose-600", compact ? "w-5 h-5" : "w-6 h-6")} />}
          label="Rank"
          value={rank != null ? `#${rank}` : "—"}
          large={!compact}
        />
      </div>

      {nextTierPoints != null && nextTierPoints > totalPoints && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {nextTierLabel && (
                <TierBadge
                  tierCode={TIER_LADDER.find((t) => t.label === nextTierLabel)?.code}
                  tierLabel={nextTierLabel}
                  size="sm"
                  dimmed
                />
              )}
              <span className="text-muted-foreground font-medium truncate">
                {nextTierLabel ?? nextLabel ?? "Next tier"}
              </span>
            </div>
            <span className="font-semibold tabular-nums text-foreground shrink-0">
              {totalPoints.toLocaleString()} / {nextTierPoints.toLocaleString()} XP
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted/80 overflow-hidden">
            <div
              className="h-full rounded-full bg-foreground/80 transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground text-right">
            {remaining.toLocaleString()} XP to go
          </p>
        </div>
      )}

      <div className="grid grid-cols-10 w-full items-end gap-x-0.5 sm:gap-x-1">
        {TIER_LADDER.map((tier, idx) => {
          const isCurrent = tier.code === tierCode;
          const isPast = currentIdx >= 0 && idx < currentIdx;
          return (
            <div
              key={tier.code}
              className={cn(
                "flex flex-col items-center gap-1 sm:gap-1.5 min-w-0 w-full",
                !isCurrent && !isPast && "opacity-30"
              )}
              title={`${tier.label} · ${tier.minPoints.toLocaleString()}+ XP`}
            >
              <TierBadge
                tierCode={tier.code}
                tierLabel={tier.label}
                dimmed={!isCurrent && !isPast}
                className="w-full justify-center"
                imgClassName={cn(
                  "!w-full !h-auto mx-auto object-contain",
                  compact ? "max-w-[2rem] sm:max-w-[2.5rem]" : "max-w-[2.25rem] sm:max-w-[3rem] md:max-w-[3.25rem]"
                )}
              />
              <span
                className={cn(
                  "text-[7px] sm:text-[9px] md:text-[10px] font-semibold leading-tight text-center w-full",
                  isCurrent ? "text-foreground" : isPast ? "text-foreground/70" : "text-muted-foreground"
                )}
              >
                {tier.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  large = true,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  large?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 bg-card/60 flex flex-col justify-center min-w-0",
        large ? "p-5 sm:p-6 min-h-[168px] gap-3" : "p-4 min-h-[140px] gap-2"
      )}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
      </div>
      <p
        className={cn(
          "font-display font-bold tracking-tight text-foreground truncate",
          large ? "text-3xl sm:text-4xl" : "text-2xl"
        )}
      >
        {value}
      </p>
    </div>
  );
}
