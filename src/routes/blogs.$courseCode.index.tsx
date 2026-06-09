import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { requireAuth } from "@/lib/routeAuth";
import { useOfferings } from "@/hooks/useOfferings";
import { ArrowLeft, ListFilter, PenSquare } from "lucide-react";
import { TopHeader } from "@/components/dashboard/TopHeader";
import { MobileTabBar } from "@/components/dashboard/MobileTabBar";
import { BlogPostCard } from "@/components/blogs/BlogPostCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { decodeCourseCode, score } from "@/lib/blog";
import { useBlogPosts } from "@/hooks/useBlogPosts";
import { useCatalogue } from "@/hooks/useCatalogue";

export const Route = createFileRoute("/blogs/$courseCode/")({
  beforeLoad: () => {
    requireAuth();
  },
  loader: ({ params }) => ({
    code: decodeCourseCode(params.courseCode),
  }),
  head: ({ loaderData }) => ({
    meta: [
      { title: `DisciPlan — ${loaderData?.code ?? "Course"} blog` },
      {
        name: "description",
        content: `Posts and discussion for ${loaderData?.code ?? "this course"}.`,
      },
    ],
  }),
  notFoundComponent: () => (
    <div className="h-screen flex items-center justify-center text-muted-foreground">
      Course not found.
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="h-screen flex items-center justify-center text-muted-foreground">
      Couldn't load blog: {String(error)}
    </div>
  ),
  component: CourseBlogPage,
});

type SortKey = "top" | "new" | "old" | "discussed";
type AuthorFilter = "all" | "faculty" | "student" | "admin";

const sortLabel = (s: SortKey) =>
  s === "top" ? "Top" : s === "new" ? "Newest" : s === "old" ? "Oldest" : "Most discussed";
const authorLabel = (a: AuthorFilter) =>
  a === "faculty" ? "Faculty" : a === "student" ? "Students" : a === "admin" ? "DisciPlan" : "All";


function CourseBlogPage() {
  const { code } = Route.useLoaderData();
  const { offerings } = useOfferings();
  const { catalogue } = useCatalogue();
  const { posts: apiPosts, loading } = useBlogPosts(code);
  const title =
    offerings.find((o) => o.course_code === code)?.title ??
    catalogue.find((c) => c.code === code)?.title ??
    code;
  const [sort, setSort] = useState<SortKey>("top");
  const [authorFilter, setAuthorFilter] = useState<AuthorFilter>("all");

  const posts = useMemo(() => {
    const list = apiPosts;
    const filtered =
      authorFilter === "all"
        ? list
        : list.filter((p) => p.author.role === authorFilter);
    const sorted = [...filtered].sort((a, b) => {
      switch (sort) {
        case "new":
          return b.createdAt.getTime() - a.createdAt.getTime();
        case "old":
          return a.createdAt.getTime() - b.createdAt.getTime();
        case "discussed":
          return b.commentCount - a.commentCount;
        case "top":
        default:
          return score(b) - score(a);
      }
    });
    // Admin posts and explicitly pinned posts always pinned to top, regardless of sort.
    const pinned = sorted
      .filter((p) => p.isPinned || p.author.role === "admin")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const rest = sorted.filter((p) => !p.isPinned && p.author.role !== "admin");
    return [...pinned, ...rest];
  }, [apiPosts, sort, authorFilter]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-muted-foreground">
        Loading posts…
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-background text-foreground">
      <TopHeader />
      <main className="flex-1 overflow-y-auto no-scrollbar pb-20 md:pb-0">
        <div className="max-w-3xl mx-auto px-5 md:px-8 py-8">
          <header>
            <Link
              to="/blogs"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              All blogs
            </Link>
            <div className="mt-3 flex items-end justify-between gap-4 flex-wrap">
              <div>
                <p className="font-mono text-xs font-semibold tracking-tight text-rose-600">
                  {code}
                </p>
                <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mt-1">
                  {title}
                </h1>
                <p className="text-muted-foreground mt-1.5 text-sm">
                  {posts.length} post{posts.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to="/blogs/new"
                  search={{ course: code }}
                  className="inline-flex items-center gap-2 px-4 h-10 rounded-full bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 transition shadow-sm"
                >
                  <PenSquare className="w-4 h-4" />
                  New post
                </Link>
              </div>
            </div>
          </header>

          {posts.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No posts match these filters.
              </p>
            </div>
          ) : (
            <div className="mt-8">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {sortLabel(sort)}
                  {authorFilter !== "all" && ` · ${authorLabel(authorFilter)}`}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition">
                    <ListFilter className="w-3.5 h-3.5" />
                    Filter
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      Sort by
                    </DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={sort}
                      onValueChange={(v) => setSort(v as SortKey)}
                    >
                      <DropdownMenuRadioItem value="top">Top</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="new">Newest</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="old">Oldest</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="discussed">
                        Most discussed
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      Author
                    </DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={authorFilter}
                      onValueChange={(v) => setAuthorFilter(v as AuthorFilter)}
                    >
                      <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="faculty">Faculty</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="student">Students</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="admin">DisciPlan</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {posts.map((p) => (
                <BlogPostCard key={p.id} post={p} />
              ))}
            </div>
          )}
        </div>
      </main>
      <MobileTabBar />
    </div>
  );
}
