import { useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  X,
  CalendarIcon,
  Upload,
  Check,
  ChevronsUpDown,
  FileText,
  BookOpen,
  Repeat,
  Target,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { AppSelect } from "@/components/ui/app-select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { api, ApiError } from "@/lib/api";
import { useUserStats } from "@/hooks/useUserStats";
import { useOfferings } from "@/hooks/useOfferings";
import { useTasks } from "@/hooks/useTasks";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { usePracticeTopics } from "@/hooks/usePractice";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { planToEventForm } from "@/lib/eventPlanUtils";

export type EventType =
  | "CT"
  | "Assignment"
  | "One-time"
  | "Personal"
  | "Lecture Prep"
  | "Grading"
  | "Exam/Quiz"
  | "Meeting";

export type Priority = "Low" | "Med" | "High";
export type PersonalMode = "deadline" | "weekly";

export type EventForm = {
  title: string;
  type: EventType;
  deadline: Date | null;
  time: string;
  effort: number;
  courseCode?: string;
  section?: string;
  syllabus?: string[];
  materialSource?: "file" | "book";
  files?: { name: string; size: number; progress: number }[];
  bookRef?: string;
  notes?: string;
  priority?: Priority;
  personalMode?: PersonalMode;
  gradeComponentId?: number;
  recurrenceDay?: number;
  recurrenceTime?: string;
};

const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const initial = (date: Date | null): EventForm => ({
  title: "",
  type: "CT",
  deadline: date,
  time: "23:59",
  effort: 3,
  courseCode: undefined,
  section: undefined,
  syllabus: [],
  materialSource: "file",
  files: [],
  bookRef: "",
  notes: "",
  priority: "Med",
  personalMode: "deadline",
  recurrenceDay: 1,
  recurrenceTime: "07:00",
});

const TYPE_TO_CODE: Record<EventType, string> = {
  CT: "ct",
  Assignment: "assignment",
  "One-time": "one_time",
  Personal: "personal_goal",
  "Lecture Prep": "lecture_prep",
  Grading: "grading",
  "Exam/Quiz": "exam_quiz",
  Meeting: "meeting",
};

function schedulingMode(form: EventForm): string {
  if (form.type === "Meeting") return "calendar_only";
  if (form.type === "One-time") return "one_time";
  if (form.type === "Grading") return "grading_linked";
  if (form.type === "Personal" && form.personalMode === "weekly") return "recurring_weekly";
  return "deadline_divide";
}

export function EventDialog({
  open,
  onClose,
  initialDate = null,
  planId = null,
}: {
  open: boolean;
  onClose: () => void;
  initialDate?: Date | null;
  planId?: number | null;
}) {
  const { profile } = useUserStats();
  const { offerings } = useOfferings();
  const { refresh: refreshTasks } = useTasks();
  const { refresh: refreshCalendar } = useCalendarEvents();
  const [form, setForm] = useState<EventForm>(initial(initialDate));
  const [success, setSuccess] = useState(false);
  const [coursePopoverOpen, setCoursePopoverOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isEdit = planId != null;

  const planQuery = useQuery({
    queryKey: ["event-plan", planId],
    queryFn: async () => api.getEventPlan(planId!),
    enabled: open && isEdit,
  });

  useEffect(() => setMounted(true), []);

  const courseOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const o of offerings) {
      if (!seen.has(o.course_code)) seen.set(o.course_code, o.title);
    }
    for (const sk of profile.sections ?? []) {
      const [code] = sk.split("::");
      if (code && !seen.has(code)) {
        const match = offerings.find((o) => o.course_code === code);
        seen.set(code, match?.title ?? code);
      }
    }
    return Array.from(seen.entries()).map(([code, title]) => ({ code, title }));
  }, [offerings, profile.sections]);

  const sectionsForCourse = (courseCode: string) => {
    const fromOfferings = offerings
      .filter((o) => o.course_code === courseCode)
      .map((o) => o.section);
    if (fromOfferings.length > 0) return fromOfferings;
    return (profile.sections ?? [])
      .filter((sk) => sk.startsWith(`${courseCode}::`))
      .map((sk) => sk.split("::")[1] ?? "")
      .filter(Boolean);
  };

  const sectionOptions = useMemo(() => {
    if (!form.courseCode) return [] as string[];
    return sectionsForCourse(form.courseCode);
  }, [offerings, form.courseCode, profile.sections]);

  const { topics: practiceTopics } = usePracticeTopics(form.courseCode ?? "");

  const gradeComponentsQuery = useQuery({
    queryKey: ["grade-components", form.courseCode, form.section],
    queryFn: async () => {
      if (!form.courseCode || !form.section) return [];
      const res = await api.getGradeComponents(form.courseCode, form.section);
      return (res.items ?? []) as Array<{
        id: number;
        label: string;
        component_type: string;
      }>;
    },
    enabled: open && form.type === "Grading" && !!form.courseCode && !!form.section,
  });

  const types = useMemo(() => {
    if (profile.role === "faculty") {
      return [
        { value: "Lecture Prep" as EventType, label: "Lecture prep" },
        { value: "Grading" as EventType, label: "Grading" },
        { value: "Exam/Quiz" as EventType, label: "Exam / Quiz" },
        { value: "Meeting" as EventType, label: "Meeting" },
        { value: "One-time" as EventType, label: "One-time" },
        { value: "Personal" as EventType, label: "Personal" },
      ];
    }
    return [
      { value: "CT" as EventType, label: "Exam" },
      { value: "Assignment" as EventType, label: "Assignment" },
      { value: "One-time" as EventType, label: "One-time" },
      { value: "Personal" as EventType, label: "Personal goal" },
    ];
  }, [profile.role]);

  useEffect(() => {
    if (!open) return;
    if (isEdit && planQuery.data) {
      setForm(planToEventForm(planQuery.data));
      setSuccess(false);
      return;
    }
    if (!isEdit) {
      const init = initial(initialDate);
      init.type = profile.role === "faculty" ? "Lecture Prep" : "CT";
      setForm(init);
      setSuccess(false);
    }
  }, [open, initialDate, profile.role, isEdit, planQuery.data]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const set = <K extends keyof EventForm>(k: K, v: EventForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const mode = schedulingMode(form);
  const needsDeadline = mode === "deadline_divide" || mode === "grading_linked";
  const needsWhen = mode === "one_time" || mode === "calendar_only";
  const needsWeekly = mode === "recurring_weekly";

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if ((needsDeadline || needsWhen) && !form.deadline) {
      toast.error("Date is required");
      return;
    }
    if (form.type === "Grading" && !form.gradeComponentId) {
      toast.error("Select a grade component");
      return;
    }

    const starts = new Date(form.deadline!);
    const [hh, mm] = form.time.split(":").map(Number);
    starts.setHours(hh || 0, mm || 0, 0, 0);
    const ends = new Date(starts.getTime() + (form.effort || 3) * 30 * 60000);

    const priorityMap: Record<Priority, string> = { Low: "low", Med: "medium", High: "high" };
    const sectionKey =
      form.courseCode && form.section ? `${form.courseCode}::${form.section}` : undefined;

    const body: Record<string, unknown> = {
      title: form.title.trim(),
      description: form.notes || undefined,
      scheduling_mode: mode,
      planner_task_type_code:
        profile.role === "faculty" && form.type === "Personal"
          ? "personal"
          : TYPE_TO_CODE[form.type],
      course_code: form.courseCode,
      section_key: sectionKey,
      priority_code: priorityMap[form.priority ?? "Med"],
      energy_level_code: form.effort <= 2 ? "low" : form.effort >= 4 ? "high" : "medium",
      estimated_effort_min: Math.max(15, (form.effort || 3) * 30),
    };

    if (needsDeadline || mode === "grading_linked") {
      body.deadline_at = starts.toISOString();
    }
    if (needsWhen) {
      body.starts_at = starts.toISOString();
      body.ends_at = ends.toISOString();
    }
    if (mode === "grading_linked") {
      body.grade_component_id = form.gradeComponentId;
    }
    if (needsWeekly) {
      body.recurrence = [
        {
          day_of_week: form.recurrenceDay ?? 1,
          starts_time: form.recurrenceTime ?? "07:00",
          duration_min: Math.max(15, (form.effort || 3) * 30),
        },
      ];
    }

    try {
      if (isEdit && planId) {
        await api.updateEventPlan(planId, body);
        setSuccess(true);
        toast.success("Event updated");
      } else {
        await api.createEventPlan(body);
        setSuccess(true);
        const msg =
          mode === "deadline_divide"
            ? "Plan created — daily slices start today"
            : mode === "recurring_weekly"
              ? "Weekly goal scheduled"
              : mode === "calendar_only"
                ? "Meeting added to calendar"
                : "Event scheduled";
        toast.success(msg);
      }
      void Promise.all([refreshTasks(), refreshCalendar()]).catch(() => undefined);
      setTimeout(() => onClose(), 600);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Could not save event";
      toast.error(message);
    }
  };

  const isCourseRequired =
    form.type === "CT" ||
    form.type === "Lecture Prep" ||
    form.type === "Exam/Quiz" ||
    form.type === "Grading";

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-foreground/30 backdrop-blur-sm p-4 sm:p-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 240, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl my-auto max-h-[min(90vh,calc(100vh-2rem))] overflow-y-auto no-scrollbar rounded-2xl bg-card shadow-2xl border border-border"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 grid place-items-center w-8 h-8 rounded-full hover:bg-muted text-muted-foreground z-10 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 grid place-items-center bg-card/95 backdrop-blur-sm"
                >
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 220, damping: 16 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <div className="w-16 h-16 rounded-full bg-rose grid place-items-center text-white shadow-lg shadow-rose/30">
                      <Check className="w-7 h-7" strokeWidth={3} />
                    </div>
                    <p className="font-display text-xl font-semibold">
                      {isEdit ? "Event updated" : "Event scheduled"}
                    </p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <LayoutGroup>
              <motion.div layout className="p-8 space-y-7">
                <motion.div layout>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2 font-bold">
                    {isEdit ? "Edit Event" : "New Event"}
                  </p>
                  <input
                    autoFocus
                    value={form.title}
                    onChange={(e) => set("title", e.target.value)}
                    placeholder="Midterm prep, grade CT-2, gym…"
                    className="w-full bg-transparent border-0 outline-none font-display text-3xl md:text-4xl font-semibold tracking-tight placeholder:text-muted-foreground/40 text-slate-800"
                  />
                </motion.div>

                <motion.div layout>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2 font-bold">
                    Type
                  </p>
                  <div className="flex flex-wrap gap-1 p-1 rounded-2xl bg-muted/60 border border-border">
                    {types.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => set("type", t.value)}
                        className={cn(
                          "px-4 py-1.5 text-xs font-semibold rounded-full transition-colors cursor-pointer",
                          form.type === t.value
                            ? "bg-foreground text-background shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </motion.div>

                {(form.type === "Personal" ||
                  (profile.role === "student" && form.type === "Personal")) && (
                  <motion.div layout className="space-y-2">
                    <Label>Goal style</Label>
                    <div className="inline-flex p-1 rounded-full bg-muted/60 border border-border">
                      <button
                        type="button"
                        onClick={() => set("personalMode", "deadline")}
                        className={cn(
                          "flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-full transition",
                          form.personalMode !== "weekly"
                            ? "bg-foreground text-background"
                            : "text-muted-foreground"
                        )}
                      >
                        <Target className="w-3.5 h-3.5" />
                        Deadline
                      </button>
                      <button
                        type="button"
                        onClick={() => set("personalMode", "weekly")}
                        className={cn(
                          "flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-full transition",
                          form.personalMode === "weekly"
                            ? "bg-foreground text-background"
                            : "text-muted-foreground"
                        )}
                      >
                        <Repeat className="w-3.5 h-3.5" />
                        Weekly habit
                      </button>
                    </div>
                  </motion.div>
                )}

                <motion.div layout className="space-y-4">
                  <AnimatePresence mode="wait">
                    {isCourseRequired && (
                      <motion.div
                        key="course-required"
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="space-y-4"
                      >
                        <CoursePicker
                          form={form}
                          setForm={setForm}
                          courseOptions={courseOptions}
                          coursePopoverOpen={coursePopoverOpen}
                          setCoursePopoverOpen={setCoursePopoverOpen}
                          sectionsForCourse={sectionsForCourse}
                          profileRole={profile.role}
                        />

                        {form.type === "Grading" && form.section && (
                          <div>
                            <Label>Grade component</Label>
                            <AppSelect
                              value={
                                form.gradeComponentId != null
                                  ? String(form.gradeComponentId)
                                  : ""
                              }
                              onValueChange={(v) =>
                                set("gradeComponentId", v ? Number(v) : undefined)
                              }
                              placeholder="Select component…"
                              options={[
                                { value: "", label: "Select component…" },
                                ...(gradeComponentsQuery.data ?? []).map((c) => ({
                                  value: String(c.id),
                                  label: `${c.label} (${c.component_type})`,
                                })),
                              ]}
                            />
                          </div>
                        )}

                        {form.courseCode && profile.role === "student" && form.type === "CT" && (
                          <div>
                            <Label>Syllabus coverage</Label>
                            <div className="rounded-xl border border-border bg-background p-3 space-y-1">
                              {practiceTopics.map((t) => t.topic).map((topic) => {
                                const checked = form.syllabus?.includes(topic) ?? false;
                                return (
                                  <label
                                    key={topic}
                                    className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/65 cursor-pointer"
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(v) => {
                                        const cur = new Set(form.syllabus || []);
                                        if (v) cur.add(topic);
                                        else cur.delete(topic);
                                        set("syllabus", Array.from(cur));
                                      }}
                                    />
                                    <span className="text-sm">{topic}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <PrioritySelector
                          value={form.priority}
                          onChange={(p) => set("priority", p)}
                        />
                      </motion.div>
                    )}

                    {form.type === "Assignment" && (
                      <motion.div
                        key="as"
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                      >
                        <AssignmentExtras form={form} set={set} />
                        <PrioritySelector
                          value={form.priority}
                          onChange={(p) => set("priority", p)}
                        />
                      </motion.div>
                    )}

                    {(form.type === "One-time" || form.type === "Meeting") && (
                      <motion.div layout className="space-y-4">
                        <div>
                          <Label>Notes</Label>
                          <Textarea
                            value={form.notes}
                            onChange={(e) => set("notes", e.target.value)}
                            placeholder="Details, location, agenda…"
                            rows={3}
                            className="resize-none"
                          />
                        </div>
                        <PrioritySelector
                          value={form.priority}
                          onChange={(p) => set("priority", p)}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {needsWeekly && (
                  <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Day</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {WEEKDAYS.map((d) => (
                          <button
                            key={d.value}
                            type="button"
                            onClick={() => set("recurrenceDay", d.value)}
                            className={cn(
                              "px-3 py-1.5 text-xs font-bold rounded-lg border",
                              form.recurrenceDay === d.value
                                ? "bg-rose text-white border-transparent"
                                : "border-border text-slate-600"
                            )}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Time</Label>
                      <input
                        type="time"
                        value={form.recurrenceTime}
                        onChange={(e) => set("recurrenceTime", e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm"
                      />
                    </div>
                  </motion.div>
                )}

                {!needsWeekly && (
                  <motion.div
                    layout
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border"
                  >
                    <div className="pt-4">
                      <Label>{needsWhen ? "When" : "Deadline"}</Label>
                      <DateTimePicker
                        date={form.deadline}
                        time={form.time}
                        onDate={(d) => set("deadline", d)}
                        onTime={(t) => set("time", t)}
                      />
                    </div>
                    <div className="pt-4">
                      <EffortSlider value={form.effort} onChange={(v) => set("effort", v)} />
                    </div>
                  </motion.div>
                )}

                {needsWeekly && (
                  <motion.div layout className="pt-2 border-t border-border">
                    <EffortSlider value={form.effort} onChange={(v) => set("effort", v)} />
                  </motion.div>
                )}

                <motion.div layout className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                  <button
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => void handleSubmit()}
                    disabled={!form.title.trim() || (isEdit && planQuery.isPending)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-rose text-white hover:bg-rose/90 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm shadow-rose/20"
                  >
                    <CalendarIcon className="w-4 h-4" />
                    {isEdit
                      ? "Save changes"
                      : mode === "deadline_divide"
                        ? "Create plan"
                        : "Schedule"}
                  </button>
                </motion.div>
              </motion.div>
            </LayoutGroup>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function CoursePicker({
  form,
  setForm,
  courseOptions,
  coursePopoverOpen,
  setCoursePopoverOpen,
  sectionsForCourse,
  profileRole,
}: {
  form: EventForm;
  setForm: React.Dispatch<React.SetStateAction<EventForm>>;
  courseOptions: { code: string; title: string }[];
  coursePopoverOpen: boolean;
  setCoursePopoverOpen: (v: boolean) => void;
  sectionsForCourse: (code: string) => string[];
  profileRole: string;
}) {
  const sectionOptions = form.courseCode ? sectionsForCourse(form.courseCode) : [];

  return (
    <>
      <div>
        <Label>Course</Label>
        <Popover modal open={coursePopoverOpen} onOpenChange={setCoursePopoverOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-background text-sm hover:border-foreground/30 transition cursor-pointer font-medium",
                !form.courseCode && "text-muted-foreground"
              )}
            >
              {form.courseCode
                ? `${form.courseCode} · ${courseOptions.find((c) => c.code === form.courseCode)?.title ?? ""}`
                : "Select a course…"}
              <ChevronsUpDown className="w-4 h-4 opacity-50" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="z-[200] w-[--radix-popover-trigger-width] p-0"
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <Command>
              <CommandInput placeholder="Search courses…" />
              <CommandList>
                <CommandEmpty>No course found.</CommandEmpty>
                <CommandGroup>
                  {courseOptions.map((c) => (
                    <CommandItem
                      key={c.code}
                      value={`${c.code} ${c.title}`}
                      onSelect={() => {
                        const sections = sectionsForCourse(c.code);
                        setForm((f) => ({
                          ...f,
                          courseCode: c.code,
                          section: profileRole === "faculty" ? sections[0] : sections[0],
                        }));
                        setCoursePopoverOpen(false);
                      }}
                      className="cursor-pointer"
                    >
                      <span className="font-semibold">{c.code}</span>
                      <span className="text-muted-foreground ml-2">{c.title}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {form.courseCode && profileRole === "faculty" && sectionOptions.length > 0 && (
        <div>
          <Label>Section</Label>
          <div className="flex flex-wrap gap-2">
            {sectionOptions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setForm((f) => ({ ...f, section: s }))}
                className={cn(
                  "px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer",
                  form.section === s
                    ? "bg-rose border-transparent text-white"
                    : "bg-white text-slate-700 border-slate-200"
                )}
              >
                Section {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function AssignmentExtras({
  form,
  set,
}: {
  form: EventForm;
  set: <K extends keyof EventForm>(k: K, v: EventForm[K]) => void;
}) {
  return (
    <>
      <div>
        <Label>Material source</Label>
        <div className="inline-flex p-1 rounded-full bg-muted/60 border border-border">
          {(
            [
              { v: "file" as const, label: "File upload", icon: FileText },
              { v: "book" as const, label: "Book reference", icon: BookOpen },
            ] as const
          ).map((o) => (
            <button
              key={o.v}
              onClick={() => set("materialSource", o.v)}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-full transition",
                form.materialSource === o.v
                  ? "bg-foreground text-background"
                  : "text-muted-foreground"
              )}
            >
              <o.icon className="w-3.5 h-3.5" />
              {o.label}
            </button>
          ))}
        </div>
      </div>
      {form.materialSource === "book" ? (
        <Textarea
          value={form.bookRef}
          onChange={(e) => set("bookRef", e.target.value)}
          placeholder="Chapter 4, problems 12–20"
          rows={3}
        />
      ) : (
        <FileUploadZone
          files={form.files || []}
          onAdd={(fs) => set("files", [...(form.files || []), ...fs])}
        />
      )}
    </>
  );
}

function DateTimePicker({
  date,
  time,
  onDate,
  onTime,
}: {
  date: Date | null;
  time: string;
  onDate: (d: Date | null) => void;
  onTime: (t: string) => void;
}) {
  return (
    <div className="flex gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-background text-sm",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="w-4 h-4 opacity-60" />
            {date
              ? date.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })
              : "Pick date"}
          </button>
        </PopoverTrigger>
        <PopoverContent className="z-[200] w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date ?? undefined}
            onSelect={(d) => onDate(d ?? null)}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      <input
        type="time"
        value={time}
        onChange={(e) => onTime(e.target.value)}
        className="w-28 px-3 py-2.5 rounded-xl border border-border bg-background text-sm"
      />
    </div>
  );
}

function EffortSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <Label className="!mb-0">Estimated effort</Label>
        <span className="text-xs font-medium text-muted-foreground tabular-nums">{value}/5</span>
      </div>
      <div className="mt-3 px-1">
        <Slider value={[value]} min={1} max={5} step={1} onValueChange={([v]) => onChange(v)} />
        <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
          <span>Light</span>
          <span>Heavy</span>
        </div>
      </div>
    </>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2",
        className
      )}
    >
      {children}
    </p>
  );
}

function FileUploadZone({
  files,
  onAdd,
}: {
  files: { name: string; size: number; progress: number }[];
  onAdd: (f: { name: string; size: number; progress: number }[]) => void;
}) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = (fs: FileList | null) => {
    if (!fs) return;
    onAdd(Array.from(fs).map((f) => ({ name: f.name, size: f.size, progress: 100 })));
  };

  return (
    <div>
      <Label>Upload materials</Label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handle(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition",
          drag ? "border-rose bg-rose/5" : "border-border"
        )}
      >
        <Upload className="w-6 h-6 mx-auto text-muted-foreground" />
        <p className="text-sm font-medium mt-2">Drop files here</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handle(e.target.files)}
        />
      </div>
      {files.length > 0 && (
        <p className="text-xs text-muted-foreground mt-2">{files.length} file(s) attached</p>
      )}
    </div>
  );
}

function PrioritySelector({
  value,
  onChange,
}: {
  value: Priority | undefined;
  onChange: (p: Priority) => void;
}) {
  return (
    <div>
      <Label>Priority</Label>
      <div className="inline-flex p-1 rounded-full bg-muted/60 border border-border">
        {(["Low", "Med", "High"] as Priority[]).map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={cn(
              "px-4 py-1.5 text-xs font-medium rounded-full transition",
              value === p
                ? p === "High"
                  ? "bg-rose text-white"
                  : "bg-foreground text-background"
                : "text-muted-foreground"
            )}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
