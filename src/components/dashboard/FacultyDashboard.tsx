import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useUserStats } from "@/hooks/useUserStats";
import { AcademicCalendar } from "./AcademicCalendar";
import type { SectionDoubt, DoubtAnswer } from "@/data/mockSection";
import { api } from "@/lib/api";
import { invalidateDoubtsData } from "@/lib/invalidateAppData";
import { queryKeys } from "@/lib/queryKeys";
import { TaskWorkspace } from "@/components/tasks/TaskWorkspace";
import { DailyEnergyBar } from "@/components/tasks/DailyEnergyBar";
import { UpcomingEvents } from "./UpcomingEvents";
import { firstName, timeGreeting } from "@/lib/greeting";
import { RefreshButton } from "@/components/ui/refresh-button";
import { usePageRefresh } from "@/hooks/usePageRefresh";
import { invalidatePlannerData } from "@/lib/invalidateAppData";

interface FacultyDoubt extends SectionDoubt {
  answerCount: number;
  isSolved: boolean;
}

export function FacultyDashboard() {
  const qc = useQueryClient();
  const { profile } = useUserStats();
  const [selectedDoubt, setSelectedDoubt] = useState<FacultyDoubt | null>(null);
  const [doubtAnswers, setDoubtAnswers] = useState<DoubtAnswer[]>([]);
  const [answerText, setAnswerText] = useState("");
  const [activeTab, setActiveTab] = useState<"today" | "doubts">("today");

  const teachingSections = useMemo(() => {
    if (profile.sections && profile.sections.length > 0) {
      return profile.sections.map((s) => {
        const parts = s.split("::");
        return { code: parts[0], section: parts[1] };
      });
    }
    return [];
  }, [profile.sections]);

  const sectionKeys = teachingSections.map((s) => `${s.code}::${s.section}`).join("|");

  const doubtsQuery = useQuery({
    queryKey: queryKeys.doubts.facultySections(sectionKeys),
    queryFn: async () => {
      const list: FacultyDoubt[] = [];
      for (const ts of teachingSections) {
        try {
          const res = await api.getSectionDoubts(ts.code, ts.section);
          for (const row of res.items as Record<string, unknown>[]) {
            if (Number(row.is_verified ?? 0) === 1) continue;
            list.push({
              id: String(row.id),
              courseCode: ts.code,
              section: ts.section,
              question: String(row.title ?? ""),
              description: String(row.body ?? ""),
              author: { name: String(row.author_name ?? ""), role: "student", initials: "ST" },
              createdAt: new Date(String(row.created_at ?? Date.now())),
              answers: [],
              answerCount: Number(row.answer_count ?? 0),
              isSolved: false,
            });
          }
        } catch {
          /* skip */
        }
      }
      list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return list;
    },
    enabled: teachingSections.length > 0,
    refetchInterval: 30_000,
  });

  const doubtsList = doubtsQuery.data ?? [];

  const refreshDoubts = async () => {
    await invalidateDoubtsData(qc);
    await doubtsQuery.refetch();
  };

  const { refresh: refreshFacultyHub, isRefreshing } = usePageRefresh(async () => {
    await invalidatePlannerData(qc);
    await refreshDoubts();
  });

  useEffect(() => {
    if (!selectedDoubt) {
      setDoubtAnswers([]);
      return;
    }
    const doubtId = selectedDoubt.id;
    async function loadAnswers() {
      try {
        const res = await api.getDoubt(Number(doubtId));
        const rows = (res.answers as Record<string, unknown>[]) ?? [];
        setDoubtAnswers(
          rows.map((a) => ({
            id: String(a.id),
            doubtId,
            content: String(a.body ?? ""),
            author: {
              name: String(a.author_name ?? ""),
              role: a.is_faculty_answer || a.author_role_code === "faculty" ? "faculty" : "student",
              initials: "—",
            },
            isVerified: Boolean(a.is_faculty_answer),
            isEndorsed: Boolean(a.is_faculty_endorsed),
            isOfficial:
              res.accepted_answer_id != null &&
              String(a.id) === String(res.accepted_answer_id),
            createdAt: new Date(String(a.created_at ?? Date.now())),
          }))
        );
      } catch {
        setDoubtAnswers([]);
      }
    }
    void loadAnswers();
  }, [selectedDoubt, doubtsList]);

  useEffect(() => {
    if (selectedDoubt && !doubtsList.some((d) => d.id === selectedDoubt.id)) {
      setSelectedDoubt(null);
    }
  }, [doubtsList, selectedDoubt]);

  const handleAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoubt || !answerText.trim()) return;

    try {
      await api.answerDoubt(Number(selectedDoubt.id), { body: answerText.trim() });
      await invalidateDoubtsData(qc, selectedDoubt.courseCode, selectedDoubt.section);
      await refreshDoubts();
      toast.success("Verified answer published!");
      setAnswerText("");
      setSelectedDoubt(null);
    } catch {
      toast.error("Could not post answer");
    }
  };

  const handleMarkSolved = async () => {
    if (!selectedDoubt) return;
    try {
      await api.verifyDoubt(Number(selectedDoubt.id));
      await invalidateDoubtsData(qc, selectedDoubt.courseCode, selectedDoubt.section);
      await refreshDoubts();
      toast.success("Doubt marked as solved.");
      setSelectedDoubt(null);
    } catch {
      toast.error("Could not mark doubt as solved");
    }
  };

  const handleVerifyAnswer = async (answerId: string) => {
    try {
      await api.acceptDoubtAnswer(Number(answerId));
      if (selectedDoubt) {
        await invalidateDoubtsData(qc, selectedDoubt.courseCode, selectedDoubt.section);
      }
      await refreshDoubts();
      toast.success("Accepted as official solution.");
    } catch {
      toast.error("Could not verify answer");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Faculty Headers */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-rose-600 font-semibold">
            Faculty Hub{profile.trimester ? ` · ${profile.trimester}` : ""}
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mt-2 text-slate-800 leading-[1.05]">
            {timeGreeting()}, {firstName(profile.name)}.
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl text-sm font-medium">
            You have {teachingSections.length} active course sections. {doubtsList.length} student doubts are pending resolution in your hub.
          </p>
        </div>
        <RefreshButton onClick={refreshFacultyHub} loading={isRefreshing} className="shrink-0" />
      </header>

      {/* Navigation tabs inside Dashboard */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("today")}
          className={`pb-3 text-sm font-semibold tracking-tight transition-colors cursor-pointer mr-6 relative ${
            activeTab === "today" ? "text-slate-800" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          Tasks & teaching
          {activeTab === "today" && (
            <motion.div
              layoutId="dashboardTabLine"
              className="absolute bottom-0 inset-x-0 h-0.5 bg-rose-600"
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab("doubts")}
          className={`pb-3 text-sm font-semibold tracking-tight transition-colors cursor-pointer relative ${
            activeTab === "doubts" ? "text-slate-800" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          Doubt Q&A Hub ({doubtsList.length})
          {activeTab === "doubts" && (
            <motion.div
              layoutId="dashboardTabLine"
              className="absolute bottom-0 inset-x-0 h-0.5 bg-rose-600"
            />
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "today" ? (
          <motion.div
            key="today-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <DailyEnergyBar />
            <TaskWorkspace />
            <UpcomingEvents />
          </motion.div>
        ) : (
          <motion.div
            key="doubts-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
          >
            {/* Left doubts list */}
            <div className={selectedDoubt ? "lg:col-span-5 space-y-3" : "lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-4"}>
              {doubtsList.length === 0 ? (
                <div className="col-span-full py-16 text-center rounded-2xl border border-dashed border-slate-200 bg-white">
                  <p className="text-sm text-slate-400 font-medium">No pending doubts in your sections.</p>
                </div>
              ) : (
                doubtsList.map((doubt) => {
                  const replyCount = doubt.answerCount;
                  const isSelected = selectedDoubt?.id === doubt.id;

                  return (
                    <div
                      key={doubt.id}
                      onClick={() => setSelectedDoubt(doubt)}
                      className={`p-4 rounded-xl border bg-white shadow-sm hover:shadow-md cursor-pointer transition relative group ${
                        isSelected ? "border-rose-600 ring-1 ring-rose-600" : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider bg-rose-50 px-2 py-0.5 rounded">
                          {doubt.courseCode} · Sec {doubt.section}
                        </span>
                      </div>

                      <h4 className="font-display text-sm font-bold text-slate-800 mt-2.5 line-clamp-1 leading-snug">
                        {doubt.question}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {doubt.description}
                      </p>

                      <div className="flex items-center justify-between mt-4 pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-semibold">
                        <span>By {doubt.author.name}</span>
                        <span>{replyCount} repl{replyCount === 1 ? "y" : "ies"}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right side detail & answer pane */}
            {selectedDoubt && (
              <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-rose-500" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">
                        {selectedDoubt.courseCode} · Section {selectedDoubt.section}
                      </h4>
                      <p className="text-[10px] text-slate-400">Asked by {selectedDoubt.author.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDoubt(null)}
                    className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <h3 className="font-display text-lg font-bold text-slate-850 leading-tight">
                    {selectedDoubt.question}
                  </h3>
                  <p className="text-xs text-slate-600 mt-2 whitespace-pre-wrap leading-relaxed">
                    {selectedDoubt.description}
                  </p>
                </div>

                {/* Answers history for this doubt */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <h5 className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Responses</h5>
                  {doubtAnswers.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No answers yet. Be the first to verify and reply.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                      {doubtAnswers.map((reply) => (
                          <div key={reply.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                            <div className="flex items-center justify-between font-bold text-slate-700 gap-2">
                              <span>{reply.author.name} ({reply.author.role})</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {reply.isOfficial && (
                                  <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200 font-extrabold uppercase tracking-wider">
                                    Official solution
                                  </span>
                                )}
                                {reply.isEndorsed && !reply.isOfficial && (
                                  <span className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100 font-extrabold uppercase tracking-wider">
                                    Faculty endorsed
                                  </span>
                                )}
                                {reply.isVerified && reply.author.role === "faculty" && (
                                  <span className="text-[9px] bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded border border-sky-100 font-extrabold uppercase tracking-wider">
                                    Faculty answer
                                  </span>
                                )}
                                {!reply.isOfficial &&
                                  !reply.isEndorsed &&
                                  reply.author.role === "student" && (
                                  <button
                                    type="button"
                                    onClick={() => void handleVerifyAnswer(reply.id)}
                                    className="text-[9px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded border border-rose-100 font-extrabold uppercase tracking-wider hover:bg-rose-100 cursor-pointer"
                                  >
                                    Accept as official solution
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-slate-600 mt-1 font-medium">{reply.content}</p>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Reply Form */}
                <form onSubmit={handleAnswerSubmit} className="space-y-3 pt-4 border-t border-slate-100">
                  <h5 className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Post Verified Answer</h5>
                  <textarea
                    required
                    rows={3}
                    placeholder="Type your official response here to clarify this doubt..."
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 resize-none font-semibold"
                  />
                  <div className="flex justify-end gap-2">
                    {!selectedDoubt.isSolved && (
                      <button
                        type="button"
                        onClick={() => void handleMarkSolved()}
                        className="inline-flex items-center gap-1.5 px-4 py-1.8 border border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-full text-xs font-bold transition cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Mark solved
                      </button>
                    )}
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 px-4.5 py-1.8 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-bold transition shadow-sm cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Publish Answer
                    </button>
                  </div>
                </form>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {activeTab === "today" && (
        <div className="border-t border-slate-100 pt-8">
          <AcademicCalendar />
        </div>
      )}

    </div>
  );
}

// Simple X icon replacement since Lucide may sometimes fail
function X({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
