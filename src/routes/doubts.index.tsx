import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/routeAuth";
import { Search, HelpCircle } from "lucide-react";
import { TopHeader } from "@/components/dashboard/TopHeader";
import { MobileTabBar } from "@/components/dashboard/MobileTabBar";
import { DoubtCard } from "@/components/doubts/DoubtCard";
import { AppSelect } from "@/components/ui/app-select";
import { useDoubtsSearch, type DoubtSearchStatus } from "@/hooks/useDoubtsSearch";
import { useOfferings } from "@/hooks/useOfferings";
import { useUserStats } from "@/hooks/useUserStats";

export const Route = createFileRoute("/doubts/")({
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

  const { data, isPending, isError } = useDoubtsSearch({
    q: debouncedQ,
    courseCode: courseFilter || undefined,
    status,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  if (profile.role === "admin") {
    return (
      <div className="h-screen overflow-hidden flex flex-col bg-background">
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
    <div className="h-screen overflow-hidden flex flex-col bg-background text-foreground">
      <TopHeader />
      <main className="flex-1 overflow-y-auto no-scrollbar pb-20 md:pb-0">
        <div className="max-w-5xl mx-auto px-5 md:px-8 py-8 space-y-8">
          <header>
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Knowledge base{profile.trimester ? ` · ${profile.trimester}` : ""}
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mt-2 flex items-center gap-3">
              <HelpCircle className="w-9 h-9 text-rose-600 shrink-0" />
              Doubts
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Search questions and faculty-verified answers from your courses. Find similar problems
              before posting a new doubt in your section hub.
            </p>
          </header>

          <section className="space-y-4">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="search"
                  value={inputQ}
                  onChange={(e) => setInputQ(e.target.value)}
                  placeholder="Fuzzy search questions, answers, course codes…"
                  className="pl-9 pr-3 h-11 w-full rounded-full border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                />
              </div>
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
            </div>

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
              <span className="text-xs text-muted-foreground self-center ml-auto tabular-nums">
                {isPending ? "Searching…" : `${total} result${total === 1 ? "" : "s"}`}
              </span>
            </div>

            {isError ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Could not load doubts. Try again in a moment.
              </p>
            ) : isPending ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Loading doubts…</p>
            ) : items.length === 0 ? (
              <div className="py-16 text-center rounded-2xl border border-dashed border-border">
                <p className="text-sm text-muted-foreground font-medium">
                  {debouncedQ
                    ? `No doubts match "${debouncedQ}".`
                    : status === "resolved"
                      ? "No resolved doubts in your courses yet."
                      : "No doubts in your courses yet."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
