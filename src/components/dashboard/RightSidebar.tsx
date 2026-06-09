import { motion, AnimatePresence } from "framer-motion";
import { Zap, ChevronsRight, ChevronsLeft, Flame } from "lucide-react";
import { useState } from "react";
import { countdown, type Task } from "@/lib/dashboard-data";

const energyLabels = ["Drained", "Low", "Steady", "Focused", "Peak"];

export function RightSidebar({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  const [energy, setEnergy] = useState(3);
  const top: Task[] = [];

  return (
    <motion.aside
      animate={{ width: expanded ? 320 : 64 }}
      transition={{ type: "spring", stiffness: 280, damping: 30 }}
      className="hidden lg:flex flex-col border-l border-border bg-paper/60 backdrop-blur-sm h-full overflow-hidden"
    >
      <div className="p-3 border-b border-border flex items-center justify-between">
        <button
          onClick={onToggle}
          className="grid place-items-center w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
        >
          {expanded ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
            >
              Intelligence
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        {expanded ? (
          <motion.div
            key="exp"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-6"
          >
            {/* Compact horizontal energy slider */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-rose" />
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Energy
                  </h3>
                </div>
                <span className="font-display text-sm font-semibold tabular-nums">
                  {energyLabels[energy]}
                </span>
              </div>

              <div className="relative h-6 flex items-center">
                {/* Track */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] rounded-full bg-muted" />
                {/* Fill */}
                <motion.div
                  initial={false}
                  animate={{ width: `${(energy / 4) * 100}%` }}
                  transition={{ type: "spring", stiffness: 220, damping: 26 }}
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] rounded-full bg-gradient-to-r from-rose to-amber-400"
                />
                {/* Ticks */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between">
                  {[0, 1, 2, 3, 4].map((v) => (
                    <span
                      key={v}
                      className={`w-2 h-2 rounded-full transition ${
                        v <= energy ? "bg-rose" : "bg-muted-foreground/20"
                      }`}
                    />
                  ))}
                </div>
                {/* Native input on top */}
                <input
                  type="range"
                  min={0}
                  max={4}
                  value={energy}
                  onChange={(e) => setEnergy(Number(e.target.value))}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Critical path */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-base font-semibold flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose" />
                  Critical Path
                </h3>
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Today
                </span>
              </div>
              <ol className="space-y-2">
                {top.map((t, i) => (
                  <li
                    key={t.id}
                    className="group flex items-start gap-3 rounded-xl border border-border bg-card p-3 hover:border-rose/40 transition"
                  >
                    <span className="font-display text-2xl leading-none text-muted-foreground/40 mt-0.5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">{t.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t.course} · in {countdown(t.due)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>


          </motion.div>
        ) : (
          <motion.div
            key="col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 py-5"
          >
            <Zap className="w-4 h-4 text-rose" />
            <Flame className="w-4 h-4 text-muted-foreground" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
