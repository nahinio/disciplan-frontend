import { Sparkles } from "lucide-react";
import { DailyEnergyPicker } from "./DailyEnergyPicker";
import { useTasks, type EnergyLevel } from "@/hooks/useTasks";
import { useUserStats } from "@/hooks/useUserStats";

/** Dashboard-only control: sets how today's tasks are sorted (not used in task add). */
export function DailyEnergyBar() {
  const { profile } = useUserStats();
  const isFaculty = profile.role === "faculty";
  const { dailyEnergy, setEnergy } = useTasks();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
      <div className="flex items-start gap-3 min-w-0">
        <div className="p-2 rounded-xl bg-rose-50 text-rose-600 shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-600">
            Energy filter
          </p>
          <p className="text-sm font-medium text-slate-700 mt-0.5">
            {isFaculty ? "Prioritize by energy" : "How's your energy right now?"}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {isFaculty
              ? "Sort grading, prep, and teaching tasks by what fits your focus."
              : "Tasks reorder to match — low energy surfaces lighter work first."}
          </p>
        </div>
      </div>
      <DailyEnergyPicker
        value={dailyEnergy}
        onChange={(v: EnergyLevel) => void setEnergy(v)}
      />
    </div>
  );
}
