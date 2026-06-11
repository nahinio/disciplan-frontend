import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, GraduationCap, Medal } from "lucide-react";
import { appRouteSsr, requireAuth } from "@/lib/routeAuth";
import { TopHeader } from "@/components/dashboard/TopHeader";
import { MobileTabBar } from "@/components/dashboard/MobileTabBar";
import { TierBadge } from "@/components/gamification/TierBadge";
import { ProfileGamificationStats } from "@/components/profile/ProfileGamificationStats";
import { TaskHeatmap } from "@/components/profile/TaskHeatmap";
import { useUserStats, getRoleAvatarGradient, hasCustomAvatar } from "@/hooks/useUserStats";
import { api } from "@/lib/api";
import { encodeCourseCode } from "@/lib/blog";
import { achievementCaption } from "@/lib/achievementCaptions";
import { cn } from "@/lib/utils";
import { RefreshButton } from "@/components/ui/refresh-button";
import { usePageRefresh } from "@/hooks/usePageRefresh";
import { AchievementBadge } from "@/components/gamification/AchievementBadge";

export const Route = createFileRoute("/profile/$userId")({
  ssr: appRouteSsr,
  beforeLoad: () => {
    requireAuth();
  },
  head: () => ({
    meta: [{ title: "DisciPlan — Profile" }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { userId } = Route.useParams();
  const { profile: viewer, refreshProfile } = useUserStats();
  const isOwnProfile = viewer.id === Number(userId);

  const profileQuery = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => api.getUserProfile(Number(userId)),
  });

  const { refresh: refreshProfilePage, isRefreshing } = usePageRefresh(async () => {
    await profileQuery.refetch();
    if (isOwnProfile) await refreshProfile();
  });

  if (profileQuery.isPending) {
    return (
      <Shell>
        <p className="text-sm text-muted-foreground py-16 text-center">Loading profile…</p>
      </Shell>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <Shell>
        <div className="py-16 text-center space-y-3">
          <p className="text-sm text-muted-foreground">This profile is unavailable.</p>
          <Link to="/leaderboard" className="text-sm font-semibold text-rose-600 hover:underline">
            Back to leaderboard
          </Link>
        </div>
      </Shell>
    );
  }

  const p = profileQuery.data;
  const heatmap = p.role_code === "student" ? (p.heatmap as {
    days: { date: string; count: number }[];
    total_completions: number;
    active_days: number;
    max_count: number;
  }) : null;

  return (
    <Shell>
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-8">
        <header className="relative flex flex-col sm:flex-row gap-5 items-start w-full">
          {hasCustomAvatar(p.avatar_url) ? (
            <img
              src={p.avatar_url}
              alt=""
              className="w-20 h-20 rounded-full object-cover border-2 border-border shrink-0"
            />
          ) : (
            <div
              className={cn(
                "w-20 h-20 rounded-full bg-gradient-to-br shrink-0",
                getRoleAvatarGradient((p.role_code as any) || "student")
              )}
            />
          )}
          <div className="flex-1 min-w-0 sm:pr-24">
            <div className="flex flex-wrap items-center gap-2.5">
              {p.role_code === "student" && (
                <TierBadge
                  tierCode={p.tier_code as string | undefined}
                  tierLabel={p.tier_label as string | undefined}
                  size="md"
                />
              )}
              {p.role_code === "faculty" && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#7d9b76] text-white uppercase tracking-wider">
                  Faculty
                </span>
              )}
              <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
                {p.display_name}
              </h1>
              {isOwnProfile && (
                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                  You
                </span>
              )}
            </div>
            {p.department_name && (
              <p className="text-sm text-muted-foreground mt-1">{p.department_name}</p>
            )}
            {p.bio && (
              <p className="text-sm text-foreground/85 mt-2 max-w-xl leading-relaxed">{p.bio}</p>
            )}
          </div>
          <div className="absolute top-0 right-0 z-10">
            <RefreshButton onClick={refreshProfilePage} loading={isRefreshing || profileQuery.isFetching} />
          </div>
        </header>

        {p.role_code === "student" && heatmap && (
          <>
            <ProfileGamificationStats
              tierLabel={p.tier_label as string | undefined}
              tierCode={p.tier_code as string | undefined}
              totalPoints={Number(p.total_points ?? 0)}
              rank={p.rank as number | null | undefined}
              nextTierPoints={p.next_tier_points as number | null | undefined}
              nextTierLabel={p.next_tier_label as string | null | undefined}
            />

            <section className="rounded-2xl border border-rose-100/60 bg-white/70 p-4 sm:p-5">
              <TaskHeatmap
                days={heatmap.days}
                maxCount={heatmap.max_count}
                totalCompletions={heatmap.total_completions}
                activeDays={heatmap.active_days}
              />
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Medal className="w-4 h-4 text-rose-600" />
                  Achievements
                </h2>
                {isOwnProfile && (
                  <Link
                    to="/achievements"
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 transition"
                  >
                    View all →
                  </Link>
                )}
              </div>
              {(p.badges as { code: string; label: string; icon_url?: string; caption?: string }[]).length ===
              0 ? (
                <p className="text-sm text-muted-foreground italic py-2">No badges unlocked yet.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {(p.badges as { code: string; label: string; icon_url?: string; caption?: string }[]).map(
                    (b) => {
                      const caption = achievementCaption(b.code, b.caption);
                      return (
                        <div
                          key={b.code}
                          className="flex gap-3 p-3.5 rounded-2xl border border-rose-100/80 bg-gradient-to-br from-rose-50/50 to-white"
                          title={caption}
                        >
                          <AchievementBadge
                            code={b.code}
                            iconUrl={b.icon_url}
                            isUnlocked={true}
                            size="sm"
                          />
                          <div className="min-w-0 space-y-0.5">
                            <p className="text-xs font-bold text-foreground leading-tight">{b.label}</p>
                            <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                              {caption}
                            </p>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </section>
          </>
        )}

        <section className="space-y-3">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5" />
            Courses
          </h2>
          {(p.courses as { course_code: string; title: string; section_label: string }[]).length ===
          0 ? (
            <p className="text-sm text-muted-foreground italic">No enrolled courses yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {(p.courses as { course_code: string; title: string; section_label: string }[]).map(
                (c) => (
                  <Link
                    key={`${c.course_code}-${c.section_label}`}
                    to="/courses/$courseCode/section"
                    params={{ courseCode: encodeCourseCode(c.course_code) }}
                    search={{ section: c.section_label }}
                    className="p-3 rounded-xl border border-border bg-card hover:border-rose-200 transition text-sm"
                  >
                    <span className="font-mono text-[10px] font-bold text-rose-600">
                      {c.course_code}
                    </span>
                    <p className="font-semibold text-foreground mt-0.5 line-clamp-1">{c.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Section {c.section_label}
                    </p>
                  </Link>
                )
              )}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            Blog posts
          </h2>
          {(p.blogs as { id: number; title: string; course_code: string; upvotes: number }[])
            .length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No published blogs yet.</p>
          ) : (
            <div className="space-y-2">
              {(
                p.blogs as {
                  id: number;
                  title: string;
                  course_code: string;
                  excerpt?: string;
                  upvotes: number;
                }[]
              ).map((post) => (
                <Link
                  key={post.id}
                  to="/blogs/$courseCode/$postId"
                  params={{
                    courseCode: encodeCourseCode(post.course_code),
                    postId: String(post.id),
                  }}
                  className="block p-4 rounded-xl border border-border bg-card hover:border-rose-200 transition"
                >
                  <span className="text-[10px] font-mono font-bold text-rose-600">
                    {post.course_code}
                  </span>
                  <p className="font-semibold text-foreground mt-1">{post.title}</p>
                  {post.excerpt && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{post.excerpt}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-2 font-semibold">
                    {post.upvotes} upvote{post.upvotes === 1 ? "" : "s"}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper pb-20 md:pb-0">
      <TopHeader />
      <main>{children}</main>
      <MobileTabBar />
    </div>
  );
}
