import { useState, useRef, useEffect, useMemo } from "react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { appRouteSsr, requireAuth } from "@/lib/routeAuth";
import { ArrowLeft, Upload, FileText, CheckCircle, Trash2, Eye } from "lucide-react";
import { z } from "zod";
import { TopHeader } from "@/components/dashboard/TopHeader";
import { MobileTabBar } from "@/components/dashboard/MobileTabBar";
import { useCatalogue } from "@/hooks/useCatalogue";
import { decodeCourseCode, encodeCourseCode, readTimeFromBody } from "@/lib/blog";
import { importBlogFile } from "@/lib/blogImport";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "@/lib/api";
import { invalidateCourseContent } from "@/lib/invalidateAppData";
import { useOfferings } from "@/hooks/useOfferings";
import { toast } from "sonner";
import { AppSelect } from "@/components/ui/app-select";

const searchSchema = z.object({
  course: z.string().optional(),
  topic_id: z.coerce.number().optional(),
});

export const Route = createFileRoute("/blogs/new")({
  ssr: appRouteSsr,
  beforeLoad: () => {
    requireAuth();
  },
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "DisciPlan — Import blog post" },
      { name: "description", content: "Upload a Word document or Markdown file to create a blog post." },
      { property: "og:title", content: "DisciPlan — Import blog post" },
      { property: "og:description", content: "Publish documents easily from MS Word or Markdown." },
    ],
  }),
  component: NewBlogPage,
});

interface TopicOption {
  id: number;
  title: string;
}

function resolveCourseFromSearch(raw?: string): string | undefined {
  if (!raw?.trim()) return undefined;
  const trimmed = raw.trim();
  if (trimmed.includes(" ") || !trimmed.includes("-")) return trimmed;
  return decodeCourseCode(trimmed);
}

function NewBlogPage() {
  const qc = useQueryClient();
  const { course, topic_id: topicIdFromUrl } = useSearch({ from: "/blogs/new" });
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { offerings } = useOfferings();
  const { catalogue } = useCatalogue();
  const courseFromUrl = resolveCourseFromSearch(course);

  const { enrolledOpts, restOpts, allCourseOpts } = useMemo(() => {
    const enrolledCodes = new Set(offerings.map((c) => c.course_code));
    const enrolled = offerings.map((c) => ({ code: c.course_code, title: c.title }));
    const rest = catalogue
      .filter((c) => !enrolledCodes.has(c.code))
      .map((c) => ({ code: c.code, title: c.title }));
    return { enrolledOpts: enrolled, restOpts: rest, allCourseOpts: [...enrolled, ...rest] };
  }, [offerings, catalogue]);

  const [courseCode, setCourseCode] = useState<string>("");
  const [title, setTitle] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [topicId, setTopicId] = useState<number | "">("");
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [importedFile, setImportedFile] = useState<{ name: string; size: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (allCourseOpts.length === 0) return;

    setCourseCode((current) => {
      if (current && allCourseOpts.some((o) => o.code === current)) return current;
      if (courseFromUrl && allCourseOpts.some((o) => o.code === courseFromUrl)) {
        return courseFromUrl;
      }
      return enrolledOpts[0]?.code ?? allCourseOpts[0].code;
    });
  }, [allCourseOpts, courseFromUrl, enrolledOpts]);

  useEffect(() => {
    if (!courseCode) return;
    setTopicsLoading(true);
    void api
      .getPracticeTopics(courseCode)
      .then((res) => {
        const items = (res.items as Record<string, unknown>[]).map((t) => ({
          id: Number(t.id),
          title: String(t.topic ?? t.title ?? ""),
        }));
        setTopics(items);
        if (topicIdFromUrl && items.some((t) => t.id === topicIdFromUrl)) {
          setTopicId(topicIdFromUrl);
        } else if (items.length === 1) {
          setTopicId(items[0].id);
        } else {
          setTopicId("");
        }
      })
      .catch((err) => {
        setTopics([]);
        setTopicId("");
        const message =
          err instanceof ApiError ? err.message : "Could not load syllabus topics for this course.";
        toast.error(message);
      })
      .finally(() => setTopicsLoading(false));
  }, [courseCode, topicIdFromUrl]);

  const canSubmit =
    title.trim().length > 0 && bodyHtml.trim().length > 0 && topicId !== "";

  const processUploadedFile = async (file: File) => {
    setImporting(true);
    toast.loading("Importing document…", { id: "blog-import" });
    try {
      const { html, title: suggestedTitle } = await importBlogFile(file);
      setBodyHtml(html);
      setTitle(suggestedTitle);
      setImportedFile({ name: file.name, size: file.size });
      toast.success("Document imported — title and content filled automatically.", {
        id: "blog-import",
      });
    } catch (err) {
      toast.error(String(err), { id: "blog-import" });
    } finally {
      setImporting(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) await processUploadedFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) await processUploadedFile(e.target.files[0]);
  };

  const removeFile = () => {
    setBodyHtml("");
    setTitle("");
    setImportedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.info("Document cleared");
  };

  const submit = async () => {
    if (!bodyHtml.trim()) {
      toast.error("Upload a .docx or .md file first.");
      return;
    }
    if (!topicId) {
      toast.error("Select a syllabus topic for this post.");
      return;
    }
    if (!title.trim()) {
      toast.error("Add a title — or re-upload a document with a heading.");
      return;
    }
    const plain = bodyHtml.replace(/<[^>]+>/g, " ");
    const excerpt = plain.replace(/\s+/g, " ").trim().slice(0, 180);
    try {
      await api.createBlogPost({
        course_code: courseCode,
        topic_id: Number(topicId),
        title: title.trim(),
        excerpt: excerpt + (plain.length > 180 ? "…" : ""),
        body_html: bodyHtml.trim(),
        read_time_min: readTimeFromBody(plain),
      });
      invalidateCourseContent(qc, courseCode);
      toast.success("Document published successfully");
      navigate({ to: "/blogs/$courseCode", params: { courseCode: encodeCourseCode(courseCode) } });
    } catch {
      toast.error("Could not publish post");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-paper text-ink">
      <TopHeader />
      <main className="flex-1 overflow-y-auto no-scrollbar pb-20 md:pb-0">
        <div className="max-w-4xl mx-auto px-5 md:px-8 py-8 space-y-8">
          <div>
            <Link
              to="/blogs"
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to blogs
            </Link>
            <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mt-4 text-slate-800">
              Publish a Document
            </h1>
            <p className="text-slate-500 mt-2">
              Upload Word (.docx) or Markdown (.md) — content and title are filled automatically. Pick course + topic, then publish.
            </p>
          </div>

          <div className="space-y-6 rounded-2xl border border-[#dce5d4] bg-white p-6 shadow-sm">
            {/* Step 1: Upload */}
            <div className="space-y-2">
              <span className="block text-xs uppercase tracking-[0.18em] text-slate-500 font-semibold">
                1 · Import document
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.md,.markdown"
                onChange={handleFileChange}
                className="hidden"
              />

              {!importedFile ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => !importing && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
                    importing
                      ? "opacity-60 pointer-events-none"
                      : isDragging
                        ? "border-rose-500 bg-rose-50"
                        : "border-[#dce5d4] hover:border-rose-400 hover:bg-rose-50/50"
                  }`}
                >
                  <Upload className="w-10 h-10 text-slate-400 mb-3" />
                  <p className="font-medium text-sm text-slate-700">
                    Drag and drop your file here, or{" "}
                    <span className="text-rose-600 font-semibold underline">browse files</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1.5">
                    .docx or .md — body and title auto-generated from your file
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 truncate max-w-md">{importedFile.name}</p>
                      <p className="text-xs text-slate-500">
                        {formatFileSize(importedFile.size)} · Content imported
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      <CheckCircle className="w-3 h-3" /> Ready
                    </span>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Course + topic */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="2 · Course">
                <AppSelect
                  value={courseCode}
                  onValueChange={setCourseCode}
                  disabled={allCourseOpts.length === 0}
                  placeholder="Loading courses…"
                  groups={
                    allCourseOpts.length === 0
                      ? undefined
                      : [
                          {
                            label: "Your trimester",
                            options: enrolledOpts.map((o) => ({
                              value: o.code,
                              label: `${o.code} — ${o.title}`,
                            })),
                          },
                          {
                            label: "Catalogue",
                            options: restOpts.map((o) => ({
                              value: o.code,
                              label: `${o.code} — ${o.title}`,
                            })),
                          },
                        ]
                  }
                  options={
                    allCourseOpts.length === 0
                      ? [{ value: "", label: "Loading courses…" }]
                      : []
                  }
                />
              </Field>

              <Field label="Syllabus topic">
                <AppSelect
                  value={topicId !== "" ? String(topicId) : ""}
                  onValueChange={(v) => setTopicId(v ? Number(v) : "")}
                  disabled={topicsLoading || topics.length === 0}
                  placeholder={
                    topicsLoading
                      ? "Loading topics…"
                      : topics.length === 0
                        ? "No topics — ask admin to add topics first"
                        : "Select a topic"
                  }
                  options={[
                    {
                      value: "",
                      label: topicsLoading
                        ? "Loading topics…"
                        : topics.length === 0
                          ? "No topics — ask admin to add topics first"
                          : "Select a topic",
                    },
                    ...topics.map((t) => ({
                      value: String(t.id),
                      label: t.title,
                    })),
                  ]}
                />
              </Field>
            </div>

            <Field label="3 · Title (auto-filled from document, editable)">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Filled automatically when you upload a file"
                maxLength={140}
                className="w-full h-11 px-3 rounded-lg border border-[#dce5d4] bg-white text-base focus:outline-none focus:ring-2 focus:ring-rose-200"
              />
            </Field>

            {bodyHtml && (
              <div className="space-y-3">
                <span className="flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-slate-500 font-semibold">
                  <Eye className="w-3.5 h-3.5 text-rose-500" />
                  Preview
                </span>
                <div className="border border-[#dce5d4] rounded-2xl bg-[#faf8f3] p-6 md:p-8 max-h-[350px] overflow-y-auto">
                  <article className="prose prose-neutral max-w-none">
                    {title && (
                      <h1 className="font-display font-bold text-2xl md:text-3xl mt-0 mb-4 text-slate-800">
                        {title}
                      </h1>
                    )}
                    <div
                      className="rich-content text-sm md:text-base leading-relaxed text-slate-700"
                      dangerouslySetInnerHTML={{ __html: bodyHtml }}
                    />
                  </article>
                </div>
              </div>
            )}

            <p className="text-xs text-slate-500">
              Faculty and admin posts are verified automatically. Student posts need faculty approval.
            </p>

            <div className="flex justify-end gap-2 pt-4 border-t border-[#dce5d4]">
              <Link
                to="/blogs"
                className="px-4 h-10 inline-flex items-center rounded-full text-sm text-slate-500 hover:text-slate-800"
              >
                Cancel
              </Link>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={!canSubmit || importing}
                className="px-6 h-10 rounded-full bg-rose-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-rose-700 transition"
              >
                Publish Blog
              </button>
            </div>
          </div>
        </div>
      </main>
      <MobileTabBar />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-[0.18em] text-slate-500 mb-1.5 font-semibold">
        {label}
      </span>
      {children}
    </label>
  );
}
