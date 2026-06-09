import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Building2,
  Filter,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { CatalogueCourse, CourseTypeCode } from "@/data/mockCatalogue";
import { COURSE_TYPES } from "@/lib/courseSchedule";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

type DepartmentRow = { id: number; code: string; name: string };

type AdminData = ReturnType<typeof useAdmin>;

const adminFieldLabel =
  "block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5";

const adminDialogContent =
  "max-w-md w-[calc(100%-2rem)] bg-white border border-[#dce5d4] shadow-2xl rounded-2xl p-6 sm:max-w-lg";

function deriveDepartmentCode(name: string): string {
  const words = name.trim().match(/[A-Za-z0-9]+/g) ?? [];
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].toUpperCase().slice(0, 20);
  return words.map((w) => w[0].toUpperCase()).join("").slice(0, 20);
}

export function AdminCoursesPanel({ admin }: { admin: AdminData }) {
  const {
    courses,
    departments,
    loading,
    saveCourse,
    deactivateCourse,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    refresh,
  } = admin;

  const [deptSearch, setDeptSearch] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");

  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [deptName, setDeptName] = useState("");
  const [deptCode, setDeptCode] = useState("");
  const [deptCodeTouched, setDeptCodeTouched] = useState(false);
  const [deptSaving, setDeptSaving] = useState(false);

  const [editDeptTarget, setEditDeptTarget] = useState<DepartmentRow | null>(null);
  const [editDeptName, setEditDeptName] = useState("");
  const [deptUpdating, setDeptUpdating] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<DepartmentRow | null>(null);
  const [deptDeleting, setDeptDeleting] = useState(false);

  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<CatalogueCourse>>({
    code: "",
    title: "",
    credit: 3,
    department: "",
    description: "",
    has_project: false,
    course_type_code: "theory",
  });

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const courseCountByDept = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of courses) {
      counts[c.department] = (counts[c.department] ?? 0) + 1;
    }
    return counts;
  }, [courses]);

  const filteredDepartments = useMemo(() => {
    const q = deptSearch.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter(
      (d) => d.code.toLowerCase().includes(q) || d.name.toLowerCase().includes(q)
    );
  }, [departments, deptSearch]);

  const filteredCourses = useMemo(() => {
    const q = courseSearch.trim().toLowerCase();
    return courses.filter((c) => {
      if (deptFilter !== "all" && c.department !== deptFilter) return false;
      if (!q) return true;
      return (
        c.code.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.department.toLowerCase().includes(q)
      );
    });
  }, [courses, courseSearch, deptFilter]);

  const deptLabel = (code: string) => {
    const d = departments.find((x) => x.code === code);
    return d ? `${d.code} — ${d.name}` : code;
  };

  const activeDept = deptFilter !== "all" ? departments.find((d) => d.code === deptFilter) : null;

  const openAddDepartment = () => {
    setDeptName("");
    setDeptCode("");
    setDeptCodeTouched(false);
    setDeptDialogOpen(true);
  };

  const openEditDepartment = (dept: DepartmentRow) => {
    setEditDeptTarget(dept);
    setEditDeptName(dept.name);
  };

  const handleDeptNameChange = (name: string) => {
    setDeptName(name);
    if (!deptCodeTouched) {
      setDeptCode(deriveDepartmentCode(name));
    }
  };

  const submitDepartment = async () => {
    if (!deptName.trim()) {
      toast.error("Department name is required.");
      return;
    }
    const normalizedCode = deptCode.trim().toUpperCase();
    if (normalizedCode && departments.some((d) => d.code === normalizedCode)) {
      toast.error(`Department code "${normalizedCode}" already exists.`);
      return;
    }
    setDeptSaving(true);
    try {
      const dept = await createDepartment(deptName.trim(), normalizedCode || undefined);
      setDeptDialogOpen(false);
      setDeptName("");
      setDeptCode("");
      setDeptCodeTouched(false);
      toast.success(`Department added: ${dept.code} — ${dept.name}`, {
        action: {
          label: "Add course",
          onClick: () => openCreateCourse(dept.code),
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add department.");
    } finally {
      setDeptSaving(false);
    }
  };

  const saveEditDepartment = async () => {
    if (!editDeptTarget) return;
    if (!editDeptName.trim()) {
      toast.error("Department name is required.");
      return;
    }
    setDeptUpdating(true);
    try {
      const dept = await updateDepartment(editDeptTarget.id, editDeptName.trim());
      setEditDeptTarget(null);
      toast.success(`Department updated: ${dept.code} — ${dept.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update department.");
    } finally {
      setDeptUpdating(false);
    }
  };

  const confirmDeleteDepartment = async () => {
    if (!deleteTarget) return;
    setDeptDeleting(true);
    try {
      const res = await deleteDepartment(deleteTarget.id);
      const courseMsg =
        res.courses_deleted > 0
          ? ` ${res.courses_deleted} course${res.courses_deleted === 1 ? "" : "s"} removed.`
          : "";
      if (deptFilter === deleteTarget.code) setDeptFilter("all");
      toast.success(`Department deleted: ${deleteTarget.code}.${courseMsg}`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete department.");
    } finally {
      setDeptDeleting(false);
    }
  };

  const openCreateCourse = (preferredDept?: string) => {
    setEditingCode(null);
    const dept =
      preferredDept ??
      (deptFilter !== "all" ? deptFilter : undefined) ??
      departments[0]?.code ??
      "";
    setForm({
      code: "",
      title: "",
      credit: 3,
      department: dept,
      description: "",
      has_project: false,
      course_type_code: "theory",
    });
    setCourseDialogOpen(true);
  };

  const openEditCourse = (course: CatalogueCourse) => {
    setEditingCode(course.code);
    setForm({ ...course });
    setCourseDialogOpen(true);
  };

  const submitCourse = async () => {
    if (!form.code?.trim() || !form.title?.trim()) {
      toast.error("Course code and title are required.");
      return;
    }
    if (!editingCode && !form.department) {
      toast.error("Select a department before saving.");
      return;
    }
    if (!editingCode && departments.length === 0) {
      toast.error("Add a department first, then create courses.");
      return;
    }
    try {
      await saveCourse(
        {
          code: form.code.trim(),
          title: form.title.trim(),
          credit: Number(form.credit ?? 3),
          department: String(form.department ?? ""),
          description: form.description ?? "",
          has_project: Boolean(form.has_project),
          course_type_code: (form.course_type_code ?? "theory") as CourseTypeCode,
        },
        editingCode
      );
      toast.success(editingCode ? "Course updated." : "Course created.");
      setCourseDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save course.");
    }
  };

  const removeCourse = async (code: string) => {
    if (!confirm(`Deactivate ${code}? It will be hidden from the catalog.`)) return;
    try {
      await deactivateCourse(code);
      toast.success("Course deactivated.");
    } catch {
      toast.error("Could not deactivate course.");
    }
  };

  const filterByDepartment = (code: string) => {
    setDeptFilter((prev) => (prev === code ? "all" : code));
  };

  if (loading && courses.length === 0 && departments.length === 0) {
    return <AdminLoading />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Academic infrastructure"
        title="Course catalog"
        description="Organize departments and courses. Filter by department, then add or edit offerings in place."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={openAddDepartment} className={adminBtnSecondary}>
              <Building2 className="w-4 h-4" />
              Add department
            </button>
            <button
              type="button"
              onClick={() => openCreateCourse()}
              disabled={departments.length === 0}
              className={adminBtnPrimary}
              title={departments.length === 0 ? "Add a department first" : undefined}
            >
              <Plus className="w-4 h-4" />
              Add course
            </button>
          </div>
        }
      />

      <div className={adminCard + " overflow-hidden"}>
        <div className="px-4 py-4 border-b border-[#eef2e8] bg-gradient-to-r from-[#fafcf8] to-white">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-rose-600 shrink-0" />
            <h3 className="text-sm font-bold text-slate-800">Academic catalog</h3>
            <span className="text-xs font-semibold text-slate-400">
              {departments.length} dept{departments.length === 1 ? "" : "s"} · {courses.length}{" "}
              course{courses.length === 1 ? "" : "s"}
            </span>
          </div>
          <p className="text-xs text-slate-500 pl-6">
            Click a department row to filter courses below. Use the header buttons to add new
            entries.
          </p>
        </div>

        <div className="px-4 py-3 border-b border-[#eef2e8] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Departments</p>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              value={deptSearch}
              onChange={(e) => setDeptSearch(e.target.value)}
              placeholder="Search departments…"
              className={adminInput + " h-9 text-xs pl-9"}
            />
          </div>
        </div>

        {filteredDepartments.length === 0 ? (
          <div className="p-6">
            <EmptyState
              message={
                departments.length === 0
                  ? "No departments yet. Use Add department to create your first one."
                  : "No departments match your search."
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead className="bg-[#f5f8f2] text-left text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3 text-right">Courses</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDepartments.map((d) => {
                  const courseCount = courseCountByDept[d.code] ?? 0;
                  const isActiveFilter = deptFilter === d.code;
                  return (
                    <tr
                      key={d.id}
                      onClick={() => filterByDepartment(d.code)}
                      className={
                        "border-t border-[#eef2e8] cursor-pointer transition-colors " +
                        (isActiveFilter
                          ? "bg-rose-50/80 hover:bg-rose-50"
                          : "hover:bg-[#fafcf8]")
                      }
                    >
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 font-bold text-slate-800">
                          {d.code}
                          {isActiveFilter ? (
                            <span className="text-[9px] font-bold uppercase tracking-wide text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded-md">
                              Filtered
                            </span>
                          ) : null}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{d.name}</td>
                      <td className="px-4 py-3 text-right text-slate-500 tabular-nums">
                        {courseCount}
                      </td>
                      <td
                        className="px-4 py-3 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => openEditDepartment(d)}
                          className="text-rose-600 text-xs font-semibold hover:underline inline-flex items-center gap-1 mr-3"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(d)}
                          className="text-slate-400 hover:text-rose-600 inline-flex items-center gap-1 text-xs font-semibold"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t-2 border-[#eef2e8]" />

        <div className="px-4 py-3 border-b border-[#eef2e8] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-rose-600 shrink-0" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Courses
            </p>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:items-center">
            {activeDept ? (
              <button
                type="button"
                onClick={() => setDeptFilter("all")}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
              >
                <Filter className="w-3 h-3" />
                {activeDept.code}
                <X className="w-3 h-3 opacity-70" />
              </button>
            ) : null}
            <AppSelect
              size="sm"
              value={deptFilter}
              onValueChange={setDeptFilter}
              className={adminSelect + " w-full sm:w-44"}
              options={[
                { value: "all", label: "All departments" },
                ...departments.map((d) => ({
                  value: d.code,
                  label: `${d.code} — ${d.name}`,
                })),
              ]}
            />
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                placeholder="Search code or title…"
                className={adminInput + " h-9 text-xs pl-9 w-full"}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-[#f5f8f2] text-left text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Credits</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <p className="text-sm text-slate-500">
                      {courses.length === 0
                        ? "No courses yet. Add a department, then create your first course."
                        : "No courses match your filters."}
                    </p>
                    {departments.length > 0 && courses.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => openCreateCourse()}
                        className="mt-3 text-rose-600 text-xs font-semibold hover:underline"
                      >
                        Add first course
                      </button>
                    ) : null}
                  </td>
                </tr>
              ) : (
                filteredCourses.map((c) => (
                  <tr key={c.code} className="border-t border-[#eef2e8] hover:bg-[#fafcf8]">
                    <td className="px-4 py-3 font-bold text-slate-800">{c.code}</td>
                    <td className="px-4 py-3 text-slate-600">{c.title}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{deptLabel(c.department)}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {COURSE_TYPES.find((t) => t.code === c.course_type_code)?.label ?? "Theory"}
                      <span className="block text-[11px] text-slate-400">
                        {COURSE_TYPES.find((t) => t.code === c.course_type_code)?.durationLabel ??
                          "1h 20m"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 tabular-nums">{c.credit}</td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEditCourse(c)}
                        className="text-rose-600 text-xs font-semibold hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeCourse(c.code)}
                        className="text-slate-400 hover:text-rose-600 inline-flex items-center gap-1 text-xs font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Deactivate
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
        <DialogContent className={adminDialogContent}>
          <DialogHeader className="text-left">
            <DialogTitle className="text-lg font-bold text-slate-800">Add department</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Set a short code for catalogs and filters. Leave code blank to auto-generate from the
              name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div>
              <label className={adminFieldLabel}>Name</label>
              <input
                className={adminInput}
                placeholder="e.g. Computer Science & Engineering"
                value={deptName}
                autoFocus
                onChange={(e) => handleDeptNameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void submitDepartment();
                  }
                }}
              />
            </div>
            <div>
              <label className={adminFieldLabel}>Code</label>
              <input
                className={adminInput + " font-mono uppercase"}
                placeholder="e.g. CSE"
                maxLength={20}
                value={deptCode}
                onChange={(e) => {
                  setDeptCodeTouched(true);
                  setDeptCode(e.target.value.toUpperCase());
                }}
              />
              <p className="text-xs text-slate-500 mt-1.5">
                {deptCode.trim()
                  ? `Will be saved as ${deptCode.trim().toUpperCase().slice(0, 20)}`
                  : "Auto-suggested from name when left empty"}
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setDeptDialogOpen(false)}
              className={adminBtnSecondary}
              disabled={deptSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void submitDepartment()}
              disabled={deptSaving || !deptName.trim()}
              className={adminBtnPrimary}
            >
              {deptSaving ? "Saving…" : "Create department"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editDeptTarget != null}
        onOpenChange={(open) => {
          if (!open && !deptUpdating) setEditDeptTarget(null);
        }}
      >
        <DialogContent className={adminDialogContent}>
          <DialogHeader className="text-left">
            <DialogTitle className="text-lg font-bold text-slate-800">Edit department</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {editDeptTarget ? (
                <>
                  Code <span className="font-mono font-semibold text-slate-700">{editDeptTarget.code}</span>{" "}
                  cannot be changed after creation.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="py-1">
            <label className={adminFieldLabel}>Name</label>
            <input
              className={adminInput}
              value={editDeptName}
              autoFocus
              onChange={(e) => setEditDeptName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void saveEditDepartment();
                }
              }}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setEditDeptTarget(null)}
              className={adminBtnSecondary}
              disabled={deptUpdating}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void saveEditDepartment()}
              disabled={deptUpdating || !editDeptName.trim()}
              className={adminBtnPrimary}
            >
              {deptUpdating ? "Saving…" : "Save changes"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
        <DialogContent className={adminDialogContent + " sm:max-w-xl"}>
          <DialogHeader className="text-left">
            <DialogTitle className="text-lg font-bold text-slate-800">
              {editingCode ? "Edit course" : "Add course"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Courses appear in the catalog and can be offered as sections each trimester.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-1">
            <div>
              <label className={adminFieldLabel}>Course code</label>
              <input
                className={adminInput + " font-mono"}
                placeholder="e.g. CS101"
                value={form.code ?? ""}
                disabled={!!editingCode}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              />
            </div>
            <div>
              <label className={adminFieldLabel}>Credits</label>
              <input
                className={adminInput}
                type="number"
                min={0}
                step={0.5}
                value={form.credit ?? 3}
                onChange={(e) => setForm((f) => ({ ...f, credit: Number(e.target.value) }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={adminFieldLabel}>Title</label>
              <input
                className={adminInput}
                placeholder="Course title"
                value={form.title ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <label className={adminFieldLabel}>Course type</label>
              <AppSelect
                className={adminSelect}
                value={form.course_type_code ?? "theory"}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    course_type_code: v as CourseTypeCode,
                  }))
                }
                options={COURSE_TYPES.map((t) => ({
                  value: t.code,
                  label: `${t.label} (${t.durationLabel} class)`,
                }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={adminFieldLabel}>Department</label>
              <AppSelect
                className={adminSelect}
                value={form.department ?? ""}
                disabled={departments.length === 0}
                onValueChange={(v) => setForm((f) => ({ ...f, department: v }))}
                placeholder={departments.length === 0 ? "No departments" : "Select department"}
                options={[
                  {
                    value: "",
                    label: departments.length === 0 ? "No departments" : "Select department",
                  },
                  ...departments.map((d) => ({
                    value: d.code,
                    label: `${d.code} — ${d.name}`,
                  })),
                ]}
              />
            </div>
            <label className="sm:col-span-2 flex items-start gap-2.5 p-3 rounded-xl border border-[#eef2e8] bg-[#fafcf8] cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 rounded border-[#dce5d4] text-rose-600 focus:ring-[#7d9b76]"
                checked={Boolean(form.has_project)}
                onChange={(e) => setForm((f) => ({ ...f, has_project: e.target.checked }))}
              />
              <span className="text-sm text-slate-700">
                <span className="font-semibold block">Team management</span>
                <span className="text-xs text-slate-500">
                  Enable project teams in the section hub for this course.
                </span>
              </span>
            </label>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setCourseDialogOpen(false)}
              className={adminBtnSecondary}
            >
              Cancel
            </button>
            <button type="button" onClick={() => void submitCourse()} className={adminBtnPrimary}>
              {editingCode ? "Save changes" : "Create course"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open && !deptDeleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className={adminDialogContent}>
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="text-lg font-bold flex items-center gap-2 text-rose-600">
              <ShieldAlert className="w-5 h-5" />
              Delete department?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed mt-2">
              {deleteTarget ? (
                <>
                  This will permanently delete{" "}
                  <span className="font-semibold text-slate-700">
                    {deleteTarget.code} — {deleteTarget.name}
                  </span>{" "}
                  and all{" "}
                  <span className="font-semibold text-slate-700">
                    {courseCountByDept[deleteTarget.code] ?? 0} course
                    {(courseCountByDept[deleteTarget.code] ?? 0) === 1 ? "" : "s"}
                  </span>{" "}
                  in this department, including sections, enrollments, blogs, and forum threads.
                  This cannot be undone.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex gap-2">
            <AlertDialogCancel
              disabled={deptDeleting}
              className="h-10 px-4 rounded-xl border border-[#dce5d4] text-sm font-semibold"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deptDeleting}
              onClick={(e) => {
                e.preventDefault();
                void confirmDeleteDepartment();
              }}
              className="h-10 px-4 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700"
            >
              {deptDeleting ? "Deleting…" : "Yes, delete department"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
