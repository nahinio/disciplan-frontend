import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { requireAuth } from "@/lib/routeAuth";
import { useOfferings } from "@/hooks/useOfferings";
import { useCatalogue } from "@/hooks/useCatalogue";
import { PenSquare, Search } from "lucide-react";
import { TopHeader } from "@/components/dashboard/TopHeader";
import { MobileTabBar } from "@/components/dashboard/MobileTabBar";
import { CourseTile } from "@/components/blogs/CourseTile";
import { useUserStats } from "@/hooks/useUserStats";

export const Route = createFileRoute("/blogs/")({
  beforeLoad: () => {
    requireAuth();
  },
  head: () => ({
    meta: [
      { title: "DisciPlan — Blogs" },
      {
        name: "description",
        content: "Course-indexed student & faculty blogs across your trimester and the full catalogue.",
      },
      { property: "og:title", content: "DisciPlan — Blogs" },
      {
        property: "og:description",
        content: "Read and write course-specific posts. Faculty are verified, admins are highlighted.",
      },
    ],
  }),
  component: BlogsIndex,
});

function BlogsIndex() {
  const [q, setQ] = useState("");
  const { profile } = useUserStats();
  const { offerings } = useOfferings();
  const { catalogue, loading } = useCatalogue();

  const enrolledCodes = useMemo(
    () => new Set(offerings.map((c) => c.course_code)),
    [offerings],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return catalogue;
    return catalogue.filter(
      (c) =>
        c.code.toLowerCase().includes(needle) ||
        c.title.toLowerCase().includes(needle) ||
        c.department.toLowerCase().includes(needle),
    );
  }, [q, catalogue]);

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-background text-foreground">
      <TopHeader />
      <main className="flex-1 overflow-y-auto no-scrollbar pb-20 md:pb-0">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-8 space-y-10">
          <header className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Community{profile.trimester ? ` · ${profile.trimester}` : ""}
              </p>
              <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mt-2">
                Blogs
              </h1>
              <p className="text-muted-foreground mt-2 max-w-xl">
                Notes, breakdowns, and announcements — by students and faculty, organized by course.
              </p>
            </div>
            <Link
              to="/blogs/new"
              search={
                offerings[0]?.course_code
                  ? { course: offerings[0].course_code }
                  : undefined
              }
              className="inline-flex items-center gap-2 px-4 h-10 rounded-full bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 transition shadow-sm"
            >
              <PenSquare className="w-4 h-4" />
              Create blog post
            </Link>
          </header>

          <section className="space-y-4">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <h2 className="font-display text-xl font-semibold tracking-tight">All courses</h2>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by code, title, or department"
                  className="pl-9 pr-3 h-10 w-80 max-w-full rounded-full border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                />
              </div>
            </div>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading catalogue…</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">No courses match "{q}".</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {filtered.map((c) => (
                  <CourseTile
                    key={c.code}
                    code={c.code}
                    title={c.title}
                    credit={c.credit}
                    department={c.department}
                    highlight={enrolledCodes.has(c.code)}
                  />
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
