import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { appRouteSsr, requireAuth } from "@/lib/routeAuth";
import { TopHeader } from "@/components/dashboard/TopHeader";
import { MobileTabBar } from "@/components/dashboard/MobileTabBar";
import { ProfileGamificationStats } from "@/components/profile/ProfileGamificationStats";
import { useUserStats } from "@/hooks/useUserStats";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { achievementCaption, FAMILY_INTRO } from "@/lib/achievementCaptions";
import { ArrowLeft } from "lucide-react";
import { RefreshButton } from "@/components/ui/refresh-button";
import { usePageRefresh } from "@/hooks/usePageRefresh";
import { AchievementBadge } from "@/components/gamification/AchievementBadge";

export const Route = createFileRoute("/achievements")({
  ssr: appRouteSsr,
  beforeLoad: () => {
    requireAuth();
  },
  head: () => ({
    meta: [
      { title: "DisciPlan — Achievements" },
      { name: "description", content: "Your badges, streaks, and achievement ladder." },
    ],
  }),
  component: AchievementsPage,
});

const FAMILY_LABELS: Record<string, string> = {
  moderator: "Moderator",
  iron_will: "Iron Will",
  faculty_favorite: "Faculty Favorite",
  master_author: "Master Author",
  catalyst: "Catalyst",
  speedrunner: "Speedrunner",
};

function AchievementsPage() {
  const { profile } = useUserStats();

  const achievementsQuery = useQuery({
    queryKey: ["gamification", "achievements"],
    queryFn: () => api.getGamificationAchievements(),
    enabled: profile.role === "student",
  });
  const { refresh: refreshAchievements, isRefreshing } = usePageRefresh(() =>
    achievementsQuery.refetch()
  );

  const items = achievementsQuery.data?.items ?? [];
  const families = [...new Set(items.map((i) => i.family))];

  return (
    <div className="min-h-screen bg-paper pb-20 md:pb-0">
      <TopHeader />
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-8">
        <Link
          to="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Settings
        </Link>

        <header className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-rose-600 font-semibold">
                Gamification
              </p>
              <h1 className="font-display text-3xl font-semibold tracking-tight mt-1">Achievements</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Earn badges by contributing, planning, and helping your classmates.
              </p>
            </div>
            {profile.role === "student" && (
              <RefreshButton onClick={refreshAchievements} loading={isRefreshing || achievementsQuery.isFetching} className="shrink-0" />
            )}
          </div>
          <ProfileGamificationStats
            tierLabel={profile.tier}
            tierCode={profile.tierCode}
            totalPoints={profile.points}
            nextTierPoints={profile.nextTierPoints || null}
            compact
          />
          {profile.streaks.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {profile.streaks.map((s) => (
                <span
                  key={s.code}
                  className="text-[11px] font-semibold px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-100"
                >
                  {FAMILY_LABELS[s.code] ?? s.code}: {s.current}d streak · best {s.best}
                </span>
              ))}
            </div>
          )}
        </header>

        {profile.role !== "student" ? (
          <p className="text-sm text-muted-foreground">Achievements are available for student accounts.</p>
        ) : achievementsQuery.isPending ? (
          <p className="text-sm text-muted-foreground">Loading achievements…</p>
        ) : (
          <div className="space-y-8">
            {families.map((family) => {
              const familyItems = items.filter((i) => i.family === family);
              const counter = familyItems[0]?.counter ?? 0;
              return (
                <section key={family} className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-sm font-bold text-foreground">
                        {FAMILY_LABELS[family] ?? family}
                      </h2>
                      <span className="text-[10px] font-semibold text-muted-foreground shrink-0">
                        Progress: {counter.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                      {FAMILY_INTRO[family] ?? "Complete actions in DisciPlan to unlock badges in this family."}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {familyItems.map((item) => {
                      const caption = achievementCaption(item.code, item.caption);
                      const remaining = Math.max(0, item.threshold - counter);
                      return (
                        <div
                          key={item.code}
                          title={caption}
                          className={cn(
                            "rounded-2xl border p-4 flex gap-3 transition",
                            item.is_unlocked
                              ? "border-rose-200/80 bg-gradient-to-br from-rose-50/60 to-white"
                              : "border-border/70 bg-card/50"
                          )}
                        >
                          <AchievementBadge
                            code={item.code}
                            family={item.family}
                            iconUrl={item.icon_url}
                            isUnlocked={item.is_unlocked}
                            size="md"
                          />
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="text-xs font-bold leading-tight text-foreground">{item.label}</p>
                            <p className="text-[11px] text-muted-foreground leading-snug">{caption}</p>
                            <p
                              className={cn(
                                "text-[10px] font-semibold",
                                item.is_unlocked ? "text-rose-700" : "text-muted-foreground"
                              )}
                            >
                              {item.is_unlocked
                                ? "Unlocked"
                                : remaining > 0
                                  ? `${remaining.toLocaleString()} more to unlock`
                                  : `Reach ${item.threshold.toLocaleString()} to unlock`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
      <MobileTabBar />
    </div>
  );
}

