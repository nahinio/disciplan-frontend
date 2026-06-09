import { useMemo } from "react";
import { cn } from "@/lib/utils";

export interface HeatmapDay {
  date: string;
  count: number;
}

const HEAT_LEVELS = [
  "bg-muted/40",
  "bg-rose-200/70",
  "bg-rose-300",
  "bg-rose-400",
  "bg-rose-500",
  "bg-rose-600",
] as const;

function levelClass(count: number, max: number): string {
  if (count <= 0) return HEAT_LEVELS[0];
  const ratio = count / Math.max(max, 1);
  if (ratio >= 0.8) return HEAT_LEVELS[5];
  if (ratio >= 0.6) return HEAT_LEVELS[4];
  if (ratio >= 0.4) return HEAT_LEVELS[3];
  if (ratio >= 0.2) return HEAT_LEVELS[2];
  return HEAT_LEVELS[1];
}

export function TaskHeatmap({
  days,
  maxCount,
  totalCompletions,
  activeDays,
}: {
  days: HeatmapDay[];
  maxCount: number;
  totalCompletions: number;
  activeDays: number;
}) {
  const weeks = useMemo(() => {
    if (days.length === 0) return [] as HeatmapDay[][];
    const first = new Date(days[0].date + "T12:00:00");
    const pad = first.getDay();
    const padded: HeatmapDay[] = [
      ...Array.from({ length: pad }, (_, i) => ({ date: `pad-${i}`, count: -1 })),
      ...days,
    ];
    const cols: HeatmapDay[][] = [];
    for (let i = 0; i < padded.length; i += 7) {
      cols.push(padded.slice(i, i + 7));
    }
    return cols;
  }, [days]);

  const monthLabels = useMemo(() => {
    const labels: { col: number; label: string }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, colIdx) => {
      const real = week.find((d) => d.count >= 0);
      if (!real) return;
      const m = new Date(real.date + "T12:00:00").getMonth();
      if (m !== lastMonth) {
        labels.push({
          col: colIdx,
          label: new Date(real.date + "T12:00:00").toLocaleString("en", { month: "short" }),
        });
        lastMonth = m;
      }
    });
    return labels;
  }, [weeks]);

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Activity</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {totalCompletions.toLocaleString()} completed · {activeDays} active days
          </p>
        </div>
        <div className="flex items-center gap-1">
          {HEAT_LEVELS.map((c, i) => (
            <span
              key={c}
              className={cn("w-2.5 h-2.5 rounded-[2px]", c)}
              title={i === 0 ? "No activity" : undefined}
            />
          ))}
        </div>
      </div>

      <div className="overflow-x-auto pb-0.5 -mx-1 px-1">
        <div className="inline-flex flex-col gap-0.5 min-w-0">
          <div className="flex gap-[2px] h-2.5 ml-7 relative">
            {monthLabels.map((m) => (
              <span
                key={`${m.col}-${m.label}`}
                className="absolute text-[8px] text-muted-foreground/80 font-medium"
                style={{ left: m.col * 13 }}
              >
                {m.label}
              </span>
            ))}
          </div>
          <div className="flex gap-[2px]">
            <div className="flex flex-col gap-[2px] text-[8px] text-muted-foreground/70 pr-0.5 justify-around h-[77px] w-6">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
            </div>
            <div className="flex gap-[2px]">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[2px]">
                  {week.map((day, di) => (
                    <div
                      key={`${wi}-${di}`}
                      title={
                        day.count >= 0
                          ? `${day.date}: ${day.count} task${day.count === 1 ? "" : "s"}`
                          : undefined
                      }
                      className={cn(
                        "w-[9px] h-[9px] rounded-[2px] transition-colors",
                        day.count < 0 ? "bg-transparent" : levelClass(day.count, maxCount)
                      )}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
