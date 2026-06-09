import { useState } from "react";
import { Plus } from "lucide-react";
import { AppSelect } from "@/components/ui/app-select";
import { toast } from "sonner";
import { useSectionGrades } from "@/hooks/useSectionGrades";
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
  const { students, rubric, loading, addComponent, saveComponentGrade } = useSectionGrades(
    courseCode,
    sectionLabel
  );
  const [compLabel, setCompLabel] = useState("");
  const [compMax, setCompMax] = useState(30);
  const [compWeight, setCompWeight] = useState(30);
  const [compType, setCompType] = useState<"ct" | "evaluation">("evaluation");

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
              onValueChange={(v) => setCompType(v as "ct" | "evaluation")}
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
                <th key={c.id} className="p-3 font-bold text-center">
                  {c.label}
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
                <th key={c.id} className="p-3 font-bold text-center">
                  {c.label}
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
                    {s.ct_average != null ? s.ct_average.toFixed(1) : "—"}
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
    </div>
  );
}
