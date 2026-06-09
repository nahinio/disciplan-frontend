import { cn } from "@/lib/utils";
import type { EnergyLevel } from "@/hooks/useTasks";

const levels: { id: EnergyLevel; label: string; hint: string }[] = [
  { id: "low", label: "Low", hint: "Easy wins" },
  { id: "medium", label: "Steady", hint: "Balanced" },
  { id: "high", label: "Peak", hint: "Deep work" },
];

export function DailyEnergyPicker({
  value,
  onChange,
  variant = "dashboard",
}: {
  value: EnergyLevel | null;
  onChange: (v: EnergyLevel) => void;
  variant?: "dashboard" | "section";
}) {
  const isSection = variant === "section";

  return (
    <div
      className={cn(
        "flex items-center gap-1 p-1 rounded-full border shadow-sm shrink-0",
        isSection
          ? "bg-[#faf8f3] border-[#dce5d4]/60"
          : "bg-slate-100/60 border-slate-200/40"
      )}
    >
      {levels.map((l) => {
        const active = value === l.id;
        return (
          <button
            key={l.id}
            type="button"
            onClick={() => onChange(l.id)}
            title={l.hint}
            className={cn(
              "py-1.5 px-3.5 rounded-full transition-all cursor-pointer text-center min-w-[4.5rem]",
              active
                ? isSection
                  ? "bg-[#7d9b76] text-white shadow-sm"
                  : "bg-slate-900 text-white shadow-sm"
                : isSection
                  ? "text-slate-500 hover:text-[#7d9b76]"
                  : "text-slate-500 hover:text-slate-800"
            )}
          >
            <span className="block text-[10px] font-bold uppercase tracking-wider leading-none">
              {l.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
