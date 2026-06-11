import { useEffect, useState, type ReactNode } from "react";
import { Slider } from "@/components/ui/slider";
import { Check, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

const pillToneClass = {
  complete: {
    idle:
      "border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700",
    activeSage: "border-[#7d9b76]/50 bg-[#7d9b76]/12 text-[#5a7355]",
    activeEmerald: "border-emerald-300 bg-emerald-50 text-emerald-700",
  },
  skip: {
    idle:
      "border-slate-200 text-slate-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800",
    active: "",
  },
} as const;

function TaskActionPill({
  icon,
  label,
  onClick,
  disabled = false,
  active = false,
  tone = "default",
  activeTone = "emerald",
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  tone?: "complete" | "skip" | "default";
  activeTone?: "emerald" | "sage";
}) {
  const toneStyles =
    tone === "complete"
      ? active
        ? activeTone === "sage"
          ? pillToneClass.complete.activeSage
          : pillToneClass.complete.activeEmerald
        : pillToneClass.complete.idle
      : tone === "skip"
        ? pillToneClass.skip.idle
        : "border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-white text-xs font-bold whitespace-nowrap transition-colors shrink-0",
        toneStyles,
        disabled && "opacity-50 cursor-not-allowed hover:bg-white hover:border-slate-200 hover:text-slate-700"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

export function TaskProgressControl({
  percent,
  completed,
  onChange,
  onToggleComplete,
  onSkip,
  variant = "dashboard",
  disabled = false,
  sliceTargetPercent,
}: {
  percent: number;
  completed: boolean;
  onChange: (p: number) => void;
  onToggleComplete: () => void;
  onSkip?: () => void;
  variant?: "dashboard" | "section";
  disabled?: boolean;
  /** Daily slice target (e.g. 100) — label shows portion done vs target */
  sliceTargetPercent?: number;
}) {
  const isSection = variant === "section";
  const [live, setLive] = useState(percent);

  useEffect(() => {
    setLive(percent);
  }, [percent]);

  const displayValue =
    sliceTargetPercent != null && sliceTargetPercent !== 100
      ? `${Math.round((live / 100) * sliceTargetPercent)}/${sliceTargetPercent}`
      : `${live}%`;

  const progressFill = isSection ? "bg-[#7d9b76]" : "bg-emerald-400";
  const progressTrack = isSection ? "bg-[#dce5d4]/60" : "bg-emerald-100";
  const progressLabel = completed
    ? isSection
      ? "text-[#5a7355]"
      : "text-emerald-600"
    : "text-slate-400";

  return (
    <div className="flex flex-col gap-2.5 items-end justify-center w-full sm:w-auto">
      {/* Slider section (top) */}
      <div className="flex items-center gap-3 w-full sm:w-[12rem] justify-end">
        {completed ? (
          <div className={cn("flex-1 min-w-0 h-1.5 rounded-full overflow-hidden", progressTrack)}>
            <div className={cn("h-full w-full rounded-full", progressFill)} />
          </div>
        ) : (
          <Slider
            value={[live]}
            max={100}
            step={5}
            disabled={disabled}
            onValueChange={(v) => setLive(v[0] ?? 0)}
            onValueCommit={(v) => onChange(v[0] ?? 0)}
            className={cn(
              "flex-1 min-w-0 py-1.5",
              isSection
                ? "[&_[role=slider]]:border-2 [&_[role=slider]]:border-[#7d9b76] [&_[role=slider]]:hover:scale-110 [&_[role=slider]]:transition-transform [&_.bg-primary]:bg-[#7d9b76] [&_.bg-primary\\/20]:bg-[#7d9b76]/20"
                : "[&_[role=slider]]:border-2 [&_[role=slider]]:border-emerald-500 [&_[role=slider]]:hover:scale-110 [&_[role=slider]]:transition-transform [&_.bg-primary]:bg-emerald-500 [&_.bg-primary\\/20]:bg-emerald-500/20"
            )}
          />
        )}
        <span className={cn("text-[11px] font-semibold tabular-nums w-10 text-right shrink-0", progressLabel)}>
          {displayValue}
        </span>
      </div>

      {/* Buttons section (bottom) */}
      <div className="flex items-center gap-1.5 justify-end">
        <TaskActionPill
          icon={<Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
          label={completed ? "Completed" : "Mark Complete"}
          onClick={onToggleComplete}
          disabled={disabled}
          active={completed}
          tone="complete"
          activeTone={isSection ? "sage" : "emerald"}
        />

        {onSkip ? (
          <TaskActionPill
            icon={<SkipForward className="w-3.5 h-3.5" strokeWidth={2.5} />}
            label="Skip"
            onClick={onSkip}
            disabled={disabled}
            tone="skip"
          />
        ) : null}
      </div>
    </div>
  );
}
