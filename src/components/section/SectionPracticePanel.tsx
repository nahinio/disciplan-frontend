import { useState } from "react";
import { Brain, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { importPracticeFieldFile } from "@/lib/practiceImport";
import { AppSelect } from "@/components/ui/app-select";
import { RefreshButton } from "@/components/ui/refresh-button";
import { usePracticeTopics } from "@/hooks/usePractice";
import { useSectionPractice } from "@/hooks/useSectionPractice";
import { useUserStats } from "@/hooks/useUserStats";

export function SectionPracticePanel({
  courseCode,
  sectionLabel,
}: {
  courseCode: string;
  sectionLabel: string;
}) {
  const { profile } = useUserStats();
  const isFaculty = profile.role === "faculty" || profile.role === "admin";
  const { topics } = usePracticeTopics(courseCode);
  const { problems, loading, isFetching, refresh, createProblem, deleteProblem } =
    useSectionPractice(courseCode, sectionLabel);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [topicId, setTopicId] = useState<number | "">("");
  const [problemText, setProblemText] = useState("");
  const [solutionText, setSolutionText] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemText.trim() || !solutionText.trim()) return;
    setSaving(true);
    try {
      await createProblem({
        topic_id: topicId === "" ? null : topicId,
        question: problemText.trim(),
        answer: solutionText.trim(),
        assessment_type_code: "mid",
        difficulty_score: 3,
      });
      toast.success("Section practice problem added.");
      setProblemText("");
      setSolutionText("");
      setFormOpen(false);
    } catch {
      toast.error("Could not save problem.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (problemId: number) => {
    if (!confirm("Delete this section practice problem?")) return;
    try {
      await deleteProblem(problemId);
      toast.success("Practice problem removed.");
    } catch {
      toast.error("Could not delete problem.");
    }
  };

  const importField = async (field: "problem" | "solution", file: File) => {
    try {
      const text = await importPracticeFieldFile(file);
      if (field === "problem") setProblemText(text);
      else setSolutionText(text);
    } catch {
      toast.error("Could not import file.");
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading practice problems…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <RefreshButton onClick={refresh} loading={isFetching} />
      </div>

      {isFaculty && (
        <div className="rounded-2xl border border-[#dce5d4] bg-[#faf8f3] p-4 shadow-sm">
          <button
            type="button"
            onClick={() => setFormOpen((v) => !v)}
            className="flex items-center justify-between w-full text-sm font-semibold text-slate-800 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#7d9b76]" />
              Add section-only practice problem
            </span>
            <span className="text-xs text-[#7d9b76]">{formOpen ? "Close" : "Open"}</span>
          </button>
          {formOpen && (
            <form onSubmit={handleSave} className="mt-4 space-y-3 border-t border-slate-200/60 pt-4">
              <AppSelect
                size="sm"
                value={topicId !== "" ? String(topicId) : ""}
                onValueChange={(v) => setTopicId(v ? Number(v) : "")}
                placeholder="Topic (optional)"
                options={[
                  { value: "", label: "Topic (optional)" },
                  ...topics.map((t) => ({ value: String(t.id), label: t.topic })),
                ]}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Problem</label>
                  <textarea
                    value={problemText}
                    onChange={(e) => setProblemText(e.target.value)}
                    rows={4}
                    className="w-full p-2 rounded-xl border text-xs bg-white resize-none"
                    required
                  />
                  <label className="text-[10px] text-[#7d9b76] font-semibold cursor-pointer">
                    Import .docx / .md
                    <input
                      type="file"
                      accept=".docx,.md,.markdown"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void importField("problem", f);
                      }}
                    />
                  </label>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Solution</label>
                  <textarea
                    value={solutionText}
                    onChange={(e) => setSolutionText(e.target.value)}
                    rows={4}
                    className="w-full p-2 rounded-xl border text-xs bg-white resize-none"
                    required
                  />
                  <label className="text-[10px] text-[#7d9b76] font-semibold cursor-pointer">
                    Import .docx / .md
                    <input
                      type="file"
                      accept=".docx,.md,.markdown"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void importField("solution", f);
                      }}
                    />
                  </label>
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="px-4 h-9 rounded-full bg-[#7d9b76] text-white text-xs font-bold disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save problem"}
              </button>
            </form>
          )}
        </div>
      )}

      {problems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-400">
          No practice problems for this section yet.
        </div>
      ) : (
        <div className="space-y-2">
          {problems.map((p) => {
            const open = expandedId === p.id;
            return (
              <div
                key={p.id}
                className="rounded-xl border border-[#dce5d4] bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedId(open ? null : p.id)}
                    className="flex-1 flex items-start justify-between gap-3 text-left cursor-pointer min-w-0"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Brain className="w-3.5 h-3.5 text-[#7d9b76] shrink-0" />
                        <span
                          className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            p.scope === "course"
                              ? "bg-slate-100 text-slate-600"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {p.scope === "course" ? "Course-wide (admin)" : "This section only"}
                        </span>
                      </div>
                      <p
                        className="text-xs font-semibold text-slate-800 line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: p.question }}
                      />
                    </div>
                    {open ? (
                      <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>
                  {isFaculty && p.scope === "section" && p.id > 0 && (
                    <button
                      type="button"
                      onClick={() => void handleDelete(p.id)}
                      className="p-2 rounded-lg hover:bg-rose-50 text-rose-600 shrink-0"
                      title="Delete section problem"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {open && (
                  <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
                    <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Solution</p>
                    <div dangerouslySetInnerHTML={{ __html: p.answer }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
