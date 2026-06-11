import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { appRouteSsr, requireAuth } from "@/lib/routeAuth";
import { Search, HelpCircle } from "lucide-react";
import { TopHeader } from "@/components/dashboard/TopHeader";
import { MobileTabBar } from "@/components/dashboard/MobileTabBar";
import { DoubtCard } from "@/components/doubts/DoubtCard";
import { AppSelect } from "@/components/ui/app-select";
import { useDoubtsSearch, type DoubtSearchStatus } from "@/hooks/useDoubtsSearch";
import { useOfferings } from "@/hooks/useOfferings";
import { useUserStats } from "@/hooks/useUserStats";
import { RefreshButton } from "@/components/ui/refresh-button";
import { usePageRefresh } from "@/hooks/usePageRefresh";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateDoubtsData } from "@/lib/invalidateAppData";

export const Route = createFileRoute("/doubts/")({
  ssr: appRouteSsr,
  beforeLoad: () => {
    requireAuth();
  },
  head: () => ({
    meta: [
      { title: "DisciPlan — Doubts" },
      {
        name: "description",
        content: "Search solved doubts and Q&A across your enrolled courses.",
      },
    ],
  }),
  component: DoubtsIndex,
});

function DoubtsIndex() {
  const qc = useQueryClient();
  const { profile } = useUserStats();
  const { offerings } = useOfferings();
  const [inputQ, setInputQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [status, setStatus] = useState<DoubtSearchStatus>("all");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(inputQ), 300);
    return () => clearTimeout(t);
  }, [inputQ]);

  const courseOptions = useMemo(() => {
    const codes = new Set<string>();
    for (const o of offerings) codes.add(o.course_code);
    return [...codes].sort((a, b) => a.localeCompare(b));
  }, [offerings]);

  const [courseFilter, setCourseFilter] = useState("");

  const doubtsQuery = useDoubtsSearch({
    q: debouncedQ,
    courseCode: courseFilter || undefined,
    status,
  });
  const { data, isPending, isError, refetch } = doubtsQuery;
  const { refresh: refreshDoubts, isRefreshing } = usePageRefresh(async () => {
    await invalidateDoubtsData(qc, courseFilter || undefined);
    await refetch();
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  if (profile.role === "admin") {
    return (
      <div className="h-screen overflow-hidden flex flex-col bg-paper text-ink">
        <TopHeader />
        <main className="flex-1 overflow-y-auto flex items-center justify-center p-8">
          <p className="text-sm text-muted-foreground text-center max-w-md">
            The central Doubts forum is for students and faculty in enrolled sections. Use section
            hubs or moderation tools from the admin dashboard.
          </p>
        </main>
        <MobileTabBar />
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-paper text-ink">
      <TopHeader />
      <main className="flex-1 overflow-y-auto no-scrollbar pb-20 md:pb-0">
        <div className="max-w-[90rem] mx-auto px-5 md:px-8 py-8 space-y-8">
          <div className="relative rounded-3xl border border-rose-100/60 bg-gradient-to-br from-rose-500/5 via-amber-500/5 to-white/80 p-6 md:p-8 shadow-sm space-y-6">
            <div className="absolute top-6 right-6">
              <RefreshButton onClick={refreshDoubts} loading={isRefreshing || isPending} className="shrink-0" />
            </div>
            
            <div className="pr-12 sm:pr-0">
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Knowledge base{profile.trimester ? ` · ${profile.trimester}` : ""}
              </p>
              <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mt-2 flex items-center gap-3">
                <HelpCircle className="w-9 h-9 text-rose-600 shrink-0" />
                Doubts
              </h1>
              <p className="text-muted-foreground mt-2 max-w-4xl">
                Search questions and faculty-verified answers from your courses. Find similar problems
                before posting a new doubt in your section hub.
              </p>
            </div>

            <div className="space-y-4 w-full">
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="search"
                  value={inputQ}
                  onChange={(e) => setInputQ(e.target.value)}
                  placeholder="Fuzzy search questions, answers, course codes…"
                  className="pl-9 pr-4 h-11 w-full rounded-full border border-border bg-card text-sm shadow-sm hover:border-rose-200/60 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100 transition-all duration-200"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                <div className="flex flex-wrap gap-2">
                  {(["all", "resolved"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                        status === s
                          ? "bg-rose-600 text-white border-rose-600"
                          : "bg-card text-muted-foreground border-border hover:border-rose-200"
                      }`}
                    >
                      {s === "all" ? "All doubts" : "Resolved only"}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 ml-auto sm:ml-0">
                  <AppSelect
                    size="pill"
                    value={courseFilter}
                    onValueChange={setCourseFilter}
                    placeholder="All my courses"
                    options={[
                      { value: "", label: "All my courses" },
                      ...courseOptions.map((code) => ({ value: code, label: code })),
                    ]}
                  />
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {isPending ? "Searching…" : `${total} result${total === 1 ? "" : "s"}`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <section className="space-y-4">
            {isError ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Could not load doubts. Try again in a moment.
              </p>
            ) : isPending ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Loading doubts…</p>
            ) : items.length === 0 ? (
              <div className="py-16 text-center rounded-2xl border border-dashed border-rose-100/60 bg-white/70 backdrop-blur-sm">
                <p className="text-sm text-muted-foreground font-medium">
                  {debouncedQ
                    ? `No doubts match "${debouncedQ}".`
                    : status === "resolved"
                      ? "No resolved doubts in your courses yet."
                      : "No doubts in your courses yet."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {items.map((d) => (
                  <DoubtCard key={d.id} doubt={d} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
      <MobileTabBar />
    </div>
  );
}
