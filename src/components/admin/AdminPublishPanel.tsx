import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Brain,
  FileText,
  ImagePlus,
  Layers,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, api } from "@/lib/api";
import { invalidateCourseContent } from "@/lib/invalidateAppData";
import { importBlogFile } from "@/lib/blogImport";
import { parseMarkdownToHTML } from "@/lib/blogImport";
import { importPracticeFieldFile } from "@/lib/practiceImport";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { useAdmin } from "@/hooks/useAdmin";
import {
  AdminLoading,
  AdminPageHeader,
  EmptyState,
  adminBtnPrimary,
  adminBtnSecondary,
  adminCard,
  adminInput,
  adminSelect,
  adminTextarea,
} from "./admin-ui";
import { AppSelect } from "@/components/ui/app-select";

type AdminData = ReturnType<typeof useAdmin>;
type Action = "topic" | "blog" | "practice";

interface CourseStat {
  id: number;
  code: string;
  title: string;
  department_code: string;
  department_name: string;
  topic_count: number;
  blog_count: number;
  problem_count: number;
}

interface Topic {
  id: number;
  title: string;
  problem_count?: number;
  blog_count?: number;
}

const adminFieldLabel =
  "block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5";

const adminDialogContent =
  "rounded-2xl border border-[#dce5d4] bg-white shadow-xl max-w-md";

function parseCommaTags(input: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of input.split(",")) {
    const tag = part.trim();
    if (!tag || tag.length > 80) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= 20) break;
  }
  return out;
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function toStoredHtml(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (/<[a-z][\s\S]*>/i.test(trimmed)) return trimmed;
  return parseMarkdownToHTML(trimmed);
}

export function AdminPublishPanel({ admin }: { admin: AdminData }) {
  const qc = useQueryClient();
  const { courses, loading, createBlogPost } = admin;
  const [stats, setStats] = useState<CourseStat[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [selectedCourse, setSelectedCourse] = useState<CourseStat | null>(null);
  const [action, setAction] = useState<Action | null>(null);

  const [newTopic, setNewTopic] = useState("");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
  const [problemText, setProblemText] = useState("");
  const [solutionText, setSolutionText] = useState("");
  const [practiceTags, setPracticeTags] = useState("");
  const [practiceSaving, setPracticeSaving] = useState(false);
  const [questionImageFile, setQuestionImageFile] = useState<File | null>(null);
  const [questionImagePreview, setQuestionImagePreview] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<"problem" | "solution" | null>(null);
  const [importingField, setImportingField] = useState<"problem" | "solution" | null>(null);
  const [editingTopicId, setEditingTopicId] = useState<number | null>(null);
  const [editingTopicTitle, setEditingTopicTitle] = useState("");
  const [topicSavingId, setTopicSavingId] = useState<number | null>(null);
  const [deleteTopicTarget, setDeleteTopicTarget] = useState<Topic | null>(null);
  const [deletingTopic, setDeletingTopic] = useState(false);

  const [pubTopicId, setPubTopicId] = useState<number | "">("");
  const [pubTags, setPubTags] = useState("");
  const [pubTitle, setPubTitle] = useState("");
  const [pubExcerpt, setPubExcerpt] = useState("");
  const [pubBody, setPubBody] = useState("");
  const [pubCoverFile, setPubCoverFile] = useState<File | null>(null);
  const [pubCoverPreview, setPubCoverPreview] = useState<string | null>(null);
  const [pubPublishing, setPubPublishing] = useState(false);
  const pubFileRef = useRef<HTMLInputElement>(null);
  const pubCoverRef = useRef<HTMLInputElement>(null);

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const res = await api.adminCatalogContentStats();
      setStats(
        (res.items as Record<string, unknown>[]).map((r) => ({
          id: Number(r.id),
          code: String(r.code),
          title: String(r.title),
          department_code: String(r.department_code ?? ""),
          department_name: String(r.department_name ?? ""),
          topic_count: Number(r.topic_count ?? 0),
          blog_count: Number(r.blog_count ?? 0),
          problem_count: Number(r.problem_count ?? 0),
        }))
      );
    } catch {
      setStats([]);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    void loadStats();
  }, []);

  const departments = useMemo(() => {
    const codes = new Map<string, string>();
    for (const c of stats) {
      if (c.department_code) codes.set(c.department_code, c.department_name || c.department_code);
    }
    return Array.from(codes.entries()).map(([code, name]) => ({ code, name }));
  }, [stats]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stats.filter((c) => {
      if (deptFilter !== "all" && c.department_code !== deptFilter) return false;
      if (!q) return true;
      return (
        c.code.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.department_code.toLowerCase().includes(q)
      );
    });
  }, [stats, search, deptFilter]);

  const loadTopics = async (code: string) => {
    setTopicsLoading(true);
    try {
      const res = await api.getPracticeTopics(code);
      const items = (res.items as Record<string, unknown>[]).map((t) => ({
        id: Number(t.id),
        title: String(t.topic ?? t.title ?? ""),
        problem_count: Number(t.problem_count ?? 0),
        blog_count: Number(t.blog_count ?? 0),
      }));
      setTopics(items);
      setPubTopicId("");
      setSelectedTopic(items[0]?.id ?? null);
    } catch {
      setTopics([]);
      setPubTopicId("");
      setSelectedTopic(null);
    } finally {
      setTopicsLoading(false);
    }
  };

  const openAction = (course: CourseStat, next: Action) => {
    setSelectedCourse(course);
    setAction(next);
    void loadTopics(course.code);
  };

  const backToGrid = () => {
    setSelectedCourse(null);
    setAction(null);
    setNewTopic("");
    setProblemText("");
    setSolutionText("");
    setPubTopicId("");
    setPubTags("");
    setPubTitle("");
    setPubExcerpt("");
    setPubBody("");
    setPubCoverFile(null);
    setPubCoverPreview(null);
    void loadStats();
  };

  const addTopic = async () => {
    if (!selectedCourse || !newTopic.trim()) return;
    try {
      await api.createPracticeTopic(selectedCourse.code, { title: newTopic.trim() });
      invalidateCourseContent(qc, selectedCourse.code);
      toast.success("Topic added.");
      setNewTopic("");
      await loadTopics(selectedCourse.code);
      await loadStats();
    } catch {
      toast.error("Could not add topic.");
    }
  };

  const startEditTopic = (topic: Topic) => {
    setEditingTopicId(topic.id);
    setEditingTopicTitle(topic.title);
  };

  const cancelEditTopic = () => {
    setEditingTopicId(null);
    setEditingTopicTitle("");
  };

  const saveEditTopic = async () => {
    if (!selectedCourse || editingTopicId == null || !editingTopicTitle.trim()) return;
    setTopicSavingId(editingTopicId);
    try {
      await api.adminUpdateTopic(selectedCourse.code, editingTopicId, {
        title: editingTopicTitle.trim(),
      });
      toast.success("Topic updated.");
      cancelEditTopic();
      await loadTopics(selectedCourse.code);
    } catch {
      toast.error("Could not update topic.");
    } finally {
      setTopicSavingId(null);
    }
  };

  const confirmDeleteTopic = async () => {
    if (!selectedCourse || !deleteTopicTarget) return;
    setDeletingTopic(true);
    try {
      const res = await api.adminDeleteTopic(selectedCourse.code, deleteTopicTarget.id);
      toast.success(
        `Topic deleted (${res.blogs_deleted} blog${res.blogs_deleted === 1 ? "" : "s"}, ${res.problems_deleted} problem${res.problems_deleted === 1 ? "" : "s"} removed).`
      );
      invalidateCourseContent(qc, selectedCourse.code);
      setDeleteTopicTarget(null);
      if (selectedTopic === deleteTopicTarget.id) setSelectedTopic(null);
      if (pubTopicId === deleteTopicTarget.id) setPubTopicId("");
      await loadTopics(selectedCourse.code);
      await loadStats();
    } catch {
      toast.error("Could not delete topic.");
    } finally {
      setDeletingTopic(false);
    }
  };

  const importFieldDoc = async (field: "problem" | "solution", file: File) => {
    setImportingField(field);
    try {
      const html = await importPracticeFieldFile(file);
      const plain = htmlToPlainText(html);
      if (field === "problem") setProblemText(plain);
      else setSolutionText(plain);
      toast.success(
        field === "problem" ? "Problem filled from file." : "Solution filled from file."
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not import file.");
    } finally {
      setImportingField(null);
    }
  };

  const onQuestionImage = (file: File | null) => {
    setQuestionImageFile(file);
    if (questionImagePreview) URL.revokeObjectURL(questionImagePreview);
    setQuestionImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const addProblem = async () => {
    if (!selectedCourse || !selectedTopic || !problemText.trim() || !solutionText.trim()) {
      toast.error("Select a topic and add problem + solution.");
      return;
    }
    setPracticeSaving(true);
    try {
      let question_image_file_id: number | undefined;
      if (questionImageFile) {
        const uploaded = await api.uploadFile(questionImageFile, "practice-problems");
        question_image_file_id = uploaded.file_id;
      }
      const tags = parseCommaTags(practiceTags);
      await api.createPracticeProblem(selectedCourse.code, {
        topic_id: selectedTopic,
        question: toStoredHtml(problemText),
        answer: toStoredHtml(solutionText),
        ...(tags.length > 0 ? { tags } : {}),
        ...(question_image_file_id != null ? { question_image_file_id } : {}),
      });
      invalidateCourseContent(qc, selectedCourse.code);
      toast.success("Practice problem saved.");
      setProblemText("");
      setSolutionText("");
      setPracticeTags("");
      onQuestionImage(null);
      await loadTopics(selectedCourse.code);
      await loadStats();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save problem.");
    } finally {
      setPracticeSaving(false);
    }
  };

  const publishBlog = async () => {
    if (!selectedCourse || !pubTitle.trim() || !pubBody.trim()) {
      toast.error("Title and body are required.");
      return;
    }
    setPubPublishing(true);
    try {
      let cover_image_file_id: number | undefined;
      if (pubCoverFile) {
        const uploaded = await api.uploadFile(pubCoverFile, "blog-covers");
        cover_image_file_id = uploaded.file_id;
      }
      const tags = parseCommaTags(pubTags);
      await createBlogPost({
        course_code: selectedCourse.code,
        ...(pubTopicId ? { topic_id: Number(pubTopicId) } : {}),
        title: pubTitle.trim(),
        excerpt: (pubExcerpt.trim() || pubTitle.trim().slice(0, 120)).slice(0, 500),
        body_html: pubBody.trim(),
        read_time_min: 5,
        ...(tags.length > 0 ? { tags } : {}),
        ...(cover_image_file_id != null ? { cover_image_file_id } : {}),
      });
      invalidateCourseContent(qc, selectedCourse.code);
      toast.success("Blog published.");
      setPubTopicId("");
      setPubTags("");
      setPubTitle("");
      setPubExcerpt("");
      setPubBody("");
      setPubCoverFile(null);
      setPubCoverPreview(null);
      await loadStats();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not publish blog.";
      toast.error(message);
    } finally {
      setPubPublishing(false);
    }
  };

  if (loading && courses.length === 0) return <AdminLoading />;

  if (selectedCourse && action) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={backToGrid}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-rose-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to catalog
        </button>

        <AdminPageHeader
          eyebrow="Publish content"
          title={selectedCourse.code}
          description={selectedCourse.title}
        />

        <div className="flex flex-wrap gap-2">
          {(["topic", "blog", "practice"] as Action[]).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => {
                setAction(a);
                void loadTopics(selectedCourse.code);
              }}
              className={
                action === a
                  ? "px-4 py-2 rounded-full bg-rose-600 text-white text-xs font-bold"
                  : "px-4 py-2 rounded-full border border-[#dce5d4] text-xs font-semibold text-slate-600 hover:border-[#7d9b76]"
              }
            >
              {a === "topic" ? "Add topic" : a === "blog" ? "Add blog" : "Add practice"}
            </button>
          ))}
        </div>

        {action === "topic" && (
          <div className={adminCard + " p-5 space-y-4 max-w-xl"}>
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-rose-600" />
              Syllabus topic
            </h3>
            <div className="flex gap-2">
              <input
                className={adminInput}
                placeholder="Topic title"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void addTopic()}
              />
              <button type="button" onClick={() => void addTopic()} className={adminBtnPrimary}>
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {topicsLoading ? (
              <AdminLoading label="Loading topics…" />
            ) : topics.length === 0 ? (
              <EmptyState message="No topics yet — add your first one above." />
            ) : (
              <ul className="space-y-2">
                {topics.map((t) => (
                  <li
                    key={t.id}
                    className="px-3 py-2 rounded-xl border border-[#dce5d4] bg-[#fafcf8] text-sm text-slate-700"
                  >
                    {editingTopicId === t.id ? (
                      <div className="flex gap-2 items-center">
                        <input
                          className={adminInput + " flex-1 h-9 text-sm"}
                          value={editingTopicTitle}
                          onChange={(e) => setEditingTopicTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void saveEditTopic();
                            if (e.key === "Escape") cancelEditTopic();
                          }}
                          autoFocus
                        />
                        <button
                          type="button"
                          disabled={topicSavingId === t.id}
                          onClick={() => void saveEditTopic()}
                          className={adminBtnPrimary + " h-9 px-3 text-xs"}
                        >
                          {topicSavingId === t.id ? "…" : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditTopic}
                          className={adminBtnSecondary + " h-9 px-3 text-xs"}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-medium">{t.title}</span>
                          <span className="text-xs text-slate-400 ml-2">
                            {t.blog_count ?? 0} blogs · {t.problem_count ?? 0} problems
                          </span>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEditTopic(t)}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-[#dce5d4] text-slate-500 hover:text-rose-600 hover:border-rose-200"
                            aria-label="Edit topic"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTopicTarget(t)}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                            aria-label="Delete topic"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {action === "blog" && (
          <div className={adminCard + " p-5 space-y-4 max-w-2xl"}>
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-rose-600" />
              Official blog post
            </h3>
            <div>
              <label className={adminFieldLabel}>Topic (optional)</label>
              <AppSelect
                className={adminSelect}
                value={pubTopicId !== "" ? String(pubTopicId) : ""}
                onValueChange={(v) => setPubTopicId(v ? Number(v) : "")}
                disabled={topicsLoading}
                placeholder="No topic"
                options={[
                  { value: "", label: "No topic" },
                  ...topics.map((t) => ({ value: String(t.id), label: t.title })),
                ]}
              />
            </div>
            <div>
              <label className={adminFieldLabel}>Tags (comma separated)</label>
              <input
                className={adminInput}
                placeholder="e.g. midterm, algorithms, week 3"
                value={pubTags}
                onChange={(e) => setPubTags(e.target.value)}
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Add up to 20 tags. Separate each with a comma.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <input
                ref={pubFileRef}
                type="file"
                accept=".docx,.md,.markdown"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  void importBlogFile(file)
                    .then(({ html, title }) => {
                      setPubTitle(title);
                      setPubBody(html);
                      const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
                      setPubExcerpt(plain.slice(0, 120));
                    })
                    .catch((err) => toast.error(String(err)));
                }}
              />
              <button
                type="button"
                onClick={() => pubFileRef.current?.click()}
                className={adminBtnSecondary + " h-10 text-xs gap-2"}
              >
                <Upload className="w-4 h-4" />
                Import .docx / .md
              </button>
            </div>
            <input
              className={adminInput}
              placeholder="Title"
              value={pubTitle}
              onChange={(e) => setPubTitle(e.target.value)}
            />
            <input
              className={adminInput}
              placeholder="Excerpt"
              value={pubExcerpt}
              onChange={(e) => setPubExcerpt(e.target.value)}
            />
            <textarea
              className={adminTextarea}
              rows={8}
              placeholder="Body"
              value={pubBody}
              onChange={(e) => setPubBody(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <input
                ref={pubCoverRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setPubCoverFile(file);
                  setPubCoverPreview(URL.createObjectURL(file));
                }}
              />
              <button
                type="button"
                onClick={() => pubCoverRef.current?.click()}
                className={adminBtnSecondary + " h-9 text-xs gap-2"}
              >
                <ImagePlus className="w-4 h-4" />
                Cover image
              </button>
              {pubCoverPreview && (
                <img src={pubCoverPreview} alt="" className="h-12 rounded-lg object-cover border" />
              )}
            </div>
            <button
              type="button"
              disabled={pubPublishing}
              onClick={() => void publishBlog()}
              className={adminBtnPrimary}
            >
              {pubPublishing ? "Publishing…" : "Publish blog"}
            </button>
          </div>
        )}

        {action === "practice" && (
          <div className={adminCard + " p-5 space-y-4 max-w-2xl"}>
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Brain className="w-4 h-4 text-rose-600" />
              Practice problem
            </h3>
            <p className="text-xs text-slate-500">
              Upload a .docx or .md file per field, or type directly.
            </p>
            <div>
              <label className={adminFieldLabel}>Topic</label>
              <AppSelect
                className={adminSelect}
                value={selectedTopic != null ? String(selectedTopic) : ""}
                onValueChange={(v) => setSelectedTopic(v ? Number(v) : null)}
                placeholder="Select topic"
                options={[
                  { value: "", label: "Select topic" },
                  ...topics.map((t) => ({ value: String(t.id), label: t.title })),
                ]}
              />
            </div>
            <div>
              <label className={adminFieldLabel}>Tags (comma separated)</label>
              <input
                className={adminInput}
                placeholder="e.g. midterm, easy, pointers, loops"
                value={practiceTags}
                onChange={(e) => setPracticeTags(e.target.value)}
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Students filter problems by these tags. Add up to 20, separated by commas.
              </p>
            </div>

            <div
              className={
                "rounded-xl border p-3 space-y-2 transition " +
                (activeField === "problem"
                  ? "border-rose-300 bg-rose-50/40"
                  : "border-[#dce5d4] bg-[#fafcf8]")
              }
            >
              <div className="flex items-center justify-between gap-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Problem
                </label>
                <label className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-full border border-[#dce5d4] bg-white text-[11px] font-semibold text-slate-600 cursor-pointer hover:border-rose-300 hover:text-rose-700">
                  <Upload className="w-3.5 h-3.5" />
                  {importingField === "problem" ? "Importing…" : "Upload .docx / .md"}
                  <input
                    type="file"
                    accept=".docx,.md,.markdown"
                    className="hidden"
                    disabled={importingField != null}
                    onClick={() => setActiveField("problem")}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void importFieldDoc("problem", file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              <textarea
                className={adminTextarea + " min-h-[120px] bg-white"}
                placeholder="Problem text — upload a file or type here"
                value={problemText}
                onFocus={() => setActiveField("problem")}
                onChange={(e) => setProblemText(e.target.value)}
              />
            </div>

            <div
              className={
                "rounded-xl border p-3 space-y-2 transition " +
                (activeField === "solution"
                  ? "border-rose-300 bg-rose-50/40"
                  : "border-[#dce5d4] bg-[#fafcf8]")
              }
            >
              <div className="flex items-center justify-between gap-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Solution
                </label>
                <label className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-full border border-[#dce5d4] bg-white text-[11px] font-semibold text-slate-600 cursor-pointer hover:border-rose-300 hover:text-rose-700">
                  <Upload className="w-3.5 h-3.5" />
                  {importingField === "solution" ? "Importing…" : "Upload .docx / .md"}
                  <input
                    type="file"
                    accept=".docx,.md,.markdown"
                    className="hidden"
                    disabled={importingField != null}
                    onClick={() => setActiveField("solution")}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void importFieldDoc("solution", file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              <textarea
                className={adminTextarea + " min-h-[120px] bg-white"}
                placeholder="Solution text — upload a file or type here"
                value={solutionText}
                onFocus={() => setActiveField("solution")}
                onChange={(e) => setSolutionText(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 px-3 h-9 rounded-full border border-[#dce5d4] text-xs font-semibold text-slate-600 cursor-pointer hover:bg-[#f5f8f2]">
                <ImagePlus className="w-4 h-4" />
                Optional diagram
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onQuestionImage(e.target.files?.[0] ?? null)}
                />
              </label>
              {questionImagePreview && (
                <img
                  src={questionImagePreview}
                  alt="Diagram preview"
                  className="h-12 w-12 rounded-lg object-cover border border-[#dce5d4]"
                />
              )}
            </div>

            <button
              type="button"
              disabled={practiceSaving || !problemText.trim() || !solutionText.trim()}
              onClick={() => void addProblem()}
              className={adminBtnPrimary + " w-full sm:w-auto disabled:opacity-50"}
            >
              {practiceSaving ? "Saving…" : "Save problem"}
            </button>
          </div>
        )}

        <AlertDialog
          open={deleteTopicTarget != null}
          onOpenChange={(open) => {
            if (!open) setDeleteTopicTarget(null);
          }}
        >
          <AlertDialogContent className={adminDialogContent}>
            <AlertDialogHeader className="text-left">
              <AlertDialogTitle className="text-lg font-bold text-rose-600">
                Delete topic?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed mt-2">
                {deleteTopicTarget ? (
                  <>
                    <span className="font-semibold text-slate-700">
                      &ldquo;{deleteTopicTarget.title}&rdquo;
                    </span>{" "}
                    will be removed permanently. This also deletes{" "}
                    <span className="font-semibold text-slate-700">
                      {deleteTopicTarget.blog_count ?? 0} blog
                      {(deleteTopicTarget.blog_count ?? 0) === 1 ? "" : "s"}
                    </span>{" "}
                    and{" "}
                    <span className="font-semibold text-slate-700">
                      {deleteTopicTarget.problem_count ?? 0} practice problem
                      {(deleteTopicTarget.problem_count ?? 0) === 1 ? "" : "s"}
                    </span>{" "}
                    linked to this topic. This cannot be undone.
                  </>
                ) : null}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingTopic}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={deletingTopic}
                onClick={(e) => {
                  e.preventDefault();
                  void confirmDeleteTopic();
                }}
                className="bg-rose-600 hover:bg-rose-700"
              >
                {deletingTopic ? "Deleting…" : "Delete topic"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Content publishing"
        title="Publish hub"
        description="Pick a course, then add topics, official blogs, or practice problems."
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className={adminInput + " pl-10"}
            placeholder="Search courses…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <AppSelect
          className={adminSelect + " max-w-xs"}
          value={deptFilter}
          onValueChange={setDeptFilter}
          options={[
            { value: "all", label: "All departments" },
            ...departments.map((d) => ({
              value: d.code,
              label: `${d.code} — ${d.name}`,
            })),
          ]}
        />
      </div>

      {statsLoading ? (
        <AdminLoading label="Loading catalog…" />
      ) : filtered.length === 0 ? (
        <EmptyState message="No active courses match your filters." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <article
              key={c.id}
              className={
                adminCard +
                " p-5 flex flex-col gap-4 hover:shadow-md hover:border-[#7d9b76]/40 transition group"
              }
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                  {c.department_code || "—"}
                </p>
                <h3 className="font-display text-lg font-semibold text-slate-800 mt-0.5">
                  {c.code}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2 mt-1">{c.title}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px] font-semibold">
                <span className="px-2 py-1 rounded-full bg-[#f5f8f2] text-[#5d7a56] border border-[#dce5d4]">
                  {c.topic_count} topics
                </span>
                <span className="px-2 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
                  {c.blog_count} blogs
                </span>
                <span className="px-2 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-100">
                  {c.problem_count} problems
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-auto">
                <button
                  type="button"
                  onClick={() => openAction(c, "topic")}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-[#dce5d4] bg-[#fafcf8] hover:bg-white hover:border-[#7d9b76] text-[10px] font-bold text-slate-600 transition"
                >
                  <Layers className="w-4 h-4 text-[#7d9b76]" />
                  Topic
                </button>
                <button
                  type="button"
                  onClick={() => openAction(c, "blog")}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-[#dce5d4] bg-[#fafcf8] hover:bg-white hover:border-rose-300 text-[10px] font-bold text-slate-600 transition"
                >
                  <BookOpen className="w-4 h-4 text-rose-600" />
                  Blog
                </button>
                <button
                  type="button"
                  onClick={() => openAction(c, "practice")}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-[#dce5d4] bg-[#fafcf8] hover:bg-white hover:border-sky-300 text-[10px] font-bold text-slate-600 transition"
                >
                  <Brain className="w-4 h-4 text-sky-600" />
                  Practice
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
