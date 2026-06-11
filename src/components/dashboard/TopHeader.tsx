import { Bell, GraduationCap, Users, Info, Check, RefreshCw, Trophy, Settings, LogOut, ShieldCheck, ChevronRight, Award, Flame } from "lucide-react";
import { ScheduleEventButton } from "./ScheduleEventButton";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/useNotifications";
import { useTeamsHub } from "@/hooks/useTeamsHub";
import { useUserStats, getRoleAvatarGradient, hasCustomAvatar } from "@/hooks/useUserStats";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { DisciPlanLogo } from "@/components/DisciPlanLogo";
import { TierBadgePill } from "@/components/gamification/TierBadge";

const nav: { label: string; to: string }[] = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Courses", to: "/courses" },
  { label: "Teams", to: "/teams" },
  { label: "Blogs", to: "/blogs" },
  { label: "Forum", to: "/forum" },
  { label: "Doubts", to: "/doubts" },
  { label: "Leaderboard", to: "/leaderboard" },
];

function MenuItem({
  to,
  params,
  onClick,
  icon,
  label,
  danger,
}: {
  to?: string;
  params?: any;
  onClick?: () => void;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
}) {
  const className = cn(
    "flex items-center justify-between w-full px-4 py-1.5 text-sm font-semibold rounded-xl transition-all duration-300 group text-left relative overflow-hidden",
    danger
      ? "text-rose-600 hover:bg-gradient-to-r hover:from-rose-500/10 hover:to-rose-500/5 dark:hover:from-rose-950/20 dark:hover:to-rose-950/5"
      : "text-slate-600 dark:text-slate-300 hover:bg-gradient-to-r hover:from-slate-50 hover:to-transparent dark:hover:from-slate-800/40 dark:hover:to-transparent hover:text-rose-600 dark:hover:text-rose-400"
  );

  const content = (
    <>
      {/* Left indicator bar */}
      <span className={cn(
        "absolute left-0 top-2 bottom-2 w-1 rounded-r-md transition-all duration-300 origin-left scale-x-0 group-hover:scale-x-100 shrink-0",
        danger ? "bg-rose-500" : "bg-rose-600 dark:bg-rose-500"
      )} />
      
      <div className="flex items-center gap-3 relative z-10">
        <span
          className={cn(
            "p-2 rounded-xl transition-all duration-300 shrink-0 border border-transparent",
            danger
              ? "bg-rose-500/10 text-rose-500 group-hover:scale-110 group-hover:rotate-3 group-hover:bg-rose-500/20"
              : "bg-slate-50 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 group-hover:bg-rose-500/10 group-hover:text-rose-600 dark:group-hover:bg-rose-500/20 dark:group-hover:text-rose-400 group-hover:scale-110 group-hover:-rotate-3 group-hover:border-rose-500/10"
          )}
        >
          {icon}
        </span>
        <span className="tracking-tight font-semibold text-[13px]">{label}</span>
      </div>
      {!danger && (
        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-rose-600 dark:group-hover:text-rose-400 group-hover:translate-x-1 transition-all duration-300 shrink-0 relative z-10" />
      )}
    </>
  );

  if (to) {
    return (
      <Link to={to} params={params} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={cn(className, "cursor-pointer")}>
      {content}
    </button>
  );
}


export function TopHeader({ onMenu }: { onMenu?: () => void }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location?.pathname }) || "";
  const location = useRouterState({ select: (s) => s.location });
  const searchView = (location?.search as any)?.view || "overview";

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    resetNotifications,
  } = useNotifications();

  const {
    profile,
    profileReady,
    todayLeaderboard,
    allTimeLeaderboard,
    logout,
  } = useUserStats();

  const isAdmin = profileReady && profile.role === "admin";
  const isFaculty = profileReady && profile.role === "faculty";
  const isStudent = profileReady && profile.role === "student";
  const { invitations: teamInvitations } = useTeamsHub();
  const teamInboxCount = isStudent ? teamInvitations.length : 0;

  const filteredNav = useMemo(() => {
    if (!profileReady) return [];
    if (profile.role === "admin") {
      return [
        { label: "Overview", to: "/dashboard", search: { view: "overview" } },
        { label: "Courses", to: "/dashboard", search: { view: "courses" } },
        { label: "Sections", to: "/dashboard", search: { view: "sections" } },
        { label: "Enrollments", to: "/dashboard", search: { view: "enrollments" } },
        { label: "Faculty", to: "/dashboard", search: { view: "faculty" } },
        { label: "Users", to: "/dashboard", search: { view: "users" } },
        { label: "Publish", to: "/dashboard", search: { view: "publish" } },
        { label: "Moderation", to: "/dashboard", search: { view: "moderation" } },
        { label: "Announcements", to: "/dashboard", search: { view: "system" } },
      ];
    }
    if (profile.role === "faculty") {
      return nav.filter(
        (n) => !["/teams", "/leaderboard", "/profile"].includes(n.to)
      );
    }
    return nav;
  }, [profile.role, profileReady]);

  const [leaderboardTab, setLeaderboardTab] = useState<"today" | "alltime">("today");

  const renderAvatar = (photo?: string, _name?: string, sizeClass: string = "w-9 h-9 text-xs", borderCls: string = "") => {
    if (hasCustomAvatar(photo)) {
      return (
        <img
          src={photo}
          alt={profile.name || "Profile"}
          className={cn("rounded-full object-cover shrink-0 select-none", sizeClass, borderCls)}
        />
      );
    }
    return (
      <div
        className={cn(
          "rounded-full bg-gradient-to-br shrink-0 select-none",
          getRoleAvatarGradient(profile.role),
          sizeClass,
          borderCls
        )}
      />
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "academic":
        return <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case "teams":
        return <Users className="w-4 h-4 text-sky-600 dark:text-sky-400" />;
      default:
        return <Info className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    }
  };

  const getCategoryBg = (category: string) => {
    switch (category) {
      case "academic":
        return "bg-emerald-50 dark:bg-emerald-950/40";
      case "teams":
        return "bg-sky-50 dark:bg-sky-950/40";
      default:
        return "bg-amber-50 dark:bg-amber-950/40";
    }
  };

  return (
    <header className="sticky top-0 z-40 h-16 grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 md:px-6 backdrop-blur-md bg-paper/90 border-b border-[#dce5d4]">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenu}
          className="md:hidden -ml-1 p-2 rounded-md hover:bg-muted"
          aria-label="Menu"
        >
          <span className="block w-5 h-0.5 bg-foreground mb-1" />
          <span className="block w-5 h-0.5 bg-foreground mb-1" />
          <span className="block w-3 h-0.5 bg-foreground" />
        </button>
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <DisciPlanLogo size="md" className="rounded-lg" />
          <span className="font-display text-lg font-semibold tracking-tight hidden sm:block">
            Disci<span className="text-rose">Plan</span>
          </span>
        </Link>
      </div>

      <nav className="hidden md:flex items-center justify-center gap-1 min-w-0">
        {filteredNav.map((n) => {
          const active = n.to === "/blogs"
            ? pathname.startsWith("/blogs")
            : n.to === "/forum"
              ? pathname.startsWith("/forum")
              : n.to === "/doubts"
              ? pathname.startsWith("/doubts")
              : n.to === "/leaderboard"
                ? pathname.startsWith("/leaderboard")
                : (isAdmin
                    ? (pathname === "/dashboard" && searchView === (n as any).search?.view)
                    : (
                        (n.to === "/dashboard" && n.label === "Dashboard" && pathname === "/dashboard") ||
                        (n.to === "/courses" && pathname.startsWith("/courses")) ||
                        (n.to === "/teams" && pathname.startsWith("/teams"))
                      )
                  );
          return (
            <Link
              key={n.label}
              to={n.to}
              search={(n as any).search}
              className={`relative px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                active
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-rose-700 hover:bg-rose-50"
              }`}
            >
              {n.label}
              {n.to === "/teams" && teamInboxCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-bold grid place-items-center">
                  {teamInboxCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2 justify-end shrink-0">
        {!isAdmin && (
          <ScheduleEventButton
            label="Add Event"
            className="hidden sm:inline-flex text-[10px] px-3 py-1.5 sm:text-xs sm:px-4 sm:py-2"
          />
        )}
        {!isAdmin && (
        <Popover>
          <PopoverTrigger asChild>
            <button className="relative grid place-items-center w-9 h-9 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose animate-pulse" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 sm:w-96 p-4 bg-popover/95 backdrop-blur-md border border-border shadow-lg rounded-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="bg-rose text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs font-semibold text-rose hover:text-rose/80 transition flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Mark all as read
                </button>
              )}
            </div>

            <ScrollArea className="max-h-[320px] my-2 pr-1">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-2">
                    <Bell className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">All caught up</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">No notifications right now.</p>
                  <button
                    onClick={resetNotifications}
                    className="mt-3 text-[11px] font-bold text-rose hover:underline transition flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reset notifications
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5 py-1">
                  {notifications.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (!item.read) void markAsRead(item.id);
                        if (item.link) navigate({ to: item.link });
                      }}
                      className={`flex gap-3 p-2.5 rounded-lg hover:bg-muted/60 transition cursor-pointer text-left relative group ${
                        !item.read ? "bg-muted/20" : ""
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${getCategoryBg(item.category)}`}>
                        {getCategoryIcon(item.category)}
                      </div>
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center justify-between gap-1.5">
                          <p className={`text-xs truncate ${!item.read ? "font-semibold text-foreground" : "font-medium text-muted-foreground"}`}>
                            {item.title}
                          </p>
                          <span className="text-[10px] text-muted-foreground shrink-0">{item.time}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                      {!item.read && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-rose shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="pt-2 border-t border-border mt-1">
              <Link
                to="/notifications"
                className="block text-center w-full py-1.5 text-xs font-semibold text-foreground hover:bg-muted rounded-md transition"
              >
                See all notifications
              </Link>
            </div>
          </PopoverContent>
        </Popover>
        )}

        <Popover>
          <PopoverTrigger asChild>
            <button className="rounded-full cursor-pointer focus:outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              {renderAvatar(profile.photo, profile.name)}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0 overflow-hidden bg-popover/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl flex flex-col text-left">
            {isAdmin ? (
              <>
                <div className="relative p-5 pb-4 bg-gradient-to-br from-rose-500/5 via-amber-500/5 to-transparent rounded-t-2xl border-b border-slate-100/80 dark:border-slate-800/40">
                  <div className="flex items-start gap-4">
                    <div className="relative group shrink-0">
                      <div className="absolute -inset-0.5 bg-gradient-to-tr from-rose-500 to-amber-500 rounded-full opacity-60 blur-sm group-hover:opacity-100 transition duration-500" />
                      <div className="relative block rounded-full bg-background p-0.5">
                        {renderAvatar(profile.photo, profile.name, "w-14 h-14 text-sm")}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <h3 className="font-display text-base font-extrabold leading-tight text-slate-800 dark:text-slate-100 truncate">
                        {profile.name || "Administrator"}
                      </h3>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5 font-medium">{profile.email}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-bold border border-rose-500/20">
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                          Administrator
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-4 pt-3.5 pb-1">
                  <div className="p-3 bg-gradient-to-br from-slate-50/50 to-white/30 dark:from-slate-800/40 dark:to-slate-800/20 rounded-xl border border-slate-100 dark:border-slate-800/50 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 mb-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">System Access</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                      You are signed in to the admin console. Monitor activities and configure system parameters.
                    </p>
                  </div>
                </div>
                <div className="px-3.5 pb-3.5 pt-2 flex flex-col gap-0.5">
                  <MenuItem
                    to="/settings"
                    icon={<Settings className="w-4 h-4" />}
                    label="Settings"
                  />
                  <div className="h-px bg-border/60 my-2" />
                  <MenuItem
                    onClick={logout}
                    icon={<LogOut className="w-4 h-4" />}
                    label="Log Out"
                    danger
                  />
                </div>
              </>
            ) : isFaculty ? (
              <>
                <div className="relative p-5 pb-4 bg-gradient-to-br from-rose-500/5 via-amber-500/5 to-transparent rounded-t-2xl border-b border-slate-100/80 dark:border-slate-800/40">
                  <div className="flex items-start gap-4">
                    <div className="relative group shrink-0">
                      <div className="absolute -inset-0.5 bg-gradient-to-tr from-rose-500 to-amber-500 rounded-full opacity-60 blur-sm group-hover:opacity-100 transition duration-500" />
                      <div className="relative block rounded-full bg-background p-0.5">
                        {renderAvatar(profile.photo, profile.name, "w-14 h-14 text-sm")}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <h3 className="font-display text-base font-extrabold leading-tight text-slate-800 dark:text-slate-100 truncate">
                        {profile.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5 font-medium">{profile.email}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold border border-indigo-500/20">
                          <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                          Faculty
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-4 pt-3.5 pb-1">
                  <div className="p-3 bg-gradient-to-br from-slate-50/50 to-white/30 dark:from-slate-800/40 dark:to-slate-800/20 rounded-xl border border-slate-100 dark:border-slate-800/50 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 mb-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Teaching Assignment</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold leading-relaxed">
                      {profile.sections?.length ?? 0} teaching section{(profile.sections?.length ?? 0) === 1 ? "" : "s"} assigned.
                      {profile.trimester ? ` · ${profile.trimester}` : ""}
                    </p>
                  </div>
                </div>
                <div className="px-3.5 pb-3.5 pt-2 flex flex-col gap-0.5">
                  <MenuItem
                    to="/settings"
                    icon={<Settings className="w-4 h-4" />}
                    label="Settings"
                  />
                  <div className="h-px bg-border/60 my-2" />
                  <MenuItem
                    onClick={logout}
                    icon={<LogOut className="w-4 h-4" />}
                    label="Log Out"
                    danger
                  />
                </div>
              </>
            ) : (
              <>
                <div className="relative p-5 pb-4 bg-gradient-to-br from-rose-500/5 via-amber-500/5 to-transparent rounded-t-2xl border-b border-slate-100/80 dark:border-slate-800/40">
                  <div className="flex items-start gap-4">
                    <div className="relative group shrink-0">
                      <div className="absolute -inset-0.5 bg-gradient-to-tr from-rose-500 to-amber-500 rounded-full opacity-60 blur-sm group-hover:opacity-100 transition duration-500" />
                      {profileReady && profile.id ? (
                        <Link to="/profile/$userId" params={{ userId: String(profile.id) }} className="relative block rounded-full bg-background p-0.5">
                          {renderAvatar(profile.photo, profile.name, "w-14 h-14 text-sm")}
                        </Link>
                      ) : (
                        <div className="relative block rounded-full bg-background p-0.5">
                          {renderAvatar(profile.photo, profile.name, "w-14 h-14 text-sm")}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      {profileReady && profile.id ? (
                        <Link
                          to="/profile/$userId"
                          params={{ userId: String(profile.id) }}
                          className="font-display text-base font-extrabold leading-tight text-slate-800 dark:text-slate-100 truncate hover:text-rose-600 dark:hover:text-rose-400 transition block"
                        >
                          {profile.name}
                        </Link>
                      ) : (
                        <h3 className="font-display text-base font-extrabold leading-tight text-slate-800 dark:text-slate-100 truncate">
                          {profile.name}
                        </h3>
                      )}
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5 font-medium">{profile.email}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <TierBadgePill tierCode={profile.tierCode} tierLabel={profile.tier} />
                        {profile.streaks
                          .filter((s) => s.current > 0)
                          .map((s) => (
                            <span
                              key={s.code}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold border border-amber-500/20 shadow-sm"
                            >
                              <Flame className="w-3 h-3 text-amber-500 shrink-0 fill-amber-500/20" />
                              {s.code === "iron_will" ? "Will" : "Streak"} {s.current}d
                            </span>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>

                {profile.nextTierPoints > 0 && (
                  <div className="px-4 pt-3.5 pb-1">
                    <div className="p-3 bg-gradient-to-br from-slate-50/50 to-white/30 dark:from-slate-800/40 dark:to-slate-800/20 rounded-xl border border-slate-100 dark:border-slate-800/50 relative overflow-hidden shadow-sm animate-fade-in">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                        <span>Level Progress</span>
                        <span className="text-slate-700 dark:text-slate-300 font-extrabold tracking-normal">
                          {profile.points} / {profile.nextTierPoints} XP
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                        <div
                          className="h-full bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 rounded-full transition-all duration-500 relative"
                          style={{ width: `${Math.min(100, (profile.points / profile.nextTierPoints) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-medium text-right">
                        {Math.max(0, profile.nextTierPoints - profile.points)} XP until next level
                      </p>
                    </div>
                  </div>
                )}

                <div className="px-3.5 pb-3.5 pt-2 flex flex-col gap-0.5">
                  <MenuItem
                    to="/leaderboard"
                    icon={<Trophy className="w-4 h-4" />}
                    label="Leaderboard"
                  />
                  <MenuItem
                    to="/achievements"
                    icon={<Award className="w-4 h-4" />}
                    label="Achievements"
                  />
                  <MenuItem
                    to="/settings"
                    icon={<Settings className="w-4 h-4" />}
                    label="Settings"
                  />
                  <div className="h-px bg-border/60 my-2" />
                  <MenuItem
                    onClick={logout}
                    icon={<LogOut className="w-4 h-4" />}
                    label="Log Out"
                    danger
                  />
                </div>
              </>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
