import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateCourseContent } from "@/lib/invalidateAppData";
import { RefreshButton } from "@/components/ui/refresh-button";
import { usePageRefresh } from "@/hooks/usePageRefresh";
import { appRouteSsr, requireAuth } from "@/lib/routeAuth";
import { useOfferings } from "@/hooks/useOfferings";
import { ArrowLeft, Clock, MapPin, User, ListTodo, MessageSquare, BookOpen, Sparkles } from "lucide-react";
import { TopHeader } from "@/components/dashboard/TopHeader";
import { MobileTabBar } from "@/components/dashboard/MobileTabBar";
import { CourseTasksPanel } from "@/components/courses/CourseTasksPanel";
import { CourseBlogsPanel } from "@/components/courses/CourseBlogsPanel";
import { CoursePracticePanel } from "@/components/courses/CoursePracticePanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { decodeCourseCode, encodeCourseCode } from "@/lib/blog";
import { courseKey } from "@/lib/coursePrefs";
import { courseAccentStyles } from "@/lib/courseAccent";
import { nextClassLabel } from "@/lib/courseTasks";
import { cn } from "@/lib/utils";


import { z } from "zod";

const courseSearchSchema = z.object({
  tab: z.string().optional(),
  topic: z.string().optional(),
});

export const Route = createFileRoute("/courses_/$courseCode")({
  ssr: appRouteSsr,
  beforeLoad: () => {
    requireAuth();
  },
  validateSearch: courseSearchSchema,
  loader: ({ params }) => {
    const code = decodeCourseCode(params.courseCode);
    return { code };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `DisciPlan — ${loaderData?.code ?? "Course"}` },
      {
        name: "description",
        content: `Tasks, blog, and practice problems for ${loaderData?.code ?? "this course"}.`,
      },
      { property: "og:title", content: `DisciPlan — ${loaderData?.code ?? "Course"}` },
      {
        property: "og:description",
        content: `${loaderData?.code ?? "Course"} — everything in one place.`,
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
      Couldn't load course: {String(error)}
    </div>
  ),
  component: CourseDetailPage,
});

function CourseDetailPage() {
  const { code } = Route.useLoaderData();
  const qc = useQueryClient();
  const { offerings, loading, findOffering, refresh: refreshOfferings } = useOfferings();
  const { refresh: refreshCourseHub, isRefreshing } = usePageRefresh(async () => {
    await invalidateCourseContent(qc, code);
    await refreshOfferings();
  });
  const offering = useMemo(
    () => offerings.find((o) => o.course_code === code) ?? findOffering(code, undefined),
    [offerings, findOffering, code]
  );
  const { tab, topic } = Route.useSearch();
  const key = offering ? courseKey(offering.course_code, offering.section) : "";
  const accent = key ? courseAccentStyles(key) : { border: "", text: "text-[#7d9b76]", shadow: "" };
  const next = offering ? nextClassLabel(offering.days, offering.times) : "—";

  const navigate = useNavigate();
  const activeTab = tab && tab !== "forum" ? tab : "tasks";

  const onTabChange = (nextTab: string) => {
    navigate({
      to: "/courses/$courseCode",
      params: { courseCode: encodeCourseCode(offering?.course_code ?? code) },
      search: {
        tab: nextTab,
        ...(topic ? { topic } : {}),
      },
      replace: true,
    });
  };

  if (!loading && !offering) {
    return (
      <div className="h-screen flex items-center justify-center text-muted-foreground">
        Course not found or you are not enrolled in this section.
      </div>
    );
  }

  if (!offering) {
    return (
      <div className="h-screen flex items-center justify-center text-muted-foreground">
        Loading course…
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-background text-foreground">
      <TopHeader />
      <main className="flex-1 overflow-y-auto no-scrollbar pb-20 md:pb-0">
        <div className="max-w-5xl mx-auto px-5 md:px-8 py-8">
          <Link
            to="/courses"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            All courses
          </Link>

          <header className="mt-4 relative">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("font-mono text-xs font-bold tracking-tight", accent.text)}>
                  {code}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-white uppercase tracking-widest">
                  Sec {offering.section}
                </span>
                <span className="text-[10px] text-[#7d9b76] font-semibold uppercase tracking-wider">
                  {offering.credit} cr
                </span>
              </div>
              <div className="flex items-center gap-2">
                <RefreshButton onClick={refreshCourseHub} loading={isRefreshing} />
                <Link
                  to="/courses/$courseCode/section"
                  params={{ courseCode: encodeCourseCode(offering.course_code) }}
                  search={{ section: offering.section }}
                  className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full bg-[#7d9b76] text-white text-xs font-semibold hover:bg-[#6b8865] transition shadow-sm cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Go to Section Hub
                </Link>
              </div>
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-semibold tracking-tight mt-3 text-slate-800 leading-[1.05]">
              {offering.title}
            </h1>
            <div className="mt-4 flex items-center gap-5 flex-wrap text-sm text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#7d9b76]" />
                {offering.faculty_name}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#7d9b76]" />
                Next: <span className="font-semibold text-slate-800 italic">{next}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#7d9b76]" />
                {offering.rooms[0]}
              </span>
            </div>
          </header>

          <div className="mt-8">
            <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-5">
              <TabsList className="inline-flex h-auto md:h-10 items-center justify-start rounded-[1rem] md:rounded-full border border-[#dce5d4] p-1 bg-[#faf8f3] w-auto flex-wrap md:flex-nowrap gap-1 md:gap-0 shadow-sm">
                <TabsTrigger
                  value="tasks"
                  className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 h-8 rounded-lg md:rounded-full text-xs font-semibold transition data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm data-[state=active]:border-[#dce5d4] text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  <ListTodo className="w-3.5 h-3.5" />
                  Tasks & Schedule
                </TabsTrigger>
                <TabsTrigger
                  value="blogs"
                  className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 h-8 rounded-lg md:rounded-full text-xs font-semibold transition data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm data-[state=active]:border-[#dce5d4] text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Blogs
                </TabsTrigger>
                <TabsTrigger
                  value="practice"
                  className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 h-8 rounded-lg md:rounded-full text-xs font-semibold transition data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm data-[state=active]:border-[#dce5d4] text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Practice Problems
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tasks" className="mt-0 space-y-5 focus-visible:outline-none">
                <CourseTasksPanel code={code} />
              </TabsContent>
              <TabsContent value="blogs" className="mt-0 space-y-5 focus-visible:outline-none">
                <CourseBlogsPanel code={code} initialTopic={topic} />
              </TabsContent>
              <TabsContent value="practice" className="mt-0 space-y-5 focus-visible:outline-none">
                <CoursePracticePanel code={code} initialTopic={topic} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      <MobileTabBar />
    </div>
  );
}
