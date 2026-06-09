import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { RefreshCw, Trophy } from "lucide-react";
import { TierBadge } from "@/components/gamification/TierBadge";
import { requireAuth } from "@/lib/routeAuth";
import { TopHeader } from "@/components/dashboard/TopHeader";
import { MobileTabBar } from "@/components/dashboard/MobileTabBar";
import { useUserStats } from "@/hooks/useUserStats";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/leaderboard")({
  beforeLoad: () => {
    requireAuth();
  },
  head: () => ({
    meta: [
      { title: "DisciPlan — Leaderboard" },
      { name: "description", content: "Student XP leaderboard — updated live as you earn points." },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { profile } = useUserStats();
  const [period, setPeriod] = useState<"today" | "all_time">("all_time");

  const lbQuery = useQuery({
    queryKey: ["leaderboard", period],
    queryFn: () => api.getLeaderboard(period),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const items = lbQuery.data?.items ?? [];
  const myRank = lbQuery.data?.my_rank;
  const isStudent = profile.role === "student";

  return (
    <div className="min-h-screen bg-paper pb-20 md:pb-0">
      <TopHeader />
      <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-rose-600 font-semibold">
              Gamification
            </p>
            <h1 className="font-display text-3xl font-semibold tracking-tight mt-1 flex items-center gap-2">
              <Trophy className="w-7 h-7 text-amber-500" />
              Leaderboard
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Rankings refresh automatically when XP is earned.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void lbQuery.refetch()}
            disabled={lbQuery.isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs font-bold hover:bg-muted transition disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", lbQuery.isFetching && "animate-spin")} />
            Refresh
          </button>
        </header>

        <div className="flex gap-1 bg-muted p-1 rounded-full w-fit">
          {(["all_time", "today"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-bold transition",
                period === p
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p === "today" ? "Today" : "All time"}
            </button>
          ))}
        </div>

        {isStudent && myRank && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <TierBadge tierCode={profile.tierCode} tierLabel={profile.tier} size="lg" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Your rank</p>
                <p className="font-display text-2xl font-bold text-foreground mt-0.5">
                  #{Number(myRank.leaderboard_rank ?? myRank.rank)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {period === "today" ? "Today's XP" : "Total XP"}
              </p>
              <p className="font-display text-xl font-bold tabular-nums">{myRank.points.toLocaleString()}</p>
            </div>
            <Link
              to="/profile/$userId"
              params={{ userId: String(profile.id) }}
              className="text-xs font-bold text-rose-600 hover:underline shrink-0"
            >
              My profile →
            </Link>
          </div>
        )}

        {lbQuery.isPending ? (
          <p className="text-sm text-muted-foreground py-10 text-center">Loading rankings…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">
            {isStudent ? "No rankings yet — complete tasks to earn XP!" : "Leaderboard is for students only."}
          </p>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <ol className="divide-y divide-border">
              {items.map((entry) => {
                const isMe = isStudent && entry.user_id === profile.id;
                const rank = Number(entry.leaderboard_rank ?? entry.rank);
                return (
                  <li key={entry.user_id}>
                    <Link
                      to="/profile/$userId"
                      params={{ userId: String(entry.user_id) }}
                      className={cn(
                        "flex items-center gap-4 px-4 py-3.5 hover:bg-muted/40 transition",
                        isMe && "bg-rose-50/40"
                      )}
                    >
                      <span
                        className={cn(
                          "w-8 text-center font-display font-extrabold text-sm shrink-0",
                          rank === 1 && "text-amber-500",
                          rank === 2 && "text-slate-400",
                          rank === 3 && "text-amber-700",
                          rank > 3 && "text-muted-foreground"
                        )}
                      >
                        #{rank}
                      </span>
                      <div className="flex-1 min-w-0 flex items-center gap-2.5">
                        {"tier_label" in entry && entry.tier_label && (
                          <TierBadge
                            tierCode={"tier_code" in entry ? String(entry.tier_code ?? "") : undefined}
                            tierLabel={String(entry.tier_label)}
                            size="sm"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">
                            {entry.display_name}
                            {isMe && (
                              <span className="ml-1.5 text-[10px] font-bold text-rose-600">(You)</span>
                            )}
                          </p>
                          {"tier_label" in entry && entry.tier_label && (
                            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                              {String(entry.tier_label)}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-bold tabular-nums text-foreground shrink-0">
                        {entry.points.toLocaleString()} XP
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </main>
      <MobileTabBar />
    </div>
  );
}
