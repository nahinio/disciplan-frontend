import { Calendar, Bell } from "lucide-react";
import type { CalEvent } from "@/lib/dashboard-data";

const calendarEvents: CalEvent[] = [];

const getDaysRemaining = (eventDate: Date): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(eventDate);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays > 1) return `${diffDays} days left`;
  if (diffDays === -1) return "Yesterday";
  return `${Math.abs(diffDays)} days ago`;
};

export function CountdownEventsModule() {
  const upcomingEvents = calendarEvents
    .filter((e) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(e.date);
      target.setHours(0, 0, 0, 0);
      return target >= today;
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5); // Display top 5 upcoming events

  return (
    <section className="bg-card border border-border rounded-2xl p-5 h-full flex flex-col shadow-[0_1px_3px_rgba(0,0,0,0.01),0_8px_24px_-12px_rgba(0,0,0,0.04)]">
      <div className="mb-4">
        <h2 className="font-display text-2xl font-bold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-sky-500" />
          Countdown Events
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Remaining time for all scheduled events.
        </p>
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto no-scrollbar max-h-[320px] lg:max-h-none">
        {upcomingEvents.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border rounded-xl">
            <p className="text-xs text-muted-foreground font-medium">No upcoming events scheduled.</p>
          </div>
        ) : (
          upcomingEvents.map((event) => {
            const daysStr = getDaysRemaining(event.date);
            const isEventToday = daysStr === "Today";
            const isEventTomorrow = daysStr === "Tomorrow";

            return (
              <div
                key={event.id}
                className={`flex items-center justify-between p-3.5 rounded-xl border bg-card transition-all ${
                  isEventToday 
                    ? "border-rose/30 bg-rose/5" 
                    : "border-border hover:border-muted-foreground/20 hover:bg-muted/5"
                }`}
              >
                <div className="min-w-0 flex-1 pr-3">
                  <div className="flex items-center gap-2">
                    <span className={`shrink-0 w-2.5 h-2.5 rounded-full ${
                      event.type === "deadline" ? "bg-rose" :
                      event.type === "team" ? "bg-emerald-500" :
                      "bg-sky-500"
                    }`} />
                    <p className="text-xs font-semibold text-foreground truncate">{event.title}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-bold">
                    {event.type}
                  </p>
                </div>

                {/* Days Remaining Tag */}
                <span className={`shrink-0 text-[10px] font-bold px-3 py-1 rounded-full tabular-nums ${
                  isEventToday ? "bg-rose text-white shadow-sm shadow-rose/10" :
                  isEventTomorrow ? "bg-amber-400 text-amber-950 shadow-sm shadow-amber-400/10" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {daysStr}
                </span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
