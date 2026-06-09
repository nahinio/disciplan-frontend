import { Bell, GraduationCap, Users, Info, Check, RefreshCw, Trophy, Settings, LogOut, ShieldCheck } from "lucide-react";
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
  { label: "Profile", to: "/profile" },
];

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
                : n.to === "/profile"
                  ? pathname.startsWith("/profile")
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
          <PopoverContent align="end" className="w-80 p-5 bg-popover/98 backdrop-blur-md border border-border shadow-xl rounded-2xl flex flex-col gap-4 text-left">
            {isAdmin ? (
              <>
                <div className="flex items-center gap-3.5">
                  {renderAvatar(profile.photo, profile.name, "w-12 h-12 text-sm")}
                  <div className="min-w-0">
                    <h3 className="font-display text-lg font-bold leading-tight text-foreground truncate">
                      {profile.name || "Administrator"}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{profile.email}</p>
                    <div className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-400 text-[10px] font-bold">
                      <ShieldCheck className="w-3 h-3 shrink-0" />
                      Administrator
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  You are signed in to the admin console. Update your display name and profile photo in Settings.
                </p>
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <Link
                    to="/settings"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted rounded-xl transition"
                  >
                    <Settings className="w-4 h-4" />
                    Edit profile
                  </Link>
                  <button
                    onClick={logout}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose hover:bg-rose-soft/20 rounded-xl transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Log Out
                  </button>
                </div>
              </>
            ) : isFaculty ? (
              <>
                <div className="flex items-center gap-3.5">
                  {renderAvatar(profile.photo, profile.name, "w-12 h-12 text-sm")}
                  <div className="min-w-0">
                    <h3 className="font-display text-lg font-bold leading-tight text-foreground truncate">
                      {profile.name}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{profile.email}</p>
                    <div className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-100 text-rose-700 text-[10px] font-bold">
                      <GraduationCap className="w-3 h-3 shrink-0" />
                      Faculty
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {profile.sections?.length ?? 0} teaching section
                  {(profile.sections?.length ?? 0) === 1 ? "" : "s"} assigned.
                  {profile.trimester ? ` · ${profile.trimester}` : ""}
                </p>
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <Link
                    to="/settings"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted rounded-xl transition"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                  <button
                    onClick={logout}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose hover:bg-rose-soft/20 rounded-xl transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Log Out
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3.5">
                  {profileReady && profile.id ? (
                    <Link to="/profile/$userId" params={{ userId: String(profile.id) }}>
                      {renderAvatar(profile.photo, profile.name, "w-12 h-12 text-sm")}
                    </Link>
                  ) : (
                    renderAvatar(profile.photo, profile.name, "w-12 h-12 text-sm")
                  )}
                  <div className="min-w-0">
                    {profileReady && profile.id ? (
                      <Link
                        to="/profile/$userId"
                        params={{ userId: String(profile.id) }}
                        className="font-display text-lg font-bold leading-tight text-foreground truncate hover:text-rose-600 transition block"
                      >
                        {profile.name}
                      </Link>
                    ) : (
                      <h3 className="font-display text-lg font-bold leading-tight text-foreground truncate">
                        {profile.name}
                      </h3>
                    )}
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{profile.email}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <TierBadgePill tierCode={profile.tierCode} tierLabel={profile.tier} />
                      {profile.streaks
                        .filter((s) => s.current > 0)
                        .map((s) => (
                          <span
                            key={s.code}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-100 text-rose-700 text-[10px] font-bold"
                          >
                            {s.code === "iron_will" ? "Iron Will" : "Activity"} {s.current}d
                          </span>
                        ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 py-2 border-y border-border">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-muted-foreground">Progress to Next Tier</span>
                    <span className="font-semibold text-foreground font-display text-sm tabular-nums">
                      {profile.points} / {profile.nextTierPoints || 1} XP
                    </span>
                  </div>
                  {profile.nextTierPoints > 0 && (
                    <>
                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-rose to-amber-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, (profile.points / profile.nextTierPoints) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground text-right font-medium">
                        {Math.max(0, profile.nextTierPoints - profile.points)} XP until next tier
                      </p>
                    </>
                  )}
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Link
                      to="/leaderboard"
                      className="text-xs font-bold text-foreground flex items-center gap-1 uppercase tracking-wider font-display hover:text-rose-600 transition"
                    >
                      <Trophy className="w-3.5 h-3.5 text-amber-500" />
                      Leaderboard
                    </Link>
                    <div className="flex items-center gap-1 bg-muted p-0.5 rounded-full">
                      <button
                        onClick={() => setLeaderboardTab("today")}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight transition cursor-pointer ${
                          leaderboardTab === "today" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Today
                      </button>
                      <button
                        onClick={() => setLeaderboardTab("alltime")}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight transition cursor-pointer ${
                          leaderboardTab === "alltime" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        All Time
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {(leaderboardTab === "today" ? todayLeaderboard : allTimeLeaderboard).slice(0, 5).map((entry) => (
                      <Link
                        key={entry.rank + "-" + entry.name}
                        to="/profile/$userId"
                        params={{ userId: String(entry.userId ?? profile.id) }}
                        className={`flex items-center justify-between p-1.5 rounded-xl text-xs transition ${
                          entry.isUser
                            ? "bg-rose-soft/10 border border-rose/10 font-bold"
                            : "hover:bg-muted/40 font-medium"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-4 text-center text-xs font-extrabold font-display ${
                            entry.rank === 1 ? "text-amber-500 font-black" :
                            entry.rank === 2 ? "text-slate-400" :
                            entry.rank === 3 ? "text-amber-700" : "text-muted-foreground"
                          }`}>
                            #{entry.rank}
                          </span>
                          <span className="truncate text-foreground">{entry.name} {entry.isUser && "(You)"}</span>
                        </div>
                        <span className="text-muted-foreground font-display text-[10px] font-semibold">{entry.points.toLocaleString()} XP</span>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border mt-0.5">
                  <Link
                    to="/achievements"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted rounded-xl transition"
                  >
                    <Trophy className="w-4 h-4" />
                    Achievements
                  </Link>
                  <Link
                    to="/settings"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted rounded-xl transition"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                  <button
                    onClick={logout}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose hover:bg-rose-soft/20 rounded-xl transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Log Out
                  </button>
                </div>
              </>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
