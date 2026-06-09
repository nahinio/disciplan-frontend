import { useEffect, useState } from "react";
import { ImagePlus, Plus, Upload } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { invalidateCourseContent } from "@/lib/invalidateAppData";
import { parseMarkdownToHTML } from "@/lib/blogImport";
import { importPracticeFieldFile } from "@/lib/practiceImport";
import type { useAdmin } from "@/hooks/useAdmin";
import {
  AdminLoading,
  AdminPageHeader,
  EmptyState,
  adminBtnPrimary,
  adminCard,
  adminInput,
  adminSelect,
  adminTextarea,
} from "./admin-ui";
import { AppSelect } from "@/components/ui/app-select";

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<li>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toStoredHtml(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (/<[a-z][\s\S]*>/i.test(trimmed)) return trimmed;
  return parseMarkdownToHTML(trimmed);
}

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

type AdminData = ReturnType<typeof useAdmin>;

interface Topic {
  id: number;
  title: string;
  problem_count?: number;
}

interface ProblemRow {
  id: number;
  problem_number?: number;
  question: string;
  answer: string;
  question_image_url?: string;
}

export function AdminCurriculumPanel({ admin }: { admin: AdminData }) {
  const qc = useQueryClient();
  const { courses } = admin;
  const [courseCode, setCourseCode] = useState(courses[0]?.code ?? "");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
  const [problems, setProblems] = useState<ProblemRow[]>([]);
  const [problemsLoading, setProblemsLoading] = useState(false);
  const [problemText, setProblemText] = useState("");
  const [solutionText, setSolutionText] = useState("");
  const [practiceTags, setPracticeTags] = useState("");
  const [importingField, setImportingField] = useState<"problem" | "solution" | null>(
    null
  );
  const [activeField, setActiveField] = useState<"problem" | "solution">("problem");
  const [saving, setSaving] = useState(false);
  const [questionImageFile, setQuestionImageFile] = useState<File | null>(null);
  const [questionImagePreview, setQuestionImagePreview] = useState<string | null>(null);

  const loadTopics = async (code: string) => {
    if (!code) return;
    setLoading(true);
    try {
      const res = await api.getPracticeTopics(code);
      setTopics(
        (res.items as Record<string, unknown>[]).map((t) => ({
          id: Number(t.id),
          title: String(t.topic ?? t.title ?? ""),
          problem_count: Number(t.problem_count ?? 0),
        }))
      );
    } catch {
      setTopics([]);
    } finally {
      setLoading(false);
    }
  };

  const loadProblems = async (code: string, topicId: number) => {
    setProblemsLoading(true);
    try {
      const res = await api.getPracticeProblems(code, { topic_id: topicId });
      setProblems(
        (res.items as Record<string, unknown>[]).map((p) => ({
          id: Number(p.id),
          problem_number: p.problem_number != null ? Number(p.problem_number) : undefined,
          question: String(p.question ?? ""),
          answer: String(p.answer ?? ""),
          question_image_url: p.question_image_url
            ? String(p.question_image_url)
            : undefined,
        }))
      );
    } catch {
      setProblems([]);
    } finally {
      setProblemsLoading(false);
    }
  };

  useEffect(() => {
    if (courseCode) void loadTopics(courseCode);
  }, [courseCode]);

  useEffect(() => {
    if (courses[0]?.code && !courseCode) setCourseCode(courses[0].code);
  }, [courses, courseCode]);

  useEffect(() => {
    if (selectedTopic && courseCode) {
      void loadProblems(courseCode, selectedTopic);
    } else {
      setProblems([]);
    }
  }, [selectedTopic, courseCode]);

  const addTopic = async () => {
    if (!newTopic.trim() || !courseCode) return;
    try {
      await api.createPracticeTopic(courseCode, { title: newTopic.trim() });
      invalidateCourseContent(qc, courseCode);
      toast.success("Topic added.");
      setNewTopic("");
      await loadTopics(courseCode);
    } catch {
      toast.error("Could not add topic.");
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
    if (!selectedTopic || !problemText.trim() || !solutionText.trim()) {
      toast.error("Select a topic and add problem + solution.");
      return;
    }
    setSaving(true);
    try {
      let question_image_file_id: number | undefined;
      if (questionImageFile) {
        const uploaded = await api.uploadFile(questionImageFile, "practice-problems");
        question_image_file_id = uploaded.file_id;
      }

      const tags = parseCommaTags(practiceTags);
      const res = await api.createPracticeProblem(courseCode, {
        topic_id: selectedTopic,
        question: toStoredHtml(problemText),
        answer: toStoredHtml(solutionText),
        ...(tags.length > 0 ? { tags } : {}),
        ...(question_image_file_id != null ? { question_image_file_id } : {}),
      });

      invalidateCourseContent(qc, courseCode);
      toast.success(
        `Problem ${res.problem_number ?? ""} saved for this topic.`.trim()
      );
      setProblemText("");
      setSolutionText("");
      setPracticeTags("");
      onQuestionImage(null);
      await loadTopics(courseCode);
      await loadProblems(courseCode, selectedTopic);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save problem.");
    } finally {
      setSaving(false);
    }
  };

  const nextNumber = (problems[problems.length - 1]?.problem_number ?? 0) + 1;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Curriculum control"
        title="Topics & practice mapping"
        description="Define syllabus topics and add practice problems from Word or Markdown."
      />

      <AppSelect
        className={adminSelect + " max-w-sm"}
        value={courseCode}
        onValueChange={(v) => {
          setCourseCode(v);
          setSelectedTopic(null);
        }}
        options={courses.map((c) => ({
          value: c.code,
          label: `${c.code} — ${c.title}`,
        }))}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={adminCard + " p-5 space-y-3"}>
          <h3 className="text-sm font-bold text-slate-800">Syllabus topics</h3>
          <div className="flex gap-2">
            <input
              className={adminInput}
              placeholder="New topic title"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
            />
            <button type="button" onClick={() => void addTopic()} className={adminBtnPrimary}>
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {loading ? (
            <AdminLoading label="Loading topics…" />
          ) : topics.length === 0 ? (
            <EmptyState message="No topics for this course yet." />
          ) : (
            <ul className="space-y-2">
              {topics.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedTopic(t.id)}
                    className={
                      "w-full text-left px-3 py-2 rounded-xl border text-sm font-medium transition " +
                      (selectedTopic === t.id
                        ? "border-rose-300 bg-rose-50 text-rose-800"
                        : "border-[#dce5d4] hover:bg-[#f5f8f2] text-slate-700")
                    }
                  >
                    {t.title}
                    <span className="text-xs text-slate-400 ml-2">
                      ({t.problem_count ?? 0} problems)
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={adminCard + " p-5 space-y-4"}>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Add practice problem</h3>
            <p className="text-xs text-slate-500 mt-1">
              Select a field, upload its own .docx or .md file, or type directly.
            </p>
          </div>

          {!selectedTopic ? (
            <p className="text-xs text-slate-500">Select a topic on the left first.</p>
          ) : (
            <>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Tags (comma separated)
                </label>
                <input
                  className={adminInput}
                  placeholder="e.g. midterm, easy, pointers"
                  value={practiceTags}
                  onChange={(e) => setPracticeTags(e.target.value)}
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Students use these tags to filter problems.
                </p>
              </div>
              <div className="space-y-4">
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
                      Problem #{nextNumber}
                    </label>
                    <label className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-full border border-[#dce5d4] bg-white text-[11px] font-semibold text-slate-600 cursor-pointer hover:border-rose-300 hover:text-rose-700">
                      <Upload className="w-3.5 h-3.5" />
                      {importingField === "problem" ? "Importing…" : "Upload file"}
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
                    placeholder="Problem text — click Upload file or type here"
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
                      {importingField === "solution" ? "Importing…" : "Upload file"}
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
                    placeholder="Solution text — click Upload file or type here"
                    value={solutionText}
                    onFocus={() => setActiveField("solution")}
                    onChange={(e) => setSolutionText(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 px-3 h-9 rounded-full border border-[#dce5d4] text-xs font-semibold text-slate-600 cursor-pointer hover:bg-[#f5f8f2]">
                  <ImagePlus className="w-4 h-4" />
                  Optional problem image
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
                    alt="Problem preview"
                    className="h-12 w-12 rounded-lg object-cover border border-[#dce5d4]"
                  />
                )}
              </div>

              <button
                type="button"
                disabled={saving || !problemText.trim() || !solutionText.trim()}
                onClick={() => void addProblem()}
                className={adminBtnPrimary + " disabled:opacity-50"}
              >
                Save as problem #{nextNumber}
              </button>

              <div className="pt-2 border-t border-[#eef2e8]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Saved problems
                </p>
                {problemsLoading ? (
                  <AdminLoading label="Loading problems…" />
                ) : problems.length === 0 ? (
                  <p className="text-xs text-slate-500">No problems for this topic yet.</p>
                ) : (
                  <ul className="space-y-2 max-h-48 overflow-y-auto">
                    {problems.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-start gap-2 px-3 py-2 rounded-xl border border-[#dce5d4] bg-[#fafcf8] text-xs"
                      >
                        <span className="font-bold text-rose-600 shrink-0">
                          #{p.problem_number ?? "?"}
                        </span>
                        <div
                          className="flex-1 text-slate-700 line-clamp-2 prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: p.question }}
                        />
                        {p.question_image_url && (
                          <img
                            src={p.question_image_url}
                            alt=""
                            className="h-8 w-8 rounded object-cover shrink-0"
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
