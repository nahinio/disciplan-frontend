import { motion, AnimatePresence } from "framer-motion";
import { Menu, BookOpen, LayoutDashboard, Calendar, Users, UserCircle, GraduationCap, ShieldAlert, Megaphone, Sparkles } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { encodeCourseCode } from "@/lib/blog";
import { useUserStats } from "@/hooks/useUserStats";
import { useOfferings } from "@/hooks/useOfferings";

export function LeftSidebar({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location?.pathname }) || "";
  const location = useRouterState({ select: (s) => s.location });
  const searchSection = (location?.search as any)?.section;
  const searchView = (location?.search as any)?.view || "overview";

  const { profile, profileReady } = useUserStats();
  const { offerings } = useOfferings();
  const isAdmin = profileReady && profile.role === "admin";
  const isFaculty = profileReady && profile.role === "faculty";

  const adminViews = [
    { id: "overview", label: "System Overview", icon: LayoutDashboard },
    { id: "courses", label: "Manage Courses", icon: BookOpen },
    { id: "sections", label: "Manage Sections", icon: Calendar },
    { id: "enrollments", label: "Enrollments", icon: GraduationCap },
    { id: "faculty", label: "Faculty", icon: Users },
    { id: "users", label: "User directory", icon: UserCircle },
    { id: "publish", label: "Publish", icon: Sparkles },
    { id: "moderation", label: "Moderation", icon: ShieldAlert },
    { id: "system", label: "Announcements", icon: Megaphone },
  ];

  const facultySections =
    profile.sections && profile.sections.length > 0 ? profile.sections : [];

  const sidebarCourses = isFaculty
    ? facultySections.map((s) => {
        const [code, sec] = s.split("::");
        const offering = offerings.find((r) => r.course_code === code && r.section === sec);
        return {
          code,
          name: offering ? offering.title : `Course ${code}`,
          section: sec,
          accent: "bg-emerald-500",
        };
      })
    : offerings.map((o) => ({
        code: o.course_code,
        name: o.title,
        section: o.section,
        accent: "bg-[#7d9b76]",
      }));

  return (
    <motion.aside
      animate={{ width: expanded ? 260 : 56 }}
      transition={{ type: "spring", stiffness: 280, damping: 30 }}
      className="hidden md:flex flex-col border-r border-border bg-paper/60 backdrop-blur-sm h-full overflow-hidden shrink-0"
    >
      {/* Header: hamburger always visible */}
      <div className="h-16 flex items-center px-3 border-b border-border/60 justify-between">
        <button
          onClick={onToggle}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          className="grid place-items-center w-9 h-9 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          <Menu className="w-4 h-4" />
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.span
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              className="mr-auto ml-3 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground"
            >
              {isAdmin ? "Admin Portal" : isFaculty ? "Sections" : "Courses"}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {expanded ? (
        // Expanded Layout
        <motion.nav
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 px-2 py-3 space-y-1 overflow-y-auto no-scrollbar"
        >
          {isAdmin ? (
            adminViews.map((v) => {
              const Icon = v.icon;
              const active = pathname === "/dashboard" && searchView === v.id;
              return (
                <Link
                  key={v.id}
                  to="/dashboard"
                  search={{ view: v.id }}
                  className={`group relative w-full flex items-center gap-3 rounded-lg px-3 py-2.5 transition text-left border ${
                    active
                      ? "bg-card border-border shadow-sm font-bold text-foreground"
                      : "border-transparent hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? "text-rose" : "text-muted-foreground group-hover:text-foreground"}`} />
                  <span className="text-xs font-semibold leading-none">{v.label}</span>
                </Link>
              );
            })
          ) : (
            sidebarCourses.map((c) => {
              const courseSlug = encodeCourseCode(c.code);
              const active = isFaculty
                ? (pathname === `/courses/${courseSlug}/section` && searchSection === c.section)
                : (pathname === `/courses/${courseSlug}` || pathname.startsWith(`/courses/${courseSlug}/`));
              
              return isFaculty ? (
                <Link
                  key={`${c.code}-${c.section}`}
                  to="/courses/$courseCode/section"
                  params={{ courseCode: courseSlug }}
                  search={{ section: c.section }}
                  className={`group relative w-full flex items-stretch gap-3 rounded-lg pr-2 py-2 transition text-left border ${
                    active 
                      ? "bg-card border-border shadow-sm font-bold" 
                      : "border-transparent hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className={`w-[3px] rounded-full ${c.accent} ${active ? "opacity-100" : "opacity-30 group-hover:opacity-75"} transition-opacity`} />
                  <div className="min-w-0 flex-1 py-0.5">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-xs font-bold leading-tight tracking-tight ${active ? "text-foreground" : "text-foreground/80"}`}>{c.code}</p>
                      <span className="inline-flex items-center px-1.5 py-0.25 rounded text-[8px] font-black bg-slate-900 text-white uppercase tracking-wider scale-90 origin-left">
                        Sec {c.section}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5 font-medium">{c.name}</p>
                  </div>
                </Link>
              ) : (
                <Link
                  key={c.code}
                  to="/courses/$courseCode"
                  params={{ courseCode: courseSlug }}
                  className={`group relative w-full flex items-stretch gap-3 rounded-lg pr-2 py-2 transition text-left border ${
                    active 
                      ? "bg-card border-border shadow-sm font-bold" 
                      : "border-transparent hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className={`w-[3px] rounded-full ${c.accent} ${active ? "opacity-100" : "opacity-30 group-hover:opacity-75"} transition-opacity`} />
                  <div className="min-w-0 flex-1 py-0.5">
                    <p className={`text-xs font-bold leading-tight tracking-tight ${active ? "text-foreground" : "text-foreground/80"}`}>{c.code}</p>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5 font-medium">{c.name}</p>
                  </div>
                </Link>
              );
            })
          )}

          {!isAdmin && (
            <Link
              to="/courses"
              className="w-full flex items-center gap-2 px-2 py-2 mt-3 text-xs font-bold text-[#7d9b76] hover:text-[#6b8865] transition"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Manage Courses</span>
            </Link>
          )}
        </motion.nav>
      ) : (
        // Collapsed Layout
        <div className="flex-1 flex flex-col items-center gap-2 py-4">
          {isAdmin ? (
            adminViews.map((v) => {
              const Icon = v.icon;
              const active = pathname === "/dashboard" && searchView === v.id;
              return (
                <Link
                  key={v.id}
                  to="/dashboard"
                  search={{ view: v.id }}
                  className={`relative w-10 h-10 rounded-xl grid place-items-center transition border ${
                    active
                      ? "bg-card border-border shadow-sm font-bold text-foreground"
                      : "border-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                  title={v.label}
                >
                  <Icon className={`w-4 h-4 ${active ? "text-rose" : "text-muted-foreground"}`} />
                </Link>
              );
            })
          ) : (
            sidebarCourses.map((c) => {
              const courseSlug = encodeCourseCode(c.code);
              const active = isFaculty
                ? (pathname === `/courses/${courseSlug}/section` && searchSection === c.section)
                : (pathname === `/courses/${courseSlug}` || pathname.startsWith(`/courses/${courseSlug}/`));

              return isFaculty ? (
                <Link
                  key={`${c.code}-${c.section}`}
                  to="/courses/$courseCode/section"
                  params={{ courseCode: courseSlug }}
                  search={{ section: c.section }}
                  className={`relative w-10 h-10 rounded-xl grid place-items-center transition border ${
                    active 
                      ? "bg-card border-border shadow-sm font-bold text-foreground" 
                      : "border-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                  title={`${c.code} Section ${c.section}: ${c.name}`}
                >
                  <div className="flex flex-col items-center justify-center text-center leading-none select-none py-0.5">
                    <span className={`text-[7px] uppercase tracking-wider font-extrabold ${active ? "text-slate-500 font-black" : "text-slate-400"}`}>
                      {c.code.split(" ")[0]}
                    </span>
                    <span className="text-[9px] font-black tracking-tighter mt-0.5 leading-none">
                      {c.code.split(" ")[1]}{c.section}
                    </span>
                  </div>
                  <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${c.accent}`} />
                </Link>
              ) : (
                <Link
                  key={c.code}
                  to="/courses/$courseCode"
                  params={{ courseCode: courseSlug }}
                  className={`relative w-10 h-10 rounded-xl grid place-items-center transition border ${
                    active 
                      ? "bg-card border-border shadow-sm font-bold text-foreground" 
                      : "border-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                  title={`${c.code}: ${c.name}`}
                >
                  <div className="flex flex-col items-center justify-center text-center leading-none select-none py-0.5">
                    <span className={`text-[7px] uppercase tracking-wider font-extrabold ${active ? "text-slate-500 font-black" : "text-slate-400"}`}>
                      {c.code.split(" ")[0]}
                    </span>
                    <span className="text-[9px] font-black tracking-tighter mt-0.5">
                      {c.code.split(" ")[1]}
                    </span>
                  </div>
                  <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${c.accent}`} />
                </Link>
              );
            })
          )}
          
          {!isAdmin && (
            <Link
              to="/courses"
              className="w-10 h-10 rounded-xl grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted mt-2"
              title="All Courses"
            >
              <BookOpen className="w-4 h-4" />
            </Link>
          )}
        </div>
      )}
    </motion.aside>
  );
}
