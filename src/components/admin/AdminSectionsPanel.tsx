import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import {
  type ScheduleKey,
  courseTypeMeta,
  defaultScheduleKey,
  formatDurationMinutes,
  scheduleOptionLabel,
  scheduleOptionsForType,
} from "@/lib/courseSchedule";
import type { useAdmin } from "@/hooks/useAdmin";
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
import {
  AdminLoading,
  AdminPageHeader,
  EmptyState,
  adminBtnPrimary,
  adminBtnSecondary,
  adminCard,
  adminInput,
  adminSelect,
} from "./admin-ui";
import { AppSelect } from "@/components/ui/app-select";

type AdminData = ReturnType<typeof useAdmin>;

export function AdminSectionsPanel({ admin }: { admin: AdminData }) {
  const {
    sections,
    courses,
    departments,
    users,
    loading,
    createSection,
    updateSection,
    deactivateSection,
  } = admin;
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<(typeof sections)[number] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [courseCode, setCourseCode] = useState("");
  const [sectionLabel, setSectionLabel] = useState("");
  const [room, setRoom] = useState("");
  const [facultyUserId, setFacultyUserId] = useState("");
  const [scheduleKey, setScheduleKey] = useState<ScheduleKey>("sat_tue");
  const [startsAt, setStartsAt] = useState("09:00");

  const facultyUsers = useMemo(
    () => users.filter((u) => u.role === "faculty" && u.status === "active"),
    [users]
  );

  useEffect(() => {
    if (!courseCode && courses.length > 0) {
      setCourseCode(courses[0].code);
    }
  }, [courses, courseCode]);

  const courseDeptByCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of courses) map.set(c.code, c.department);
    return map;
  }, [courses]);

  const coursesForDeptFilter = useMemo(() => {
    if (deptFilter === "all") return courses;
    return courses.filter((c) => c.department === deptFilter);
  }, [courses, deptFilter]);

  useEffect(() => {
    if (courseFilter === "all") return;
    if (!coursesForDeptFilter.some((c) => c.code === courseFilter)) {
      setCourseFilter("all");
    }
  }, [courseFilter, coursesForDeptFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sections.filter((s) => {
      if (deptFilter !== "all" && courseDeptByCode.get(s.course_code) !== deptFilter) {
        return false;
      }
      if (courseFilter !== "all" && s.course_code !== courseFilter) return false;
      if (!q) return true;
      return (
        s.course_code.toLowerCase().includes(q) ||
        s.section.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        s.faculty_name.toLowerCase().includes(q)
      );
    });
  }, [sections, deptFilter, courseFilter, search, courseDeptByCode]);

  const selectedCourseMeta = useMemo(
    () => courses.find((c) => c.code === courseCode),
    [courses, courseCode]
  );
  const selectedTypeMeta = courseTypeMeta(selectedCourseMeta?.course_type_code);
  const scheduleOptions = scheduleOptionsForType(selectedCourseMeta?.course_type_code);

  useEffect(() => {
    if (!selectedCourseMeta) return;
    const allowed = scheduleOptionsForType(selectedCourseMeta.course_type_code);
    if (!allowed.some((o) => o.key === scheduleKey)) {
      setScheduleKey(defaultScheduleKey(selectedCourseMeta.course_type_code));
    }
  }, [selectedCourseMeta, scheduleKey]);

  const resetForm = () => {
    setSectionLabel("");
    setRoom("");
    setFacultyUserId("");
    setStartsAt("09:00");
    if (courses[0]) {
      setCourseCode(courses[0].code);
      setScheduleKey(defaultScheduleKey(courses[0].course_type_code));
    } else {
      setScheduleKey("sat_tue");
    }
  };

  const startEdit = (section: (typeof sections)[number]) => {
    if (!section.section_id) return;
    setEditId(section.section_id);
    setRoom(section.rooms[0] ?? "");
    setFacultyUserId(
      section.faculty_user_id != null ? String(section.faculty_user_id) : ""
    );
    setScheduleKey(
      (section.schedule_key as ScheduleKey) ??
        defaultScheduleKey(section.course_type_code)
    );
    setStartsAt(section.starts_at ?? "09:00");
    setFormOpen(false);
  };

  const submitCreate = async () => {
    if (!courseCode || !sectionLabel.trim()) {
      toast.error("Course and section label are required.");
      return;
    }
    if (!scheduleKey || !startsAt) {
      toast.error("Select class days and a start time.");
      return;
    }
    try {
      await createSection(
        courseCode,
        sectionLabel.trim().toUpperCase(),
        room.trim() || undefined,
        facultyUserId ? Number(facultyUserId) : undefined,
        { schedule_key: scheduleKey, starts_at: startsAt }
      );
      toast.success("Section created for the current trimester.");
      setFormOpen(false);
      resetForm();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not create section.");
    }
  };

  const submitEdit = async () => {
    if (!editId) return;
    if (!scheduleKey || !startsAt) {
      toast.error("Select class days and a start time.");
      return;
    }
    try {
      await updateSection(editId, {
        room: room.trim(),
        faculty_user_id: facultyUserId ? Number(facultyUserId) : null,
        schedule_key: scheduleKey,
        starts_at: startsAt,
      });
      toast.success("Section updated.");
      setEditId(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update section.");
    }
  };

  const confirmRemove = async () => {
    if (!deleteTarget?.section_id) return;
    setDeleting(true);
    try {
      await deactivateSection(deleteTarget.section_id);
      toast.success(
        `Section ${deleteTarget.course_code} ${deleteTarget.section} and all related data removed.`
      );
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not remove section.");
    } finally {
      setDeleting(false);
    }
  };

  const renderScheduleFields = () => (
    <>
      <AppSelect
        className={adminSelect}
        value={scheduleKey}
        onValueChange={(v) => setScheduleKey(v as ScheduleKey)}
        options={scheduleOptions.map((o) => ({ value: o.key, label: o.label }))}
      />
      <input
        className={adminInput}
        type="time"
        value={startsAt}
        onChange={(e) => setStartsAt(e.target.value)}
      />
    </>
  );

  if (loading && sections.length === 0 && courses.length === 0) return <AdminLoading />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Trimester & sections"
        title="Section management"
        description="Create, update, or remove sections for the current trimester."
        actions={
          <button
            type="button"
            onClick={() => {
              resetForm();
              setEditId(null);
              setFormOpen(true);
            }}
            className={adminBtnPrimary}
            disabled={courses.length === 0}
          >
            <Plus className="w-4 h-4" />
            Add section
          </button>
        }
      />

      {courses.length === 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          Add courses in the Courses tab before creating sections.
        </p>
      )}

      <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-start sm:items-center">
        <AppSelect
          size="sm"
          className={adminSelect + " max-w-[220px]"}
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
        <AppSelect
          size="sm"
          className={adminSelect + " max-w-[240px]"}
          value={courseFilter}
          onValueChange={setCourseFilter}
          options={[
            { value: "all", label: "All courses" },
            ...coursesForDeptFilter.map((c) => ({
              value: c.code,
              label: `${c.code} — ${c.title}`,
            })),
          ]}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search sections…"
          className={adminInput + " max-w-sm h-9 text-xs"}
        />
      </div>

      {formOpen && (
        <div className={adminCard + " p-5 space-y-3"}>
          <h3 className="font-semibold text-slate-800">New section</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <AppSelect
              className={adminSelect}
              value={courseCode}
              onValueChange={setCourseCode}
              placeholder="No courses available"
              options={
                courses.length === 0
                  ? [{ value: "", label: "No courses available" }]
                  : courses.map((c) => ({
                      value: c.code,
                      label: `${c.code} — ${c.title} (${courseTypeMeta(c.course_type_code).label})`,
                    }))
              }
            />
            <input
              className={adminInput}
              placeholder="Section (e.g. A)"
              maxLength={2}
              value={sectionLabel}
              onChange={(e) => setSectionLabel(e.target.value.toUpperCase())}
            />
            <input
              className={adminInput}
              placeholder="Room (optional)"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
            />
            <AppSelect
              className={adminSelect}
              value={facultyUserId}
              onValueChange={setFacultyUserId}
              placeholder="Assign faculty (optional)"
              options={[
                { value: "", label: "Assign faculty (optional)" },
                ...facultyUsers.map((f) => ({
                  value: String(f.id),
                  label: `${f.name} (${f.department})`,
                })),
              ]}
            />
            {renderScheduleFields()}
          </div>
          <p className="text-xs text-slate-500">
            {selectedTypeMeta.code === "theory" ? (
              <>
                Theory meets on <span className="font-semibold text-slate-700">two days</span>{" "}
                (pick one pair). Each slot is{" "}
              </>
            ) : (
              <>
                Lab meets on <span className="font-semibold text-slate-700">one day</span>. Class
                length is{" "}
              </>
            )}
            <span className="font-semibold text-slate-700">{selectedTypeMeta.durationLabel}</span>
            {selectedTypeMeta.code === "theory" ? " per day" : ""} — end time is set from the start
            slot.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => void submitCreate()} className={adminBtnPrimary}>
              Create section
            </button>
            <button type="button" onClick={() => setFormOpen(false)} className={adminBtnSecondary}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {editId && (
        <div className={adminCard + " p-5 space-y-3"}>
          <h3 className="font-semibold text-slate-800">Edit section #{editId}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <input
              className={adminInput}
              placeholder="Room"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
            />
            <AppSelect
              className={adminSelect}
              value={facultyUserId}
              onValueChange={setFacultyUserId}
              placeholder="No faculty assigned"
              options={[
                { value: "", label: "No faculty assigned" },
                ...facultyUsers.map((f) => ({
                  value: String(f.id),
                  label: `${f.name} (${f.department})`,
                })),
              ]}
            />
            {renderScheduleFields()}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => void submitEdit()} className={adminBtnPrimary}>
              Save
            </button>
            <button type="button" onClick={() => setEditId(null)} className={adminBtnSecondary}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className={adminCard + " overflow-hidden"}>
        <table className="w-full text-sm">
          <thead className="bg-[#f5f8f2] text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Course</th>
              <th className="px-4 py-3 text-left">Section</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Schedule</th>
              <th className="px-4 py-3 text-left">Room</th>
              <th className="px-4 py-3 text-left">Faculty</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8">
                  <EmptyState
                    message={
                      sections.length === 0
                        ? "No sections for the current trimester. Create one above."
                        : "No sections match your filters."
                    }
                  />
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr
                  key={s.section_id ?? `${s.course_code}-${s.section}`}
                  className="border-t border-[#eef2e8]"
                >
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-800">{s.course_code}</p>
                    <p className="text-xs text-slate-500 truncate max-w-[200px]">{s.title}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold">{s.section}</td>
                  <td className="px-4 py-3 text-slate-500">
                    <span className="font-semibold text-slate-700">
                      {s.course_type_label ?? courseTypeMeta(s.course_type_code).label}
                    </span>
                    <span className="block text-[11px] text-slate-400">
                      {formatDurationMinutes(
                        s.class_duration_minutes ??
                          courseTypeMeta(s.course_type_code).durationMinutes
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {s.schedule_key || s.schedule_days || s.times[0] ? (
                      <>
                        <span className="font-medium text-slate-700">
                          {scheduleOptionLabel(s.course_type_code, s.schedule_key) ||
                            s.schedule_days ||
                            s.days.join(", ")}
                        </span>
                        {s.times[0] && (
                          <span className="block text-[11px]">{s.times[0]}</span>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{s.rooms[0] || "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{s.faculty_name || "—"}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {s.section_id && (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(s)}
                          className="text-xs font-semibold text-slate-600 hover:text-rose-600 inline-flex items-center gap-1"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(s)}
                          className="text-xs font-semibold text-rose-600 hover:underline inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AlertDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="max-w-md w-full bg-popover border border-border shadow-2xl rounded-2xl p-6">
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="text-lg font-bold flex items-center gap-2 text-rose-600">
              <ShieldAlert className="w-5 h-5" />
              Remove section?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed mt-2">
              {deleteTarget ? (
                <>
                  This will permanently remove section{" "}
                  <span className="font-semibold text-slate-700">
                    {deleteTarget.course_code} {deleteTarget.section}
                  </span>{" "}
                  and all related data: enrollments, grades, assessments, announcements,
                  doubts, chat groups, and section teams. This cannot be undone.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex gap-2">
            <AlertDialogCancel
              disabled={deleting}
              className="h-9 px-4 rounded-full border border-border text-xs font-bold"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void confirmRemove();
              }}
              className="h-9 px-4 rounded-full bg-rose-600 text-white text-xs font-bold hover:bg-rose-600/90"
            >
              {deleting ? "Removing…" : "Yes, remove section"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
