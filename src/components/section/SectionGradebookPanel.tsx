import { useState } from "react";
import { Plus, Edit, Trash2, X } from "lucide-react";
import { AppSelect } from "@/components/ui/app-select";
import { toast } from "sonner";
import { useSectionGrades, GradeRubricComponent, StudentGradeRow } from "@/hooks/useSectionGrades";
import { useUserStats } from "@/hooks/useUserStats";

export function SectionGradebookPanel({
  courseCode,
  sectionLabel,
}: {
  courseCode: string;
  sectionLabel: string;
}) {
  const { profile } = useUserStats();
  const isFaculty = profile.role === "faculty" || profile.role === "admin";
  const {
    students,
    rubric,
    loading,
    addComponent,
    updateComponent,
    deleteComponent,
    saveComponentGrade,
  } = useSectionGrades(courseCode, sectionLabel);

  const [compLabel, setCompLabel] = useState("");
  const [compMax, setCompMax] = useState(30);
  const [compWeight, setCompWeight] = useState(30);
  const [compType, setCompType] = useState<
    "ct" | "evaluation" | "attendance" | "final" | "assignment"
  >("evaluation");

  // Editing component states
  const [editingComponent, setEditingComponent] = useState<GradeRubricComponent | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editMax, setEditMax] = useState(0);
  const [editWeight, setEditWeight] = useState(0);

  // Editing student CT scores states
  const [editingCtStudent, setEditingCtStudent] = useState<StudentGradeRow | null>(null);
  const [ctEdits, setCtEdits] = useState<Record<string, string>>({});

  const ctComponents = rubric.filter((c) => c.component_type === "ct");
  const evalComponents = rubric.filter(
    (c) => !["ct"].includes(c.component_type)
  );

  const handleAddComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compLabel.trim()) return;
    try {
      await addComponent({
        component_type: compType,
        label: compLabel.trim(),
        max_score: compMax,
        weight_percent: compWeight,
      });
      setCompLabel("");
      toast.success("Component added");
    } catch {
      toast.error("Could not add component");
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading gradebook…</p>;
  }

  if (!isFaculty) {
    const s = students[0];
    if (!s) {
      return (
        <div className="py-16 text-center rounded-2xl border border-dashed border-rose-100/60 bg-white/70 backdrop-blur-sm shadow-sm">
          <p className="text-sm text-slate-500 font-medium">No grades have been posted for this section yet.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Student Grade Summary Card */}
        <div className="relative overflow-hidden rounded-3xl border border-rose-100/60 bg-gradient-to-br from-rose-500/5 via-amber-500/5 to-white p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Performance Summary</p>
              <h3 className="font-display text-2xl font-bold text-slate-800 mt-1">{s.name}</h3>
              <p className="text-xs text-slate-500">{s.email}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="bg-white border border-rose-100/40 rounded-2xl px-5 py-3 text-center shadow-sm">
                <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Overall %</p>
                <p className="text-2xl font-bold text-rose-600 mt-0.5">{s.total_percent}%</p>
              </div>
              <div className="bg-white border border-rose-100/40 rounded-2xl px-5 py-3 text-center shadow-sm">
                <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Grade</p>
                <p className="text-2xl font-bold text-slate-800 mt-0.5">{s.letter_grade}</p>
              </div>
              <div className="bg-white border border-rose-100/40 rounded-2xl px-5 py-3 text-center shadow-sm">
                <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">GPA</p>
                <p className="text-2xl font-bold text-slate-800 mt-0.5">{s.gpa_points.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <h4 className="font-display text-sm font-bold text-slate-800">Gradebook Breakdown</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-600">
                <tr>
                  <th className="text-left p-4 font-bold uppercase tracking-wider text-[10px]">Component</th>
                  <th className="text-center p-4 font-bold uppercase tracking-wider text-[10px]">Type</th>
                  <th className="text-center p-4 font-bold uppercase tracking-wider text-[10px]">Weight</th>
                  <th className="text-center p-4 font-bold uppercase tracking-wider text-[10px]">Max Marks</th>
                  <th className="text-right p-4 font-bold uppercase tracking-wider text-[10px]">Your Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ctComponents.map((c) => {
                  const scoreObj = s.ct_scores.find((x) => x.code === c.component_code);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-semibold text-slate-800">{c.label}</td>
                      <td className="p-4 text-center text-slate-500 uppercase tracking-wider text-[10px] font-bold">Class Test</td>
                      <td className="p-4 text-center text-slate-500">{c.weight_percent}%</td>
                      <td className="p-4 text-center text-slate-500">{c.max_score}</td>
                      <td className="p-4 text-right font-bold text-slate-800">{scoreObj?.score != null ? scoreObj.score : "—"}</td>
                    </tr>
                  );
                })}
                {ctComponents.length > 0 && (
                  <tr className="bg-amber-50/20 font-medium">
                    <td className="p-4 text-amber-900 font-semibold">Class Test Average</td>
                    <td className="p-4 text-center text-amber-700 uppercase tracking-wider text-[10px] font-bold">Averaged</td>
                    <td className="p-4 text-center text-amber-700">-</td>
                    <td className="p-4 text-center text-amber-700">-</td>
                    <td className="p-4 text-right font-bold text-amber-900">{s.ct_average != null ? s.ct_average.toFixed(1) : "—"}</td>
                  </tr>
                )}
                {evalComponents.map((c) => {
                  const scoreObj = s.evaluations.find((x) => x.code === c.component_code);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-semibold text-slate-800">{c.label}</td>
                      <td className="p-4 text-center text-slate-500 uppercase tracking-wider text-[10px] font-bold">{c.component_type}</td>
                      <td className="p-4 text-center text-slate-500">{c.weight_percent}%</td>
                      <td className="p-4 text-center text-slate-500">{c.max_score}</td>
                      <td className="p-4 text-right font-bold text-slate-800">{scoreObj?.score != null ? scoreObj.score : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isFaculty && (
        <form
          onSubmit={handleAddComponent}
          className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-wrap gap-3 items-end"
        >
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500">Type</label>
            <AppSelect
              size="sm"
              className="mt-1"
              value={compType}
              onValueChange={(v) =>
                setCompType(
                  v as "ct" | "evaluation" | "attendance" | "final" | "assignment"
                )
              }
              options={[
                { value: "ct", label: "CT (averaged)" },
                { value: "evaluation", label: "Evaluation (e.g. Mid Term)" },
              ]}
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-[10px] font-bold uppercase text-slate-500">Name</label>
            <input
              value={compLabel}
              onChange={(e) => setCompLabel(e.target.value)}
              placeholder="Mid Term Exam"
              className="block w-full h-9 px-3 rounded-lg border text-xs mt-1"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500">Out of</label>
            <input
              type="number"
              min={1}
              value={compMax}
              onChange={(e) => setCompMax(Number(e.target.value))}
              className="block w-20 h-9 px-2 rounded-lg border text-xs mt-1"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500">Weight %</label>
            <input
              type="number"
              min={0}
              max={100}
              value={compWeight}
              onChange={(e) => setCompWeight(Number(e.target.value))}
              className="block w-20 h-9 px-2 rounded-lg border text-xs mt-1"
            />
          </div>
          <button
            type="submit"
            className="h-9 px-4 rounded-lg bg-rose-600 text-white text-xs font-bold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left p-3 font-bold">Student</th>
              {ctComponents.map((c) => (
                <th key={c.id} className="p-3 font-bold text-center group relative min-w-[100px]">
                  <div className="flex items-center justify-center gap-1">
                    <span>{c.label}</span>
                    {isFaculty && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingComponent(c);
                            setEditLabel(c.label);
                            setEditMax(c.max_score);
                            setEditWeight(c.weight_percent);
                          }}
                          className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer"
                          title="Edit"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm(`Are you sure you want to delete component "${c.label}"?`)) {
                              try {
                                await deleteComponent(c.id);
                                toast.success("Component deleted");
                              } catch {
                                toast.error("Could not delete component");
                              }
                            }
                          }}
                          className="p-1 hover:bg-rose-100 rounded text-rose-600 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] font-normal text-slate-400">
                    ({c.max_score}/100)
                  </div>
                </th>
              ))}
              {ctComponents.length > 0 && (
                <th className="p-3 font-bold text-center bg-amber-50">
                  CT Avg
                </th>
              )}
              {evalComponents.map((c) => (
                <th key={c.id} className="p-3 font-bold text-center group relative min-w-[120px]">
                  <div className="flex items-center justify-center gap-1">
                    <span>{c.label}</span>
                    {isFaculty && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingComponent(c);
                            setEditLabel(c.label);
                            setEditMax(c.max_score);
                            setEditWeight(c.weight_percent);
                          }}
                          className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer"
                          title="Edit"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm(`Are you sure you want to delete component "${c.label}"?`)) {
                              try {
                                await deleteComponent(c.id);
                                toast.success("Component deleted");
                              } catch {
                                toast.error("Could not delete component");
                              }
                            }
                          }}
                          className="p-1 hover:bg-rose-100 rounded text-rose-600 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] font-normal text-slate-400">
                    ({c.max_score} pts{c.component_type === "portal" ? " · assignment" : ""})
                  </div>
                </th>
              ))}
              <th className="p-3 font-bold text-center">Total %</th>
              <th className="p-3 font-bold text-center">Grade</th>
              <th className="p-3 font-bold text-center">GPA</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-b border-slate-100">
                <td className="p-3 font-semibold">{s.name}</td>
                {ctComponents.map((c) => {
                  const ct = s.ct_scores.find((x) => x.code === c.component_code);
                  return (
                    <td key={c.id} className="p-2 text-center">
                      {isFaculty ? (
                        <input
                          type="number"
                          min={0}
                          max={c.max_score}
                          defaultValue={ct?.score ?? ""}
                          className="w-14 h-7 text-center border rounded"
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (!Number.isNaN(v)) {
                              void saveComponentGrade(
                                Number(s.id),
                                c.component_code,
                                v,
                                c.max_score
                              );
                            }
                          }}
                        />
                      ) : (
                        (ct?.score ?? "—")
                      )}
                    </td>
                  );
                })}
                {ctComponents.length > 0 && (
                  <td className="p-3 text-center font-bold bg-amber-50/50">
                    {isFaculty ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCtStudent(s);
                          const initialEdits: Record<string, string> = {};
                          ctComponents.forEach((c) => {
                            const scoreObj = s.ct_scores.find(
                              (x) => x.code === c.component_code
                            );
                            initialEdits[c.component_code] =
                              scoreObj?.score != null ? String(scoreObj.score) : "";
                          });
                          setCtEdits(initialEdits);
                        }}
                        className="hover:underline text-amber-700 focus:outline-none flex items-center justify-center gap-1 mx-auto cursor-pointer"
                        title="Click to edit individual CT marks"
                      >
                        <span>{s.ct_average != null ? s.ct_average.toFixed(1) : "—"}</span>
                        <Edit className="w-3 h-3 text-amber-500 hover:text-amber-700" />
                      </button>
                    ) : (
                      s.ct_average != null ? s.ct_average.toFixed(1) : "—"
                    )}
                  </td>
                )}
                {evalComponents.map((c) => {
                  const ev = s.evaluations.find((x) => x.code === c.component_code);
                  return (
                    <td key={c.id} className="p-2 text-center">
                      {isFaculty ? (
                        <input
                          type="number"
                          min={0}
                          max={c.max_score}
                          defaultValue={ev?.score ?? ""}
                          className="w-14 h-7 text-center border rounded"
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (!Number.isNaN(v)) {
                              void saveComponentGrade(
                                Number(s.id),
                                c.component_code,
                                v,
                                c.max_score
                              );
                            }
                          }}
                        />
                      ) : (
                        (ev?.score ?? "—")
                      )}
                    </td>
                  );
                })}
                <td className="p-3 text-center font-bold">{s.total_percent}%</td>
                <td className="p-3 text-center">{s.letter_grade}</td>
                <td className="p-3 text-center">{s.gpa_points.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Grade Component Modal */}
      {editingComponent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setEditingComponent(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-display text-lg font-bold text-slate-800">
              Edit Component: {editingComponent.label}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 font-sans">Name</label>
                <input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="block w-full h-9 px-3 rounded-lg border text-sm mt-1 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 font-sans">Out of</label>
                <input
                  type="number"
                  min={1}
                  value={editMax}
                  onChange={(e) => setEditMax(Number(e.target.value))}
                  className="block w-full h-9 px-3 rounded-lg border text-sm mt-1 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 font-sans">Weight %</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={editWeight}
                  onChange={(e) => setEditWeight(Number(e.target.value))}
                  className="block w-full h-9 px-3 rounded-lg border text-sm mt-1 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setEditingComponent(null)}
                className="h-9 px-4 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!editLabel.trim()) return;
                  try {
                    await updateComponent(editingComponent.id, {
                      label: editLabel.trim(),
                      max_score: editMax,
                      weight_percent: editWeight,
                    });
                    setEditingComponent(null);
                    toast.success("Component updated");
                  } catch {
                    toast.error("Could not update component");
                  }
                }}
                className="h-9 px-4 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit CT Marks Modal */}
      {editingCtStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setEditingCtStudent(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div>
              <h3 className="font-display text-lg font-bold text-slate-800">
                Edit CT Marks
              </h3>
              <p className="text-xs text-slate-500 font-semibold">{editingCtStudent.name}</p>
            </div>
            <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
              {ctComponents.map((c) => (
                <div key={c.id}>
                  <label className="text-[10px] font-bold uppercase text-slate-500 font-sans">
                    {c.label} (Max: {c.max_score})
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={c.max_score}
                    value={ctEdits[c.component_code] ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCtEdits((prev) => ({ ...prev, [c.component_code]: val }));
                    }}
                    className="block w-full h-9 px-3 rounded-lg border text-sm mt-1 focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setEditingCtStudent(null)}
                className="h-9 px-4 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    for (const c of ctComponents) {
                      const valStr = ctEdits[c.component_code];
                      const val = valStr === "" || valStr === undefined ? 0 : Number(valStr);
                      await saveComponentGrade(
                        Number(editingCtStudent.id),
                        c.component_code,
                        val,
                        c.max_score
                      );
                    }
                    setEditingCtStudent(null);
                    toast.success("CT marks saved");
                  } catch {
                    toast.error("Could not save CT marks");
                  }
                }}
                className="h-9 px-4 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 cursor-pointer"
              >
                Save Marks
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
