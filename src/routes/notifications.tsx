import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { appRouteSsr, requireAuth } from "@/lib/routeAuth";
import { useState } from "react";
import { TopHeader } from "@/components/dashboard/TopHeader";
import { MobileTabBar } from "@/components/dashboard/MobileTabBar";
import { useNotifications } from "@/hooks/useNotifications";
import { 
  BellOff, 
  Trash2, 
  GraduationCap, 
  Users, 
  Info, 
  RefreshCw, 
  CheckCheck,
  Eye,
  EyeOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RefreshButton } from "@/components/ui/refresh-button";
import { usePageRefresh } from "@/hooks/usePageRefresh";

export const Route = createFileRoute("/notifications")({
  ssr: appRouteSsr,
  beforeLoad: () => {
    requireAuth();
  },
  head: () => ({
    meta: [
      { title: "DisciPlan — Notifications" },
      {
        name: "description",
        content: "Track and manage your academic strategy notifications.",
      },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    toggleReadStatus,
    clearAll,
    resetNotifications,
    refresh,
  } = useNotifications();
  const { refresh: refreshNotifications, isRefreshing } = usePageRefresh(refresh);

  const [activeFilter, setActiveFilter] = useState<"all" | "academic" | "teams" | "system">("all");

  const filtered = notifications.filter((n) => {
    if (activeFilter === "all") return true;
    return n.category === activeFilter;
  });

  const getUnreadCount = (category: "all" | "academic" | "teams" | "system") => {
    return notifications.filter((n) => !n.read && (category === "all" || n.category === category)).length;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "academic":
        return <GraduationCap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case "teams":
        return <Users className="w-5 h-5 text-sky-600 dark:text-sky-400" />;
      default:
        return <Info className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
    }
  };

  const getCategoryBg = (category: string) => {
    switch (category) {
      case "academic":
        return "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30";
      case "teams":
        return "bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/30";
      default:
        return "bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/30";
    }
  };

  // Group notifications by date
  const todayItems = filtered.filter((n) => n.date === "Today");
  const yesterdayItems = filtered.filter((n) => n.date === "Yesterday");
  const olderItems = filtered.filter((n) => n.date === "Older");

  const renderGroup = (title: string, items: typeof filtered) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-3">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
          {title} ({items.length})
        </h2>
        <div className="space-y-2.5">
          {items.map((item) => (
            <div
              key={item.id}
              role={item.link ? "button" : undefined}
              tabIndex={item.link ? 0 : undefined}
              onClick={() => {
                if (!item.read) void markAsRead(item.id);
                if (item.link) navigate({ to: item.link });
              }}
              onKeyDown={(e) => {
                if (item.link && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  if (!item.read) void markAsRead(item.id);
                  navigate({ to: item.link });
                }
              }}
              className={cn(
                "group relative flex items-start gap-4 p-4 rounded-xl border transition-all duration-200",
                item.link && "cursor-pointer",
                !item.read
                  ? "bg-white dark:bg-card border-border shadow-sm"
                  : "bg-transparent border-border/60 hover:bg-white/50 dark:hover:bg-card/30"
              )}
            >
              {/* Category Icon */}
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm", getCategoryBg(item.category))}>
                {getCategoryIcon(item.category)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pr-8">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn(
                    "text-xs uppercase tracking-wider font-semibold text-[10px]",
                    item.category === "academic" && "text-emerald-600 dark:text-emerald-400",
                    item.category === "teams" && "text-sky-600 dark:text-sky-400",
                    item.category === "system" && "text-amber-600 dark:text-amber-400"
                  )}>
                    {item.category}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">·</span>
                  <span className="text-[10px] text-muted-foreground font-medium">{item.time}</span>
                </div>
                <h3 className={cn(
                  "text-sm tracking-tight mt-1 transition-colors",
                  !item.read ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
                )}>
                  {item.title}
                </h3>
                <p className={cn(
                  "text-xs mt-1 leading-relaxed",
                  !item.read ? "text-slate-600 dark:text-slate-300" : "text-muted-foreground"
                )}>
                  {item.description}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0 ml-auto opacity-80 group-hover:opacity-100 transition-opacity">
                {/* Toggle Read/Unread */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void toggleReadStatus(item.id);
                  }}
                  title={item.read ? "Mark as unread" : "Mark as read"}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-foreground hover:bg-muted transition cursor-pointer"
                >
                  {item.read ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>

                {/* Delete */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(item.id);
                  }}
                  title="Delete"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose hover:bg-rose-soft/20 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Unread indicator dot */}
              {!item.read && (
                <div className="absolute left-1.5 top-1.5 w-2.5 h-2.5 rounded-full bg-rose animate-pulse" />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-background text-foreground">
      <TopHeader />
      <div className="flex-1 flex min-h-0">
        <main className="flex-1 overflow-y-auto no-scrollbar pb-20 md:pb-0">
          <div className="max-w-4xl mx-auto px-5 md:px-8 py-8 space-y-6">
            
            {/* Header controls */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Academic Strategy updates
                </p>
                <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mt-2 text-slate-800 leading-[1.05]">
                  Notifications
                </h1>
                <p className="text-muted-foreground mt-2 max-w-xl text-xs font-medium">
                  Stay updated on deadlines, team updates, and automated productivity insights.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center shrink-0 flex-wrap">
                <RefreshButton onClick={refreshNotifications} loading={isRefreshing} />
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="h-9 px-4 rounded-full border border-border bg-white text-xs font-semibold hover:bg-muted text-slate-700 transition flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <CheckCheck className="w-4 h-4" />
                    Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="h-9 px-4 rounded-full border border-border bg-white text-xs font-semibold hover:bg-rose-soft/10 text-rose transition flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-2 border-b border-border pb-px overflow-x-auto no-scrollbar">
              {(["all", "academic", "teams", "system"] as const).map((tab) => {
                const count = getUnreadCount(tab);
                const active = activeFilter === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveFilter(tab)}
                    className={cn(
                      "pb-3.5 px-3 text-xs font-semibold tracking-tight border-b-2 transition-all relative capitalize cursor-pointer",
                      active
                        ? "border-rose text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab === "all" ? "All notifications" : tab}
                    {count > 0 && (
                      <span className="ml-1.5 bg-rose text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Notifications content */}
            {filtered.length === 0 ? (
              <div className="py-20 text-center rounded-[1.5rem] border border-dashed border-border/80 bg-white/40 dark:bg-card/20 shadow-sm flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-4">
                  <BellOff className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-base text-foreground">No notifications found</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  {activeFilter === "all"
                    ? "You are completely up to date. Nice work!"
                    : `You have no notifications in the ${activeFilter} category.`}
                </p>
                {notifications.length === 0 && (
                  <button
                    onClick={resetNotifications}
                    className="mt-4 px-4 h-9 bg-rose text-white text-xs font-bold rounded-full hover:bg-rose/90 transition shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reset notifications
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-8 pb-10">
                {renderGroup("Today", todayItems)}
                {renderGroup("Yesterday", yesterdayItems)}
                {renderGroup("Older", olderItems)}
              </div>
            )}

          </div>
        </main>
      </div>
      <MobileTabBar />
    </div>
  );
}
