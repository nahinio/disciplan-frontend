import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FACULTY_TASK_TYPES,
  STUDENT_TASK_TYPES,
  type UserTask,
} from "@/hooks/useTasks";
import { api } from "@/lib/api";
import { AppSelect } from "@/components/ui/app-select";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  role: "student" | "faculty" | "admin";
  task?: UserTask | null;
  onSave: (body: Record<string, unknown>) => Promise<void>;
  variant?: "dashboard" | "section";
}

function effortToEnergy(minutes: number): string {
  if (minutes <= 30) return "low";
  if (minutes >= 90) return "high";
  return "medium";
}

export function TaskFormDialog({
  open,
  onOpenChange,
  role,
  task,
  onSave,
  variant = "dashboard",
}: Props) {
  const types = role === "faculty" ? FACULTY_TASK_TYPES : STUDENT_TASK_TYPES;
  const isSection = variant === "section";
  const accent = isSection ? "bg-[#7d9b76] hover:bg-[#6d8b66]" : "bg-rose-600 hover:bg-rose-700";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [plannerType, setPlannerType] = useState(types[0]?.code ?? "personal");
  const [priority, setPriority] = useState("medium");
  const [effort, setEffort] = useState("60");
  const [dueAt, setDueAt] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [uploading, setUploading] = useState(false);
  const [attachmentId, setAttachmentId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setPlannerType(task?.planner_task_type_code ?? types[0]?.code ?? "");
    setPriority(task?.priority_code ?? "medium");
    setEffort(String(task?.estimated_effort_min ?? 60));
    setDueAt(task?.due_at ? task.due_at.slice(0, 16) : "");
    setCourseCode(task?.course_code ?? "");
    setAttachmentId(task?.attachment_file_id ?? null);
  }, [open, task, types]);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await api.uploadFile(file, "tasks");
      setAttachmentId(res.file_id);
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setSaving(true);
    try {
      const effortMin = Number(effort) || 60;
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || undefined,
        planner_task_type_code: plannerType,
        priority_code: priority,
        estimated_effort_min: effortMin,
        due_at: dueAt ? new Date(dueAt).toISOString() : undefined,
        course_code: courseCode.trim() || undefined,
        attachment_file_id: attachmentId ?? undefined,
      };
      if (!task) {
        body.energy_level_code = effortToEnergy(effortMin);
      }
      await onSave(body);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const fieldClass = cn(
    "w-full h-10 mt-1 rounded-xl border px-3 text-sm transition focus:outline-none focus:ring-2",
    isSection
      ? "border-[#dce5d4] focus:ring-[#7d9b76]/30 focus:border-[#7d9b76]"
      : "border-slate-200 focus:ring-rose-500/20 focus:border-rose-400"
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border-slate-200/80 shadow-2xl p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            {task ? "Update" : "New"} planner task
          </p>
          <DialogTitle className="font-display text-xl tracking-tight">
            {task ? "Edit task" : "Add to your day"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-6 py-5">
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Title
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={fieldClass}
              placeholder="What needs doing?"
            />
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Type
            </Label>
            <AppSelect
              className={fieldClass}
              value={plannerType}
              onValueChange={setPlannerType}
              options={types.map((t) => ({ value: t.code, label: t.label }))}
            />
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Priority
            </Label>
            <AppSelect
              className={fieldClass}
              value={priority}
              onValueChange={setPriority}
              options={[
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High" },
                { value: "urgent", label: "Urgent" },
              ]}
            />
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Est. effort (minutes)
            </Label>
            <Input
              type="number"
              min={5}
              max={480}
              value={effort}
              onChange={(e) => setEffort(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Course code (optional)
            </Label>
            <Input
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              className={fieldClass}
              placeholder="CSE101"
            />
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Deadline
            </Label>
            <Input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className={fieldClass}
            />
          </div>
          {plannerType === "assignment" && (
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Attachment (PDF/MD)
              </Label>
              <Input
                type="file"
                accept=".pdf,.md,.markdown"
                className={cn(fieldClass, "py-2")}
                disabled={uploading}
                onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
              />
            </div>
          )}
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Notes
            </Label>
            <textarea
              className={cn(fieldClass, "min-h-[72px] py-2 h-auto resize-y")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional context…"
            />
          </div>
        </div>
        <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className={cn("rounded-full text-white", accent)}
            disabled={saving || !title.trim()}
            onClick={() => void submit()}
          >
            {saving ? "Saving…" : "Save task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
