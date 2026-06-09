import { useMemo, useState, useEffect } from "react";
import { Sparkles, FileText, Download, Award, Upload, ArrowLeft, X, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePracticeTopics, usePracticeProblems, usePastPapers } from "@/hooks/usePractice";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { invalidateCourseContent } from "@/lib/invalidateAppData";
import { toast } from "sonner";
import { AppSelect } from "@/components/ui/app-select";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useUserStats } from "@/hooks/useUserStats";

function ProblemTagPills({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold bg-slate-100 text-slate-600 uppercase tracking-wide"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

export function CoursePracticePanel({ code, initialTopic }: { code: string; initialTopic?: string }) {
  const qc = useQueryClient();
  const { profile } = useUserStats();
  const { topics, loading: topicsLoading } = usePracticeTopics(code);
  const { papers: papersList, refresh: refreshPapers } = usePastPapers(code);

  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  useEffect(() => {
    if (initialTopic) {
      const match = topics.find((t) => 
        t.topic.toLowerCase().includes(initialTopic.toLowerCase()) || 
        initialTopic.toLowerCase().includes(t.topic.toLowerCase())
      );
      if (match) {
        setSelectedTopicId(match.id);
        setCurrentFilter("all");
      }
    }
  }, [initialTopic, topics]);
  const [answeredProblems, setAnsweredProblems] = useState<Record<string, boolean>>({});
  const [expandedProblemId, setExpandedProblemId] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<string>("all");

  const selectedTopic = useMemo(() => {
    if (!selectedTopicId) return null;
    return topics.find((t) => t.id === selectedTopicId) || null;
  }, [selectedTopicId, topics]);

  const { problems: currentProblems } = usePracticeProblems(
    code,
    selectedTopicId,
    !!selectedTopicId
  );

  const availableTags = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const problem of currentProblems) {
      for (const tag of problem.tags) {
        const key = tag.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(tag);
      }
    }
    return out.sort((a, b) => a.localeCompare(b));
  }, [currentProblems]);

  const filteredProblems = useMemo(() => {
    return currentProblems.filter((p) => {
      if (currentFilter === "answered") return !!answeredProblems[p.id];
      if (currentFilter === "unanswered") return !answeredProblems[p.id];
      if (currentFilter.startsWith("tag:")) {
        const tag = currentFilter.slice(4).toLowerCase();
        return p.tags.some((t) => t.toLowerCase() === tag);
      }
      return true;
    });
  }, [currentProblems, currentFilter, answeredProblems]);

  const activeProblem = useMemo(() => {
    if (!expandedProblemId) return null;
    return currentProblems.find((p) => p.id === expandedProblemId) || null;
  }, [expandedProblemId, currentProblems]);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("Class Test 1");
  const [uploadTrimester, setUploadTrimester] = useState("Spring");
  const [uploadYear, setUploadYear] = useState("2025");
  const [uploadSyllabus, setUploadSyllabus] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const papers = papersList;
  const ctPapers = useMemo(() => papers.filter(p => p.term === "ct"), [papers]);
  const examPapers = useMemo(() => papers.filter(p => p.term === "mid-final"), [papers]);
  const midPapers = useMemo(() => examPapers.filter(p => p.title.toLowerCase().includes("mid")), [examPapers]);
  const finalPapers = useMemo(() => examPapers.filter(p => p.title.toLowerCase().includes("final")), [examPapers]);

  const handleDownload = (paper: (typeof papers)[0]) => {
    if (paper.downloadUrl) {
      window.open(paper.downloadUrl, "_blank");
      return;
    }
    toast.info(`Download for ${paper.title} is not available yet.`);
  };

  const handleDeletePaper = () => {
    toast.info("Deleting past papers via API is not yet available.");
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadYear.trim() || !selectedFile) {
      toast.error("Year and file are required.");
      return;
    }

    try {
      const uploaded = await api.uploadFile(selectedFile, "past-papers");
      await api.createPastPaper(code, {
        title: uploadTitle.trim(),
        exam_year: parseInt(uploadYear.trim(), 10),
        file_id: uploaded.file_id,
      });
      setIsUploadOpen(false);
      setUploadSyllabus("");
      setSelectedFile(null);
      invalidateCourseContent(qc, code);
      await refreshPapers();
      toast.success("Question paper uploaded successfully!");
    } catch {
      toast.error("Could not upload paper");
    }
  };

  const handleDeleteProblem = () => {
    toast.info("Deleting practice problems via API is not yet available.");
  };

  if (topicsLoading) {
    return (
      <section className="rounded-[1.5rem] border border-[#dce5d4] bg-white p-6">
        <p className="text-sm text-slate-500">Loading practice content…</p>
      </section>
    );
  }

  if (selectedTopic) {
    const totalCount = currentProblems.length;
    const answeredCount = currentProblems.filter((p) => answeredProblems[p.id]).length;
    const percentComplete = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

    return (
      <div className={cn("grid gap-6 transition-all duration-300", expandedProblemId ? "grid-cols-1 lg:grid-cols-12" : "grid-cols-1")}>
        {/* Left Side: Problems List Section */}
        <section className={cn(
          "rounded-[1.5rem] border border-[#dce5d4] bg-white p-6 shadow-[0_8px_24px_-16px_rgba(125,155,118,0.35)] transition-all flex flex-col",
          expandedProblemId ? "lg:col-span-5 h-[750px]" : "w-full"
        )}>
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setSelectedTopicId(null);
                  setExpandedProblemId(null);
                }}
                className="grid place-items-center w-8 h-8 rounded-full border border-slate-200 hover:border-[#7d9b76] hover:bg-slate-50 transition text-slate-500 hover:text-[#7d9b76] cursor-pointer"
                title="Back to Topics"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-800">
                  {selectedTopic.topic}
                </h2>
              </div>
            </div>

            <div className="flex flex-col sm:items-end gap-1 shrink-0">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                Answered Problems
              </span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-[#7d9b76] transition-all duration-300 rounded-full"
                    style={{ width: `${percentComplete}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-[#7d9b76]">
                  {answeredCount}/{totalCount}
                </span>
              </div>
            </div>
          </header>

          {/* Filter Row */}
          <div className="flex items-center gap-2 overflow-x-auto py-4 scrollbar-none border-b border-slate-100/50 shrink-0">
            {[
              { label: "All", value: "all" },
              { label: "Answered", value: "answered" },
              { label: "Unanswered", value: "unanswered" },
              ...availableTags.map((tag) => ({
                label: tag,
                value: `tag:${tag.toLowerCase()}`,
              })),
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setCurrentFilter(f.value)}
                className={cn(
                  "inline-flex items-center justify-center px-3.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap border transition cursor-pointer",
                  currentFilter === f.value
                    ? "bg-[#7d9b76] border-transparent text-white shadow-sm"
                    : "bg-[#faf8f3] border-[#dce5d4] text-slate-600 hover:bg-white hover:text-slate-800"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Cards List */}
          <div className={cn(
            "flex flex-col gap-4 mt-6",
            expandedProblemId ? "flex-1 overflow-y-auto pr-1 scrollbar-thin" : ""
          )}>
            {filteredProblems.length === 0 ? (
              <div className="text-center py-12 bg-[#faf8f3] border border-dashed border-[#dce5d4] rounded-2xl">
                <p className="text-sm text-slate-500 font-medium">No practice problems match the selected filter.</p>
                <button
                  onClick={() => setCurrentFilter("all")}
                  className="mt-2 text-xs font-bold text-[#7d9b76] hover:underline cursor-pointer"
                >
                  Reset Filter
                </button>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredProblems.map((p) => {
                  const isExpanded = expandedProblemId === p.id;
                  const isAnswered = !!answeredProblems[p.id];
                  return (
                    <motion.div
                      layout
                      key={p.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={cn(
                        "flex flex-col rounded-2xl border bg-[#faf8f3] p-5 transition-all duration-300 shadow-sm gap-4 cursor-pointer",
                        isAnswered ? "border-[#7d9b76]/45 bg-[#7d9b76]/3" : "border-[#dce5d4] hover:bg-white hover:border-[#7d9b76]/20",
                        isExpanded && "border-[#7d9b76] bg-white ring-1 ring-[#7d9b76]/20"
                      )}
                      onClick={() => setExpandedProblemId(isExpanded ? null : p.id)}
                    >
                      <div className="flex-1 flex flex-col justify-between" onClick={(e) => e.stopPropagation()}>
                        <div>
                          <div className="flex items-center justify-between gap-3">
                            <ProblemTagPills tags={p.tags} />
                            {isAnswered && (
                              <span className="text-[10px] font-bold text-[#7d9b76] bg-[#7d9b76]/10 px-2 py-0.5 rounded-full">
                                Solved
                              </span>
                            )}
                          </div>
                          <h4 className={cn(
                            "text-slate-800 font-display text-base font-semibold leading-relaxed mt-3",
                            isAnswered && "text-slate-500 line-through opacity-85"
                          )}>
                            {p.problemNumber != null && (
                              <span className="text-[#7d9b76] mr-1.5">#{p.problemNumber}</span>
                            )}
                            <span
                              className="inline prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ __html: p.question }}
                            />
                          </h4>
                          {p.questionImage && (
                             <div className="mt-3 rounded-xl overflow-hidden border border-slate-100 max-h-48 flex items-center justify-center bg-slate-50 w-fit">
                               <img src={p.questionImage} alt="Question helper" className="max-h-48 object-contain rounded-lg" />
                             </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-4 mt-6 pt-3 border-t border-slate-100/50">
                          <button
                            onClick={() => {
                              setAnsweredProblems(prev => ({
                                ...prev,
                                [p.id]: !prev[p.id]
                              }));
                              toast.success(
                                isAnswered ? "Marked as unsolved" : "Problem solved! Keep going!"
                              );
                            }}
                            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                          >
                            <span className={cn(
                              "w-4 h-4 rounded-md border flex items-center justify-center transition-all",
                              isAnswered
                                ? "bg-[#7d9b76] border-transparent text-white"
                                : "border-slate-300 bg-white"
                            )}>
                              {isAnswered && (
                                <svg className="w-2.5 h-2.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </span>
                            Mark Answered
                          </button>

                          <div className="flex items-center gap-2">
                            {profile.role === "admin" && (
                              <button
                                onClick={() => handleDeleteProblem()}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition cursor-pointer"
                                title="Delete practice problem"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            )}
                            <button
                              onClick={() => setExpandedProblemId(isExpanded ? null : p.id)}
                              className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition shadow-sm cursor-pointer",
                                isExpanded
                                  ? "bg-[#7d9b76] border-transparent text-white hover:bg-[#6b8865]"
                                  : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900"
                              )}
                            >
                              {isExpanded ? "Hide Answer" : "View Answer"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </section>

        {/* Right Side: Answer Detail Pane */}
        <AnimatePresence>
          {expandedProblemId && activeProblem && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="lg:col-span-7 rounded-[1.5rem] border border-[#dce5d4] bg-white p-6 shadow-[0_8px_24px_-16px_rgba(125,155,118,0.35)] flex flex-col h-full min-h-[500px] lg:h-[750px]"
            >
              {/* Header with Close Button */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                <span className="text-xs font-bold text-[#7d9b76] uppercase tracking-wider">
                  Answer & Explanation
                </span>
                <button
                  onClick={() => setExpandedProblemId(null)}
                  className="grid place-items-center w-6 h-6 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Problem Info & Long Answer content */}
              <div className="flex-1 overflow-y-auto mt-4 pr-1 scrollbar-thin space-y-4">
                <div className="space-y-2">
                  <ProblemTagPills tags={activeProblem.tags} />
                  <h3 className="font-display text-lg font-semibold text-slate-800 leading-relaxed">
                    {activeProblem.problemNumber != null && (
                      <span className="text-[#7d9b76] mr-1.5">#{activeProblem.problemNumber}</span>
                    )}
                    <span
                      className="inline prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: activeProblem.question }}
                    />
                  </h3>
                  {activeProblem.questionImage && (
                     <div className="mt-3 rounded-xl overflow-hidden border border-slate-100 max-h-56 flex items-center justify-center bg-slate-50 w-fit">
                       <img src={activeProblem.questionImage} alt="Question helper" className="max-h-56 object-contain rounded-lg" />
                     </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Detailed Answer</h4>
                  <div
                    className="text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100 leading-relaxed overflow-x-auto prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: activeProblem.answer }}
                  />
                  {activeProblem.answerImage && (
                     <div className="mt-3 rounded-xl overflow-hidden border border-slate-100 max-h-60 flex items-center justify-center bg-slate-50 w-fit">
                       <img src={activeProblem.answerImage} alt="Answer helper" className="max-h-60 object-contain rounded-lg" />
                     </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Topics Section */}
      <section className="rounded-[1.5rem] border border-[#dce5d4] bg-white p-6 shadow-[0_8px_24px_-16px_rgba(125,155,118,0.35)]">
        <header className="flex items-baseline justify-between mb-5">
          <div>
            <h2 className="font-display text-2xl tracking-tight text-slate-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#7d9b76]" />
              Practice Topics
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Test your understanding with topic-wise problems.</p>
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#7d9b76] font-bold">
            {topics.length} topic{topics.length === 1 ? "" : "s"}
          </span>
        </header>

        {topics.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">No practice sets yet for this course.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topics.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setSelectedTopicId(t.id);
                  setExpandedProblemId(null);
                  setCurrentFilter("all");
                }}
                className="flex flex-col justify-between rounded-2xl border border-transparent bg-[#faf8f3] hover:bg-white hover:border-[#dce5d4] p-4 text-left transition duration-200 group cursor-pointer shadow-sm hover:shadow-md"
              >
                <h4 className="font-display text-base font-semibold text-slate-800 leading-tight group-hover:text-[#7d9b76] transition-colors">
                  {t.topic}
                </h4>
                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center w-full">
                  <span className="text-[11px] font-bold text-slate-500">
                    {t.problemCount} problem{t.problemCount === 1 ? "" : "s"}
                  </span>
                  <span className="text-[10px] font-bold text-[#7d9b76] group-hover:underline">
                    Start Practice →
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Class Test (CT) Questions Section */}
      <section className="rounded-[1.5rem] border border-[#dce5d4] bg-white p-6 shadow-[0_8px_24px_-16px_rgba(125,155,118,0.35)]">
        <header className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div>
            <h2 className="font-display text-2xl tracking-tight text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#7d9b76]" />
              Class Test (CT) Questions
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Access previous CT question papers to prepare for upcoming tests.</p>
          </div>

          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <button className="inline-flex items-center gap-1.5 px-3.5 h-8 rounded-full bg-[#7d9b76] text-white text-xs font-semibold hover:bg-[#6b8865] transition cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                Upload CT Paper
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px] rounded-[1.5rem] p-6 bg-white border border-[#dce5d4] shadow-lg data-[state=open]:animate-none data-[state=closed]:animate-none duration-0">
              <DialogHeader>
                <DialogTitle className="font-display text-xl text-slate-800">Upload CT Question Paper</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUploadSubmit} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <label htmlFor="title" className="text-xs font-semibold text-slate-600">
                    Title
                  </label>
                  <AppSelect
                    value={uploadTitle}
                    onValueChange={setUploadTitle}
                    options={[
                      { value: "Class Test 1", label: "Class Test 1" },
                      { value: "Class Test 2", label: "Class Test 2" },
                      { value: "Class Test 3", label: "Class Test 3" },
                      { value: "Class Test 4", label: "Class Test 4" },
                    ]}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="trimester" className="text-xs font-semibold text-slate-600">
                      Trimester
                    </label>
                    <AppSelect
                      value={uploadTrimester}
                      onValueChange={setUploadTrimester}
                      options={[
                        { value: "Spring", label: "Spring" },
                        { value: "Summer", label: "Summer" },
                        { value: "Fall", label: "Fall" },
                      ]}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="year" className="text-xs font-semibold text-slate-600">
                      Year
                    </label>
                    <input
                      id="year"
                      type="text"
                      required
                      placeholder="e.g. 2025"
                      value={uploadYear}
                      onChange={(e) => setUploadYear(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-[#dce5d4] focus:outline-none focus:ring-1 focus:ring-[#7d9b76] text-sm text-slate-800 bg-[#faf8f3]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="syllabus" className="text-xs font-semibold text-slate-600">
                    Syllabus / Topics covered
                  </label>
                  <input
                    id="syllabus"
                    type="text"
                    required
                    placeholder="e.g. Chapters 1-3, Recursion, Trees"
                    value={uploadSyllabus}
                    onChange={(e) => setUploadSyllabus(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#dce5d4] focus:outline-none focus:ring-1 focus:ring-[#7d9b76] text-sm text-slate-800 bg-[#faf8f3]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">
                    Question Paper File (PDF or Image)
                  </label>
                  <div className="flex items-center justify-center w-full">
                    <label
                      htmlFor="dropzone-file"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#dce5d4] rounded-2xl cursor-pointer bg-[#faf8f3] hover:bg-slate-50 transition"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 text-slate-400 mb-2" />
                        <p className="text-xs text-slate-500 font-semibold">
                          {selectedFile ? selectedFile.name : "Click to upload your paper"}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">PDF, PNG, or JPG (max. 10MB)</p>
                      </div>
                      <input
                        id="dropzone-file"
                        type="file"
                        accept="application/pdf,image/*"
                        className="hidden"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                </div>

                <DialogFooter className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUploadOpen(false);
                      setSelectedFile(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 rounded-full hover:bg-slate-100 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold bg-[#7d9b76] text-white rounded-full hover:bg-[#6b8865] transition cursor-pointer"
                  >
                    Upload Paper
                  </button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </header>

        {ctPapers.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">No CT question papers available.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ctPapers.map((paper) => (
              <div
                key={paper.id}
                className="flex items-start gap-3 rounded-2xl border border-[#dce5d4] bg-[#faf8f3] p-4 transition hover:bg-white hover:shadow-sm"
              >
                <div className="grid place-items-center w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="font-semibold text-sm text-slate-800">{paper.title}</h4>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#7d9b76]/15 text-[#7d9b76] uppercase tracking-wide">
                      {paper.trimester} '{paper.year.slice(2)}
                    </span>
                  </div>
                  {paper.syllabus && (
                    <p className="text-xs text-slate-500 mt-1.5">
                      <span className="font-semibold text-slate-600">Syllabus:</span> {paper.syllabus}
                    </p>
                  )}
                  <div className="mt-3.5 flex items-center justify-between text-[11px] text-slate-400">
                    <span>PDF · {paper.fileSize}</span>
                    <div className="flex items-center gap-3">
                      {profile.role === "admin" && (
                        <button
                          onClick={() => handleDeletePaper()}
                          className="inline-flex items-center gap-1 font-bold text-rose-600 hover:underline cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      )}
                      <button
                        onClick={() => handleDownload(paper)}
                        className="inline-flex items-center gap-1 font-bold text-[#7d9b76] hover:underline cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Mid & Final Questions Section */}
      <section className="rounded-[1.5rem] border border-[#dce5d4] bg-white p-6 shadow-[0_8px_24px_-16px_rgba(125,155,118,0.35)]">
        <header className="mb-4">
          <h2 className="font-display text-2xl tracking-tight text-slate-800 flex items-center gap-2">
            <Award className="w-5 h-5 text-[#7d9b76]" />
            Mid & Final Questions
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Review previous Mid trimester and Final trimester exam papers.</p>
        </header>

        <Tabs defaultValue="mid" className="space-y-4">
          <TabsList className="inline-flex h-9 items-center justify-start rounded-lg border border-[#dce5d4] p-0.5 bg-[#faf8f3] w-auto">
            <TabsTrigger
              value="mid"
              className="inline-flex items-center justify-center px-3 py-1 h-7 rounded-md text-xs font-semibold transition data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              Midterm Questions
            </TabsTrigger>
            <TabsTrigger
              value="final"
              className="inline-flex items-center justify-center px-3 py-1 h-7 rounded-md text-xs font-semibold transition data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              Final Questions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mid" className="mt-0 focus-visible:outline-none">
            {midPapers.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">No mid trimester exam papers available.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {midPapers.map((paper) => (
                  <div
                    key={paper.id}
                    className="flex items-start gap-3 rounded-2xl border border-[#dce5d4] bg-[#faf8f3] p-4 transition hover:bg-white hover:shadow-sm"
                  >
                    <div className="grid place-items-center w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 shrink-0">
                      <Award className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-semibold text-sm text-slate-800">{paper.title}</h4>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#7d9b76]/15 text-[#7d9b76] uppercase tracking-wide">
                          {paper.trimester} '{paper.year.slice(2)}
                        </span>
                      </div>
                      {paper.syllabus && (
                        <p className="text-xs text-slate-500 mt-1.5">
                          <span className="font-semibold text-slate-600">Coverage:</span> {paper.syllabus}
                        </p>
                      )}
                      <div className="mt-3.5 flex items-center justify-between text-[11px] text-slate-400">
                        <span>PDF · {paper.fileSize}</span>
                        <div className="flex items-center gap-3">
                          {profile.role === "admin" && (
                            <button
                              onClick={() => handleDeletePaper()}
                              className="inline-flex items-center gap-1 font-bold text-rose-600 hover:underline cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          )}
                          <button
                            onClick={() => handleDownload(paper)}
                            className="inline-flex items-center gap-1 font-bold text-[#7d9b76] hover:underline cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="final" className="mt-0 focus-visible:outline-none">
            {finalPapers.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">No final trimester exam papers available.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {finalPapers.map((paper) => (
                  <div
                    key={paper.id}
                    className="flex items-start gap-3 rounded-2xl border border-[#dce5d4] bg-[#faf8f3] p-4 transition hover:bg-white hover:shadow-sm"
                  >
                    <div className="grid place-items-center w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 shrink-0">
                      <Award className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-semibold text-sm text-slate-800">{paper.title}</h4>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#7d9b76]/15 text-[#7d9b76] uppercase tracking-wide">
                          {paper.trimester} '{paper.year.slice(2)}
                        </span>
                      </div>
                      {paper.syllabus && (
                        <p className="text-xs text-slate-500 mt-1.5">
                          <span className="font-semibold text-slate-600">Coverage:</span> {paper.syllabus}
                        </p>
                      )}
                      <div className="mt-3.5 flex items-center justify-between text-[11px] text-slate-400">
                        <span>PDF · {paper.fileSize}</span>
                        <div className="flex items-center gap-3">
                          {profile.role === "admin" && (
                            <button
                              onClick={() => handleDeletePaper()}
                              className="inline-flex items-center gap-1 font-bold text-rose-600 hover:underline cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          )}
                          <button
                            onClick={() => handleDownload(paper)}
                            className="inline-flex items-center gap-1 font-bold text-[#7d9b76] hover:underline cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
