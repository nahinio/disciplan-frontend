import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { appRouteSsr, requireAuth } from "@/lib/routeAuth";
import { useOfferings } from "@/hooks/useOfferings";
import { useSectionHub } from "@/hooks/useSectionHub";
import {
  ArrowLeft,
  FileText,
  Award,
  Clock,
  Download,
  CheckCircle2,
  AlertTriangle,
  X,
  Search,
  Check,
  ChevronRight,
  TrendingUp,
  Users,
  CheckCircle
} from "lucide-react";
import { z } from "zod";
import { TopHeader } from "@/components/dashboard/TopHeader";
import { MobileTabBar } from "@/components/dashboard/MobileTabBar";
import { decodeCourseCode, encodeCourseCode } from "@/lib/blog";
import { getSubmissionTimingStatus } from "@/lib/submission";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { RefreshButton } from "@/components/ui/refresh-button";
import { usePageRefresh } from "@/hooks/usePageRefresh";
import type { ExamAssignment, StudentSubmission } from "@/types/exam";

const submissionsSearchSchema = z.object({
  examId: z.string().optional(),
  section: z.string().optional(),
});

export const Route = createFileRoute("/courses_/$courseCode_/submissions")({
  ssr: appRouteSsr,
  beforeLoad: () => {
    requireAuth();
  },
  validateSearch: (search) => submissionsSearchSchema.parse(search),
  loader: ({ params }) => {
    const code = decodeCourseCode(params.courseCode);
    return { code };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `DisciPlan — Submissions — ${loaderData?.code ?? "Course"}` },
    ],
  }),
  component: SubmissionsPage,
});

function SubmissionsPage() {
  const { code } = Route.useLoaderData();
  const search = Route.useSearch();
  const examId = search.examId;
  const sectionParam = search.section ?? "";
  const { findOffering } = useOfferings();
  const sectionLabel = useMemo(() => {
    const found = findOffering(code, sectionParam);
    return found?.section ?? sectionParam;
  }, [findOffering, code, sectionParam]);

  const hub = useSectionHub(code, sectionLabel);
  const exams = hub.exams;
  const { refresh: refreshSubmissions, isRefreshing } = usePageRefresh(hub.refresh);

  const exam = useMemo(() => {
    if (examId) {
      return exams.find((e) => e.id === examId) || null;
    }
    return exams[0] || null;
  }, [exams, examId]);

  const [enrolledCount, setEnrolledCount] = useState(0);

  useEffect(() => {
    if (!code || !sectionLabel) return;
    void api.getSectionGrades(code, sectionLabel).then((res) => {
      setEnrolledCount((res.items as unknown[]).length);
    }).catch(() => setEnrolledCount(0));
  }, [code, sectionLabel, hub.exams]);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "graded" | "pending" | "late" | "early">("all");

  // Grading modal states
  const [gradingSubmissionTarget, setGradingSubmissionTarget] = useState<{
    submissionId: number;
    studentEmail: string;
    studentName: string;
    submittedFile: string;
    submittedAt: string;
    maxMarks: number;
    marksObtained?: number;
    feedback?: string;
  } | null>(null);
  const [gradeSubmissionMarks, setGradeSubmissionMarks] = useState("");
  const [gradeSubmissionFeedback, setGradeSubmissionFeedback] = useState("");

  const handleDownloadFile = (
    fileName: string,
    studentName: string,
    fileUrl?: string
  ) => {
    if (fileUrl) {
      window.open(fileUrl, "_blank", "noopener,noreferrer");
      toast.success(`Opening submission: ${fileName}`);
      return;
    }
    toast.error(`No download available for ${studentName}'s file`);
  };

  const handleGradeSubmissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingSubmissionTarget || !exam) return;

    const { submissionId, maxMarks } = gradingSubmissionTarget;
    const marks = Math.max(0, Math.min(maxMarks, parseFloat(gradeSubmissionMarks) || 0));
    const feedbackText = gradeSubmissionFeedback.trim() || undefined;

    try {
      await hub.gradeSubmission(submissionId, marks, feedbackText);
      setGradingSubmissionTarget(null);
      setGradeSubmissionMarks("");
      setGradeSubmissionFeedback("");
      toast.success("Submission graded successfully!");
    } catch {
      toast.error("Could not save grade");
    }
  };

  // Compute stats
  const stats = useMemo(() => {
    if (!exam) return { total: 0, submitted: 0, graded: 0, pending: 0, early: 0, late: 0, avg: 0 };
    const total = enrolledCount || subs.length;
    const subs = exam.submissions || [];
    const submitted = subs.length;
    const graded = subs.filter(s => s.marksObtained !== undefined).length;
    const pending = submitted - graded;
    
    let early = 0;
    let late = 0;
    let totalMarks = 0;
    let gradedCount = 0;

    subs.forEach(s => {
      const timing = getSubmissionTimingStatus(s.submittedAt, exam.deadline);
      if (timing.status === "early") early++;
      else late++;

      if (s.marksObtained !== undefined) {
        totalMarks += s.marksObtained;
        gradedCount++;
      }
    });

    const avg = gradedCount > 0 ? parseFloat((totalMarks / gradedCount).toFixed(2)) : 0;

    return { total, submitted, graded, pending, early, late, avg };
  }, [exam, enrolledCount]);

  // Filtered student list matching search + filter
  const filteredSubmissions = useMemo(() => {
    if (!exam) return [];
    let list = exam.submissions || [];

    // Filter by status filter
    if (statusFilter === "graded") {
      list = list.filter(s => s.marksObtained !== undefined);
    } else if (statusFilter === "pending") {
      list = list.filter(s => s.marksObtained === undefined);
    } else if (statusFilter === "early") {
      list = list.filter(s => getSubmissionTimingStatus(s.submittedAt, exam.deadline).status === "early");
    } else if (statusFilter === "late") {
      list = list.filter(s => getSubmissionTimingStatus(s.submittedAt, exam.deadline).status === "late");
    }

    // Filter by search query
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter(
        s => s.studentName.toLowerCase().includes(q) ||
             s.studentId.includes(q) ||
             s.studentEmail.toLowerCase().includes(q) ||
             s.submittedFile.toLowerCase().includes(q)
      );
    }

    return list;
  }, [exam, searchQuery, statusFilter]);

  if (hub.loading) {
    return (
      <div className="h-screen flex items-center justify-center text-slate-500">
        Loading submissions…
      </div>
    );
  }

  if (!exam) {
    const hasExams = exams.length > 0;
    return (
      <div className="h-screen flex flex-col bg-background text-foreground">
        <TopHeader />
        <main className="flex-1 p-8 text-center flex flex-col items-center justify-center">
          <p className="text-slate-500 font-medium">
            {hasExams
              ? "Exam or Assignment portal not found."
              : "No exam or assignment portals created for this section yet."}
          </p>
          <Link
            to="/courses/$courseCode/section"
            params={{ courseCode: encodeCourseCode(code) }}
            search={{ section: sectionLabel }}
            className="text-[#7d9b76] hover:underline text-sm mt-4 font-bold inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Section Hub Room
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-background text-foreground">
      <TopHeader />
      
      <main className="flex-1 overflow-y-auto no-scrollbar pb-20 md:pb-8">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          
          {/* Header Link */}
          <div>
            <Link
              to="/courses/$courseCode/section"
              params={{ courseCode: encodeCourseCode(code) }}
              search={{ section: sectionLabel }}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Section Hub Room
            </Link>
            
            <div className="flex items-center gap-2 mt-4">
              <span className="font-mono text-xs font-bold text-[#7d9b76]">{code}</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-900 text-white uppercase tracking-wider">
                Section {sectionLabel}
              </span>
            </div>
            
            <div className="flex items-start justify-between gap-4 mt-1">
              <div>
                <h1 className="font-display text-3xl font-bold tracking-tight text-slate-800">
                  Submissions & Grading
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Portal: <span className="font-bold text-slate-700">{exam.title}</span> (Max Marks: {exam.maxMarks})
                </p>
              </div>
              <RefreshButton onClick={refreshSubmissions} loading={isRefreshing || hub.loading} />
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8 items-start">
            
            {/* Left Column: Stats & Information */}
            <div className="lg:col-span-4 space-y-6">
              {/* Stats Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Roster Statistics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/50">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Enrolled</div>
                    <div className="text-xl font-bold text-slate-800">{stats.total}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/50">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Submitted</div>
                    <div className="text-xl font-bold text-slate-800">{stats.submitted}</div>
                  </div>
                  <div className="p-3 bg-slate-55 text-emerald-600 rounded-xl border border-slate-100/50">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Graded</div>
                    <div className="text-xl font-bold text-emerald-605">{stats.graded}</div>
                  </div>
                  <div className="p-3 bg-slate-55 text-amber-600 rounded-xl border border-slate-100/50">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Pending</div>
                    <div className="text-xl font-bold text-amber-605">{stats.pending}</div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Submitted Early:</span>
                    <span className="font-bold text-emerald-650 text-emerald-600">{stats.early}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Submitted Late:</span>
                    <span className="font-bold text-rose-600">{stats.late}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-2 font-bold text-slate-700">
                    <span>Average Graded:</span>
                    <span className="text-[#7d9b76]">{stats.avg} / {exam.maxMarks}</span>
                  </div>
                </div>
              </div>

              {/* Instructions Detail */}
              <div className="rounded-2xl border border-slate-200 bg-[#faf8f3] p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Portal Instructions</h3>
                <div className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {exam.questions}
                </div>
                {exam.attachmentName && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200/50">
                    <span className="text-[10px] font-bold text-slate-400">Attachment:</span>
                    <button
                      onClick={() => handleDownloadFile(exam.attachmentName!, "Instructor")}
                      className="text-xs text-[#7d9b76] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {exam.attachmentName}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Submissions Listing */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-sm space-y-6">
              
              {/* Search & Filter Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by name, ID, email, or file..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 rounded-xl border border-[#dce5d4] focus:outline-none focus:ring-1 focus:ring-[#7d9b76] text-xs text-slate-800 bg-white"
                  />
                </div>

                {/* Filters */}
                <div className="inline-flex rounded-lg border border-[#dce5d4] p-0.5 bg-[#faf8f3] text-[10px] font-bold uppercase tracking-wider shrink-0 self-start sm:self-auto">
                  {(["all", "graded", "pending", "early", "late"] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setStatusFilter(filter)}
                      className={cn(
                        "px-2.5 py-1 rounded-md transition cursor-pointer",
                        statusFilter === filter
                          ? "bg-white text-slate-800 shadow-sm border border-slate-200/40"
                          : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submissions List */}
              <div className="space-y-3">
                <h5 className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                  Student Submissions ({filteredSubmissions.length})
                </h5>

                {filteredSubmissions.length === 0 ? (
                  <div className="py-12 text-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400 font-medium">
                    No submissions matching the filter.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredSubmissions.map((sub: StudentSubmission) => {
                      const isGraded = sub.marksObtained !== undefined;
                      const timing = getSubmissionTimingStatus(sub.submittedAt, exam.deadline);
                      
                      return (
                        <div
                          key={sub.studentEmail}
                          className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                        >
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-805 text-sm">{sub.studentName}</span>
                              <span className="text-[10px] text-slate-400 font-mono">({sub.studentId})</span>
                              
                              {isGraded ? (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-605 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/50 uppercase tracking-wider">
                                  Graded: {sub.marksObtained} / {sub.maxMarks}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-605 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/50 uppercase tracking-wider">
                                  Pending Grade
                                </span>
                              )}
                            </div>
                            
                            <div className="text-[10px] text-slate-500 font-medium">
                              Email: <span className="font-semibold text-slate-700">{sub.studentEmail}</span>
                            </div>

                            {/* File Name & Download Action */}
                            <div className="flex items-center gap-2 py-0.5 flex-wrap">
                              <span className="text-[10px] text-slate-500">File:</span>
                              <button
                                onClick={() =>
                                  handleDownloadFile(
                                    sub.submittedFile,
                                    sub.studentName,
                                    sub.fileUrl
                                  )
                                }
                                className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#7d9b76] hover:underline cursor-pointer bg-white px-2 py-1 rounded-lg border border-slate-200/50 hover:border-[#7d9b76] transition shadow-sm active:scale-95"
                                title="Click to download student submission file"
                              >
                                <Download className="w-3.5 h-3.5 text-[#7d9b76]" />
                                {sub.submittedFile}
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-semibold flex-wrap">
                              <span>Submitted: {new Date(sub.submittedAt).toLocaleString()}</span>
                              <span>•</span>
                              <span className={cn(
                                "font-bold uppercase tracking-wider text-[8px]",
                                timing.status === "early" ? "text-emerald-600" : "text-rose-600"
                              )}>
                                {timing.text}
                              </span>
                            </div>

                            {sub.feedback && (
                              <div className="mt-2 p-2.5 bg-white rounded-xl border border-slate-200/60 text-[10px] text-slate-600 max-w-xl">
                                <span className="font-bold text-slate-650">Faculty Feedback:</span> "{sub.feedback}"
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => {
                              if (!sub.id) {
                                toast.error("Submission id missing — refresh and try again");
                                return;
                              }
                              setGradingSubmissionTarget({
                                submissionId: sub.id,
                                studentEmail: sub.studentEmail,
                                studentName: sub.studentName,
                                submittedFile: sub.submittedFile,
                                submittedAt: sub.submittedAt,
                                maxMarks: exam.maxMarks,
                                marksObtained: sub.marksObtained,
                                feedback: sub.feedback
                              });
                              setGradeSubmissionMarks(sub.marksObtained !== undefined ? sub.marksObtained.toString() : "");
                              setGradeSubmissionFeedback(sub.feedback || "");
                            }}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#7d9b76] hover:bg-[#6c8766] text-white text-xs font-bold rounded-xl transition duration-200 cursor-pointer self-start sm:self-center shadow-sm shrink-0"
                          >
                            <Award className="w-3.5 h-3.5" />
                            {isGraded ? "Re-Grade" : "Grade"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* GRADE SUBMISSION MODAL */}
      <AnimatePresence>
        {gradingSubmissionTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-[#dce5d4] p-6 shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-display text-base font-bold text-slate-800 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-[#7d9b76]" />
                  Grade Submission
                </h3>
                <button
                  onClick={() => setGradingSubmissionTarget(null)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleGradeSubmissionSubmit} className="space-y-4 pt-3">
                <div className="text-xs space-y-1">
                  <div>
                    <span className="font-bold text-slate-500">Student: </span>
                    <span className="text-slate-800 font-bold">{gradingSubmissionTarget.studentName}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500">Submitted File: </span>
                    <span className="text-slate-750 font-mono font-bold">{gradingSubmissionTarget.submittedFile}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500">Submission Date: </span>
                    <span className="text-slate-650">{new Date(gradingSubmissionTarget.submittedAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Marks Obtained (Max: {gradingSubmissionTarget.maxMarks})
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max={gradingSubmissionTarget.maxMarks}
                    required
                    value={gradeSubmissionMarks}
                    onChange={(e) => setGradeSubmissionMarks(e.target.value)}
                    placeholder="e.g. 18.5"
                    className="w-full h-9 px-3 rounded-xl border border-[#dce5d4] focus:outline-none focus:ring-1 focus:ring-[#7d9b76] text-xs text-slate-800 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Feedback / Comments
                  </label>
                  <textarea
                    rows={3}
                    value={gradeSubmissionFeedback}
                    onChange={(e) => setGradeSubmissionFeedback(e.target.value)}
                    placeholder="Great work, clean structure..."
                    className="w-full p-3 rounded-xl border border-[#dce5d4] focus:outline-none focus:ring-1 focus:ring-[#7d9b76] text-xs text-slate-850 bg-white resize-none font-semibold"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setGradingSubmissionTarget(null)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold transition hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#7d9b76] hover:bg-[#6c8766] text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
                  >
                    Save Grade
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
