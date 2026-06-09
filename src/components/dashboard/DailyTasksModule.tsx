import { motion } from "framer-motion";
import { Clock, Sparkles, Check } from "lucide-react";
import { useState } from "react";
import { encodeCourseCode } from "@/lib/blog";
import { useUserStats } from "@/hooks/useUserStats";
import { useTasks, taskDifficulty, formatDue } from "@/hooks/useTasks";
import { toast } from "sonner";

const courseThemes: Record<string, { border: string; checkedBg: string; text: string; numBg: string; completeHover: string }> = {
  Default: {
    border: "border-slate-200/70 hover:border-slate-300",
    checkedBg: "bg-slate-900 shadow-slate-900/25",
    text: "text-slate-600",
    numBg: "bg-slate-50 text-slate-600 border-slate-200/30",
    completeHover: "hover:bg-slate-100 hover:text-slate-800 hover:border-slate-350 hover:shadow-sm",
  },
};

export function DailyTasksModule() {
  const { profile } = useUserStats();
  const { tasks, tasksLoading, toggleComplete } = useTasks();
  const [energyLevel, setEnergyLevel] = useState<"Low" | "Medium" | "High">("Medium");

  const openTasks = tasks.filter((t) => !t.is_completed);
  const completedCount = tasks.filter((t) => t.is_completed).length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const sortedTasks = [...tasks].sort((a, b) => {
    const weight = { Hard: 3, Medium: 2, Easy: 1 };
    const da = taskDifficulty(a.priority_code);
    const db = taskDifficulty(b.priority_code);
    if (energyLevel === "High") return weight[db] - weight[da];
    if (energyLevel === "Low") return weight[da] - weight[db];
    return weight[db] - weight[da];
  });

  const handleToggle = async (id: number, completed: boolean) => {
    try {
      await toggleComplete(id, !completed);
    } catch {
      toast.error("Could not update task");
    }
  };

  if (tasksLoading) {
    return (
      <section className="space-y-4">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-slate-800">
          Today&apos;s Agenda
        </h2>
        <p className="text-sm text-slate-500">Loading tasks…</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-slate-800">
            Today&apos;s Agenda
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Tasks from your dashboard — {profile.email || "signed in"}.
          </p>
        </div>
        <div className="flex items-center gap-1 bg-slate-100/60 p-1 rounded-full border border-slate-200/40 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-3 pr-1">Energy</span>
          {(["Low", "Medium", "High"] as const).map((level) => (
            <button
              key={level}
              onClick={() => setEnergyLevel(level)}
              className={`text-[10px] font-bold uppercase tracking-wider py-1.5 px-3.5 rounded-full transition-all cursor-pointer ${
                energyLevel === level ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-[1.25rem] border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4.5 h-4.5 text-rose animate-pulse" />
            <span className="text-sm font-medium text-slate-500">
              {openTasks.length === 0
                ? "No open tasks — schedule a calendar event to generate tasks automatically."
                : `${openTasks.length} task${openTasks.length > 1 ? "s" : ""} remaining.`}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-28 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <motion.div
                animate={{ width: `${progressPercent}%` }}
                className="h-full bg-gradient-to-r from-rose to-amber-500 rounded-full"
              />
            </div>
            <span className="text-sm font-bold font-display text-rose tabular-nums">{progressPercent}%</span>
          </div>
        </div>

        {sortedTasks.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">No tasks yet. Create tasks from Settings or the dashboard API.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {sortedTasks.map((task, index) => {
              const isCompleted = task.is_completed;
              const tag = task.course_code ?? "Personal";
              const theme = courseThemes[tag] ?? courseThemes.Default;
              const difficulty = taskDifficulty(task.priority_code);
              const dueLabel = formatDue(task.due_at);

              return (
                <motion.div
                  key={task.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all gap-4 ${
                    isCompleted
                      ? "bg-slate-50/50 border-slate-200/40 opacity-60"
                      : `bg-white ${theme.border}`
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border font-mono ${theme.numBg}`}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`font-display text-lg font-bold tracking-tight ${isCompleted ? "line-through text-slate-400" : "text-slate-800"}`}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400 font-semibold flex-wrap">
                        <span className={`${theme.text} font-bold uppercase`}>{tag}</span>
                        {task.task_type_code && (
                          <>
                            <span>•</span>
                            <span className="uppercase">{task.task_type_code}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{difficulty}</span>
                        {dueLabel && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {dueLabel}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => void handleToggle(task.id, isCompleted)}
                    className={`text-[11px] font-bold px-4 py-1.5 rounded-full border flex items-center gap-1.5 min-w-[120px] justify-center ${
                      isCompleted
                        ? `${theme.checkedBg} text-white border-transparent`
                        : `bg-white text-slate-700 border-slate-200 ${theme.completeHover}`
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    {isCompleted ? "Completed" : "Mark Complete"}
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
