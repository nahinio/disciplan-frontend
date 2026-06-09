import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronUp,
  Clock,
  Loader2,
  MessageCircle,
  PenSquare,
  Pencil,
  Flag,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { ReportModal } from "@/components/blogs/ReportModal";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import type { ForumTag } from "@/data/mockForum";
import { relativeTime } from "@/lib/blog";
import { AppSelect } from "@/components/ui/app-select";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { invalidateForumData } from "@/lib/invalidateAppData";
import { forumTagToType } from "@/lib/mappers";
import { useQuery } from "@tanstack/react-query";
import { useForumFeed, useForumThreadDetail, useForumThreads } from "@/hooks/useForumThreads";
import { useUserStats } from "@/hooks/useUserStats";
import { ForumReplyThread } from "@/components/forum/ForumReplyThread";
import { RefreshButton } from "@/components/ui/refresh-button";
import { usePageRefresh } from "@/hooks/usePageRefresh";

const TAG_STYLES: Record<ForumTag, string> = {
  Doubt: "bg-amber-50 text-amber-800 border-amber-200",
  Advice: "bg-sky-50 text-sky-800 border-sky-200",
  Resource: "bg-emerald-50 text-emerald-800 border-emerald-200",
  Discussion: "bg-violet-50 text-violet-800 border-violet-200",
};

const TAG_ACTIVE: Record<ForumTag, string> = {
  Doubt: "bg-amber-500 text-white border-amber-500 shadow-sm",
  Advice: "bg-sky-500 text-white border-sky-500 shadow-sm",
  Resource: "bg-emerald-600 text-white border-emerald-600 shadow-sm",
  Discussion: "bg-violet-500 text-white border-violet-500 shadow-sm",
};

type GlobalForumTag = "Advice" | "Resource" | "Discussion";
type FilterTag = "All" | ForumTag;
type GlobalFilterTag = "All" | GlobalForumTag;

const COURSE_FILTERS: FilterTag[] = ["All", "Doubt", "Advice", "Resource", "Discussion"];
const GLOBAL_FILTERS: GlobalFilterTag[] = ["All", "Advice", "Resource", "Discussion"];
const GLOBAL_COMPOSER_TAGS: GlobalForumTag[] = ["Advice", "Resource", "Discussion"];

const FILTER_LABEL: Record<string, string> = {
  All: "All",
  Doubt: "Doubts",
  Advice: "Advice",
  Resource: "Resources",
  Discussion: "Discussion",
};

const ROLE_DOT: Record<"student" | "cr" | "faculty", string> = {
  student: "bg-[#7d9b76]",
  cr: "bg-sky-500",
  faculty: "bg-rose-500",
};

type ViewTab = "all" | "mine";

export function ForumWorkspace({
  mode,
  courseCode: fixedCourseCode,
}: {
  mode: "global" | "course";
  courseCode?: string;
}) {
  const isGlobal = mode === "global";
  const qc = useQueryClient();
  const { profile } = useUserStats();
  const [courseFilter, setCourseFilter] = useState("");
  const [viewTab, setViewTab] = useState<ViewTab>("all");
  const [filter, setFilter] = useState<string>("All");
  const [sort, setSort] = useState<"Recent" | "Top">("Recent");

  const apiThreadType =
    filter === "All"
      ? undefined
      : filter.toLowerCase();
  const mineOnly = viewTab === "mine";

  const feedQuery = useForumFeed({
    courseCode: isGlobal ? courseFilter || undefined : undefined,
    threadType: apiThreadType,
    sort: sort === "Top" ? "top" : "recent",
    mineOnly,
  });
  const courseQuery = useForumThreads(fixedCourseCode ?? "", {
    threadType: apiThreadType,
    mineOnly,
  });
  const threadQuery = isGlobal ? feedQuery : courseQuery;
  const { threads: all, loading, isError: threadsError, refresh: refreshThreads } = threadQuery;

  const coursesQuery = useQuery({
    queryKey: ["courses", "forum-picker"],
    queryFn: () => api.getCourses(),
    enabled: isGlobal,
  });
  const courseOptions = useMemo(() => {
    const items = (coursesQuery.data?.items ?? []) as { course_code: string; title?: string }[];
    const seen = new Set<string>();
    return items.filter((c) => {
      const code = String(c.course_code ?? "");
      if (!code || seen.has(code)) return false;
      seen.add(code);
      return true;
    });
  }, [coursesQuery.data]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [userVotes, setUserVotes] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState({ total: 0, open_doubts: 0 });

  const selectedNumericId = selectedThreadId ? Number(selectedThreadId) : null;
  const { thread: selectedDetail, replies, refresh: refreshDetail } =
    useForumThreadDetail(selectedNumericId);

  const syncForumCaches = async (course?: string) => {
    await invalidateForumData(qc, course ?? fixedCourseCode);
    await refreshThreads();
    if (selectedNumericId) await refreshDetail();
  };

  const { refresh: refreshForum, isRefreshing: forumRefreshing } = usePageRefresh(syncForumCaches);

  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [postCourseCode, setPostCourseCode] = useState(fixedCourseCode ?? "");
  const [newTag, setNewTag] = useState<ForumTag | GlobalForumTag>(
    isGlobal ? "Advice" : "Doubt"
  );
  const [posting, setPosting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [isEditingThread, setIsEditingThread] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (isGlobal || !fixedCourseCode) return;
    void api.getForumStats(fixedCourseCode).then((s) => {
      setStats({
        total: Number(s.total ?? 0),
        open_doubts: Number(s.open_doubts ?? 0),
      });
    }).catch(() => {});
  }, [fixedCourseCode, isGlobal, all.length]);

  useEffect(() => {
    const votes: Record<string, boolean> = {};
    all.forEach((t) => {
      if (t.viewerHasUpvoted) votes[t.id] = true;
    });
    setUserVotes(votes);
  }, [all]);

  useEffect(() => {
    setIsEditingThread(false);
    setEditTitle("");
    setEditBody("");
  }, [selectedThreadId]);

  const threads = useMemo(() => {
    if (isGlobal) return all;
    return [...all].sort((a, b) =>
      sort === "Recent"
        ? b.lastActivity.getTime() - a.lastActivity.getTime()
        : b.upvotes - a.upvotes
    );
  }, [all, isGlobal, sort]);

  const handleVote = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const id = Number(threadId);
    if (!Number.isFinite(id)) return;
    try {
      if (userVotes[threadId]) {
        await api.voteForumThread(id, "down");
        setUserVotes((prev) => ({ ...prev, [threadId]: false }));
      } else {
        await api.voteForumThread(id, "up");
        setUserVotes((prev) => ({ ...prev, [threadId]: true }));
      }
      await syncForumCaches();
    } catch {
      toast.error("Could not register vote");
    }
  };

  const resetComposer = () => {
    setNewTitle("");
    setNewBody("");
    setNewTag(isGlobal ? "Advice" : "Doubt");
    setPostCourseCode(fixedCourseCode ?? "");
    setIsComposerOpen(false);
  };

  const handleAskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newBody.trim()) return;
    const targetCourse = isGlobal ? postCourseCode : fixedCourseCode;
    if (!targetCourse) {
      toast.error("Select a course for your post.");
      return;
    }

    setPosting(true);
    try {
      const res = await api.createForumThread(targetCourse, {
        title: newTitle.trim(),
        body: newBody.trim(),
        thread_type_code: forumTagToType(newTag),
        image_file_ids: [],
      });
      resetComposer();
      await syncForumCaches(targetCourse);
      setSelectedThreadId(String(res.id));
      toast.success("Posted to the forum!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not post");
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteThread = async () => {
    if (!selectedNumericId) return;
    if (!confirm("Delete your post? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await api.deleteForumThread(selectedNumericId);
      setSelectedThreadId(null);
      setIsEditingThread(false);
      await syncForumCaches();
      toast.success("Post deleted.");
    } catch {
      toast.error("Could not delete post.");
    } finally {
      setDeleting(false);
    }
  };

  const startEditThread = () => {
    if (!selectedThread) return;
    setEditTitle(selectedThread.title);
    setEditBody(selectedThread.body);
    setIsEditingThread(true);
  };

  const cancelEditThread = () => {
    setIsEditingThread(false);
    setEditTitle("");
    setEditBody("");
  };

  const handleSaveEdit = async () => {
    if (!selectedNumericId || !editTitle.trim() || !editBody.trim()) return;
    setSavingEdit(true);
    try {
      await api.updateForumThread(selectedNumericId, {
        title: editTitle.trim(),
        body: editBody.trim(),
      });
      setIsEditingThread(false);
      await syncForumCaches();
      toast.success("Post updated.");
    } catch {
      toast.error("Could not update post.");
    } finally {
      setSavingEdit(false);
    }
  };

  const selectedThread = all.find((t) => t.id === selectedThreadId) ?? selectedDetail;
  const isOwnThread =
    selectedThread && profile.id > 0 && selectedThread.authorUserId === profile.id;
  const canEditThread = isOwnThread;
  const canDeleteThread =
    selectedThread &&
    profile.id > 0 &&
    (selectedThread.authorUserId === profile.id || profile.role === "admin");

  const canReportThread =
    selectedThread &&
    profile.id > 0 &&
    selectedThread.authorUserId !== profile.id &&
    profile.role !== "admin";

  return (
    <>
      <div
        className={cn(
          "grid gap-6 transition-all duration-300",
          selectedThreadId ? "grid-cols-1 lg:grid-cols-12" : "grid-cols-1"
        )}
      >
        <section
          className={cn(
            "rounded-[1.5rem] border border-[#dce5d4] bg-white shadow-[0_8px_32px_-20px_rgba(125,155,118,0.45)] transition-all flex flex-col overflow-hidden",
            selectedThreadId ? "lg:col-span-5 h-[min(780px,85vh)]" : "w-full"
          )}
        >
          <header className="px-5 pt-5 pb-4 border-b border-[#eef2e8] bg-gradient-to-br from-[#fafcf8] to-white shrink-0">
            {threadsError && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 flex items-center justify-between gap-3">
                <span>Could not load forum posts. The API may be waking up — try again.</span>
                <button
                  type="button"
                  onClick={() => void refreshThreads()}
                  className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-amber-700"
                >
                  Retry
                </button>
              </div>
            )}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-rose-600">
                  {isGlobal ? "Community" : "Course Q&A"}
                </p>
                <h2 className="font-display text-2xl tracking-tight text-slate-800 mt-0.5">
                  {isGlobal ? "Forum" : "Discussion Forum"}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {isGlobal
                    ? "Share advice, resources, and discussions across your courses."
                    : "Ask doubts, share resources — upvote helpful posts."}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <RefreshButton onClick={refreshForum} loading={forumRefreshing || loading} />
                <button
                  type="button"
                  onClick={() => (isComposerOpen ? resetComposer() : setIsComposerOpen(true))}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-4 h-9 rounded-full text-xs font-semibold transition cursor-pointer",
                    isComposerOpen
                      ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      : "bg-[#7d9b76] text-white hover:bg-[#6b8865] shadow-sm"
                  )}
                >
                  <PenSquare className="w-3.5 h-3.5" />
                  {isComposerOpen ? "Cancel" : "New post"}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-4">
              {isGlobal ? (
                <AppSelect
                  size="xs"
                  value={courseFilter}
                  onValueChange={setCourseFilter}
                  placeholder="All courses"
                  options={[
                    { value: "", label: "All courses" },
                    ...courseOptions.map((c) => ({
                      value: c.course_code,
                      label: `${c.course_code}${c.title ? ` — ${c.title}` : ""}`,
                    })),
                  ]}
                />
              ) : (
                <>
                  <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-white border border-[#dce5d4] text-[11px] font-semibold text-slate-600">
                    <MessageCircle className="w-3 h-3 text-[#7d9b76]" />
                    {stats.total} threads
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-800">
                    {stats.open_doubts} open doubts
                  </span>
                </>
              )}
              <div className="ml-auto inline-flex items-center rounded-full border border-[#dce5d4] p-0.5 bg-white">
                {(["Recent", "Top"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSort(s)}
                    className={cn(
                      "inline-flex items-center gap-1 px-2.5 h-7 rounded-full text-[11px] font-semibold transition",
                      sort === s
                        ? "bg-[#f5f8f2] text-slate-800 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    {s === "Recent" ? <Clock className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </header>

          <AnimatePresence>
            {isComposerOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden shrink-0 border-b border-[#eef2e8]"
              >
                <form onSubmit={(e) => void handleAskSubmit(e)} className="p-5 space-y-4 bg-[#fafcf8]">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Tag
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(isGlobal ? GLOBAL_COMPOSER_TAGS : COURSE_FILTERS.filter((f) => f !== "All")).map(
                        (tagOption) => (
                          <button
                            key={tagOption}
                            type="button"
                            onClick={() => setNewTag(tagOption as ForumTag)}
                            className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition",
                              newTag === tagOption
                                ? TAG_ACTIVE[tagOption as ForumTag]
                                : cn(TAG_STYLES[tagOption as ForumTag], "hover:opacity-90")
                            )}
                          >
                            {tagOption}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {isGlobal && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Course
                      </p>
                      <AppSelect
                        value={postCourseCode}
                        onValueChange={setPostCourseCode}
                        placeholder="Select a course…"
                        options={[
                          { value: "", label: "Select a course…", disabled: true },
                          ...courseOptions.map((c) => ({
                            value: c.course_code,
                            label: `${c.course_code}${c.title ? ` — ${c.title}` : ""}`,
                          })),
                        ]}
                      />
                    </div>
                  )}

                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Title — what's your question about?"
                    className="w-full h-10 px-3 rounded-xl border border-[#dce5d4] bg-white focus:outline-none focus:ring-2 focus:ring-[#7d9b76]/30 text-sm text-slate-800"
                  />

                  <textarea
                    required
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                    placeholder="Share context, what you've tried, or your discussion topic…"
                    rows={4}
                    className="w-full p-3 rounded-xl border border-[#dce5d4] bg-white focus:outline-none focus:ring-2 focus:ring-[#7d9b76]/30 text-sm text-slate-800 resize-none"
                  />

                  <div className="flex items-center justify-end pt-1">
                    <button
                      type="submit"
                      disabled={posting}
                      className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-rose-600 text-white rounded-full hover:bg-rose-700 transition disabled:opacity-60"
                    >
                      {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      {posting ? "Posting…" : "Post"}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="px-5 py-3 border-b border-[#eef2e8] flex flex-wrap items-center gap-2 shrink-0">
            <div className="inline-flex items-center rounded-full border border-[#dce5d4] p-0.5 bg-white mr-1">
              {(["all", "mine"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setViewTab(tab)}
                  className={cn(
                    "px-3 h-7 rounded-full text-[11px] font-semibold transition",
                    viewTab === tab
                      ? "bg-slate-800 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {tab === "all" ? "All posts" : "My posts"}
                </button>
              ))}
            </div>
            {(isGlobal ? GLOBAL_FILTERS : COURSE_FILTERS).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 h-7 rounded-full text-[11px] font-semibold transition border",
                  filter === f
                    ? f === "All"
                      ? "bg-slate-800 text-white border-slate-800"
                      : TAG_ACTIVE[f as ForumTag]
                    : "bg-white text-slate-600 border-[#dce5d4] hover:border-[#7d9b76]/50"
                )}
              >
                {FILTER_LABEL[f]}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar px-2">
            {loading && all.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                Loading forum…
              </div>
            ) : threads.length === 0 ? (
              <div className="py-14 text-center px-4">
                <p className="text-sm text-slate-500">
                  {viewTab === "mine"
                    ? "You haven't posted here yet."
                    : "No posts in this filter yet."}
                </p>
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(true)}
                  className="mt-3 text-xs font-semibold text-rose-600 hover:underline"
                >
                  Start the conversation
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-[#eef2e8]">
                {threads.map((t) => (
                  <li
                    key={t.id}
                    onClick={() => setSelectedThreadId(t.id)}
                    className={cn(
                      "flex items-start gap-3 py-3.5 px-3 mx-1 cursor-pointer group/row transition-all rounded-xl",
                      selectedThreadId === t.id
                        ? "bg-[#7d9b76]/8 ring-1 ring-[#7d9b76]/20"
                        : "hover:bg-[#fafcf8]"
                    )}
                  >
                    <div className="relative shrink-0 w-9 flex flex-col items-center pt-0.5">
                      <button
                        type="button"
                        onClick={(e) => void handleVote(t.id, e)}
                        className={cn(
                          "grid place-items-center w-7 h-7 rounded-lg transition",
                          userVotes[t.id]
                            ? "text-rose-600 bg-rose-50"
                            : "text-slate-400 hover:bg-[#f5f8f2] hover:text-[#7d9b76]"
                        )}
                        aria-label="Upvote"
                      >
                        <ChevronUp
                          className={cn("w-4 h-4", userVotes[t.id] && "fill-current scale-110")}
                        />
                      </button>
                      <span
                        className={cn(
                          "text-[11px] font-bold tabular-nums",
                          userVotes[t.id] ? "text-rose-600" : "text-slate-600"
                        )}
                      >
                        {t.upvotes}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0",
                            TAG_STYLES[t.tag]
                          )}
                        >
                          {t.tag}
                        </span>
                        {isGlobal && t.courseCode && (
                          <span className="text-[9px] font-mono font-bold text-rose-600 shrink-0">
                            {t.courseCode}
                          </span>
                        )}
                        <p className="text-sm font-semibold text-slate-800 group-hover/row:text-[#5d7a56] truncate">
                          {t.title}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {t.body}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <span
                            className={cn(
                              "grid place-items-center w-5 h-5 rounded-full text-white text-[8px] font-bold",
                              ROLE_DOT[t.author.role]
                            )}
                          >
                            {t.author.initials}
                          </span>
                          <span className="font-medium text-slate-600 truncate max-w-[100px]">
                            {t.author.name}
                          </span>
                        </span>
                        <span>·</span>
                        <span>{relativeTime(t.lastActivity)}</span>
                        {t.resolved && (
                          <>
                            <span>·</span>
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 inline" />
                          </>
                        )}
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 shrink-0 pt-1">
                      <MessageCircle className="w-3.5 h-3.5 text-[#7d9b76]" />
                      {t.replies}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {selectedThread && selectedNumericId && (
          <motion.section
            key={selectedThread.id}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="lg:col-span-7 rounded-[1.5rem] border border-[#dce5d4] bg-white shadow-[0_8px_32px_-20px_rgba(125,155,118,0.45)] flex flex-col h-[min(780px,85vh)] min-w-0 overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-[#eef2e8] bg-gradient-to-br from-white to-[#fafcf8] shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border",
                      TAG_STYLES[selectedThread.tag]
                    )}
                  >
                    {selectedThread.tag}
                  </span>
                  {selectedThread.resolved && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> Resolved
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {canReportThread && (
                    <button
                      type="button"
                      onClick={() => setReportOpen(true)}
                      className="inline-flex items-center gap-1 px-2.5 h-8 rounded-full text-[11px] font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      Report
                    </button>
                  )}
                  {canEditThread && !isEditingThread && (
                    <button
                      type="button"
                      onClick={startEditThread}
                      className="inline-flex items-center gap-1 px-2.5 h-8 rounded-full text-[11px] font-semibold text-slate-500 hover:text-[#7d9b76] hover:bg-[#f5f8f2] transition"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </button>
                  )}
                  {canDeleteThread && (
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={() => void handleDeleteThread()}
                      className="inline-flex items-center gap-1 px-2.5 h-8 rounded-full text-[11px] font-semibold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {deleting ? "…" : "Delete"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedThreadId(null)}
                    className="w-8 h-8 grid place-items-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                    aria-label="Close thread"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-5 space-y-6">
              <article>
                {isEditingThread ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-[#dce5d4] bg-white text-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7d9b76]/30"
                    />
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={8}
                      className="w-full p-3 rounded-xl border border-[#dce5d4] bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7d9b76]/30 resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={cancelEditThread}
                        className="px-4 h-8 rounded-full text-xs font-semibold text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={savingEdit || !editTitle.trim() || !editBody.trim()}
                        onClick={() => void handleSaveEdit()}
                        className="inline-flex items-center gap-1.5 px-4 h-8 rounded-full bg-[#7d9b76] text-white text-xs font-semibold disabled:opacity-50"
                      >
                        {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="font-display text-xl font-bold text-slate-800 leading-snug tracking-tight">
                      {selectedThread.title}
                    </h3>
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                      <span
                        className={cn(
                          "grid place-items-center w-6 h-6 rounded-full text-white text-[9px] font-bold",
                          ROLE_DOT[selectedThread.author.role]
                        )}
                      >
                        {selectedThread.author.initials}
                      </span>
                      <span className="font-semibold text-slate-700">{selectedThread.author.name}</span>
                      {isGlobal && selectedThread.courseCode && (
                        <>
                          <span>·</span>
                          <span className="font-mono font-bold text-rose-600">{selectedThread.courseCode}</span>
                        </>
                      )}
                      <span>·</span>
                      <span>{relativeTime(selectedThread.lastActivity)}</span>
                    </div>
                    <div className="mt-4 text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                      {selectedThread.body}
                    </div>
                  </>
                )}
              </article>

              <div className="border-t border-[#eef2e8] pt-5">
                <ForumReplyThread
                  threadId={selectedNumericId}
                  replies={replies}
                  currentUserId={profile.id}
                  isAdmin={profile.role === "admin"}
                  onRefresh={async () => {
                    await refreshDetail();
                    await refreshThreads();
                  }}
                />
              </div>
            </div>
          </motion.section>
        )}
      </div>

      {selectedNumericId && (
        <ReportModal
          isOpen={reportOpen}
          onClose={() => setReportOpen(false)}
          itemType="post"
          onSubmit={async (reason, details) => {
            try {
              await api.submitContentReport({
                entity_type_code: "forum_thread",
                entity_id: selectedNumericId,
                reason_code: reason,
                notes: details.trim() || undefined,
              });
              toast.success("Report submitted for moderation.");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Could not submit report.");
            }
          }}
        />
      )}

    </>
  );
}
