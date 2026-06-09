import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Clock,
  Loader2,
  Trash2,
  Upload,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import type { useAdmin } from "@/hooks/useAdmin";
import {
  AdminLoading,
  AdminPageHeader,
  adminBtnPrimary,
  adminBtnSecondary,
  adminCard,
  adminInput,
} from "./admin-ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AdminData = ReturnType<typeof useAdmin>;

interface StudentSummary {
  id: string;
  name: string;
  email: string;
  department: string;
  enrollmentCount: number;
}

interface EnrollmentRow {
  enrollment_id: number;
  course_code: string;
  course_title: string;
  section_label: string;
  section_key: string;
}

interface EnrollmentRequest {
  id: string;
  studentName: string;
  studentEmail: string;
  courseCode: string;
  courseTitle: string;
  sectionLabel: string;
  message?: string;
  createdAt: string;
}

function mapStudent(row: Record<string, unknown>): StudentSummary {
  return {
    id: String(row.id),
    name: String(row.name ?? row.email ?? "Student"),
    email: String(row.email ?? ""),
    department: String(row.department_code ?? "—"),
    enrollmentCount: Number(row.enrollment_count ?? 0),
  };
}

function mapRequest(row: Record<string, unknown>): EnrollmentRequest {
  return {
    id: String(row.id),
    studentName: String(row.student_name ?? ""),
    studentEmail: String(row.student_email ?? ""),
    courseCode: String(row.course_code ?? ""),
    courseTitle: String(row.course_title ?? ""),
    sectionLabel: String(row.section_label ?? ""),
    message: row.message ? String(row.message) : undefined,
    createdAt: String(row.created_at ?? ""),
  };
}

export function AdminEnrollmentsPanel({ admin }: { admin: AdminData }) {
  const { sections, loading: adminLoading } = admin;
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [addCourse, setAddCourse] = useState("");
  const [addSection, setAddSection] = useState("");
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    total: number;
    enrolled: number;
    skipped_already_enrolled: number;
    failed: number;
    errors: { row: string; student_email: string; reason: string }[];
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const [studentsRes, requestsRes] = await Promise.all([
        api.adminListStudentsEnrollmentSummary(),
        api.adminListEnrollmentRequests("pending"),
      ]);
      setStudents(
        (studentsRes.items as Record<string, unknown>[]).map(mapStudent)
      );
      setRequests(
        (requestsRes.items as Record<string, unknown>[]).map(mapRequest)
      );
    } catch {
      toast.error("Could not load enrollment data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const loadStudentEnrollments = useCallback(async (userId: string) => {
    setLoadingEnrollments(true);
    try {
      const res = await api.adminListUserEnrollments(Number(userId));
      setEnrollments(
        (res.items as Record<string, unknown>[]).map((r) => ({
          enrollment_id: Number(r.enrollment_id),
          course_code: String(r.course_code ?? ""),
          course_title: String(r.course_title ?? ""),
          section_label: String(r.section_label ?? ""),
          section_key: String(r.section_key ?? ""),
        }))
      );
    } catch {
      toast.error("Could not load student enrollments.");
      setEnrollments([]);
    } finally {
      setLoadingEnrollments(false);
    }
  }, []);

  useEffect(() => {
    if (selectedStudentId) void loadStudentEnrollments(selectedStudentId);
    else setEnrollments([]);
  }, [selectedStudentId, loadStudentEnrollments]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.toLowerCase();
    return students.filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const courseOptions = useMemo(() => {
    const seen = new Set<string>();
    return sections.filter((s) => {
      if (seen.has(s.course_code)) return false;
      seen.add(s.course_code);
      return true;
    });
  }, [sections]);

  const sectionOptions = useMemo(
    () => sections.filter((s) => s.course_code === addCourse),
    [sections, addCourse]
  );

  const handleApprove = async (id: string) => {
    try {
      await api.adminApproveEnrollmentRequest(Number(id));
      toast.success("Request approved — student enrolled.");
      await refreshAll();
      if (selectedStudentId) await loadStudentEnrollments(selectedStudentId);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not approve.");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.adminRejectEnrollmentRequest(Number(id));
      toast.success("Request rejected.");
      await refreshAll();
    } catch {
      toast.error("Could not reject request.");
    }
  };

  const handleDeleteRequest = async (id: string) => {
    try {
      await api.adminDeleteEnrollmentRequest(Number(id));
      toast.success("Request deleted.");
      await refreshAll();
    } catch {
      toast.error("Could not delete request.");
    }
  };

  const handleAddEnrollment = async () => {
    if (!selectedStudentId || !addCourse || !addSection) return;
    setAdding(true);
    try {
      await api.adminEnrollUser(Number(selectedStudentId), {
        course_code: addCourse,
        section_label: addSection,
      });
      toast.success("Section added for student.");
      setAddCourse("");
      setAddSection("");
      await refreshAll();
      await loadStudentEnrollments(selectedStudentId);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not add section.");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveEnrollment = async (courseCode: string, sectionLabel: string) => {
    if (!selectedStudentId) return;
    try {
      await api.adminDropUserEnrollment(
        Number(selectedStudentId),
        courseCode,
        sectionLabel
      );
      toast.success("Enrollment removed.");
      await refreshAll();
      await loadStudentEnrollments(selectedStudentId);
    } catch {
      toast.error("Could not remove enrollment.");
    }
  };

  const handleCsvImport = async (file: File) => {
    setImporting(true);
    setImportResult(null);
    try {
      const result = await api.adminImportEnrollmentsCsv(file);
      setImportResult(result);
      toast.success(
        `Import complete: ${result.enrolled} enrolled, ${result.skipped_already_enrolled} skipped, ${result.failed} failed.`
      );
      await refreshAll();
      if (selectedStudentId) await loadStudentEnrollments(selectedStudentId);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "CSV import failed.");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (loading && adminLoading && students.length === 0) return <AdminLoading />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Student enrollments"
        title="Section allocation"
        description="Review student requests, assign sections manually, or bulk-import from CSV."
      />

      {requests.length > 0 && (
        <div className={adminCard + " overflow-hidden"}>
          <div className="px-5 py-4 border-b border-[#dce5d4] flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <h3 className="font-semibold text-slate-800">
              Pending requests ({requests.length})
            </h3>
          </div>
          <ul className="divide-y divide-[#eef3e8]">
            {requests.map((req) => (
              <li
                key={req.id}
                className="px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800">{req.studentName}</p>
                  <p className="text-xs text-slate-500">{req.studentEmail}</p>
                  <p className="text-sm text-slate-700 mt-1">
                    {req.courseCode} · Section {req.sectionLabel}
                    {req.courseTitle ? ` — ${req.courseTitle}` : ""}
                  </p>
                  {req.message && (
                    <p className="text-xs text-slate-500 mt-1 italic">"{req.message}"</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void handleApprove(req.id)}
                    className={adminBtnPrimary + " text-xs"}
                  >
                    <Check className="w-3.5 h-3.5" />
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleReject(req.id)}
                    className={adminBtnSecondary + " text-xs"}
                  >
                    <X className="w-3.5 h-3.5" />
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteRequest(req.id)}
                    className={adminBtnSecondary + " text-xs text-rose-600 border-rose-200"}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={adminCard + " p-5 space-y-4"}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-800">Bulk CSV import</h3>
            <p className="text-xs text-slate-500 mt-1">
              Columns: <code className="text-[11px]">student_email, course_code, section_label</code>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleCsvImport(f);
              }}
            />
            <button
              type="button"
              disabled={importing}
              onClick={() => fileRef.current?.click()}
              className={adminBtnPrimary}
            >
              {importing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Upload CSV
            </button>
          </div>
        </div>
        {importResult && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm space-y-2">
            <p>
              <strong>{importResult.enrolled}</strong> enrolled ·{" "}
              <strong>{importResult.skipped_already_enrolled}</strong> already enrolled ·{" "}
              <strong>{importResult.failed}</strong> failed
            </p>
            {importResult.errors.length > 0 && (
              <ul className="text-xs text-rose-700 space-y-1 max-h-32 overflow-y-auto">
                {importResult.errors.map((e, i) => (
                  <li key={i}>
                    Row {e.row}: {e.student_email || "—"} — {e.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className={adminCard + " overflow-hidden flex flex-col min-h-[420px]"}>
          <div className="px-5 py-4 border-b border-[#dce5d4]">
            <h3 className="font-semibold text-slate-800">Students</h3>
            <p className="text-xs text-slate-500 mt-1">
              Includes students with zero sections — select one to manage enrollments.
            </p>
            <input
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Search name or email…"
              className={adminInput + " mt-3"}
            />
          </div>
          <ul className="divide-y divide-[#eef3e8] overflow-y-auto flex-1">
            {filteredStudents.length === 0 ? (
              <li className="px-5 py-8 text-sm text-slate-500 text-center">No students found.</li>
            ) : (
              filteredStudents.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedStudentId(s.id)}
                    className={
                      "w-full text-left px-5 py-3 hover:bg-[#f8faf5] transition " +
                      (selectedStudentId === s.id ? "bg-[#f0f5eb] border-l-2 border-[#7d9b76]" : "")
                    }
                  >
                    <p className="font-medium text-slate-800 truncate">{s.name}</p>
                    <p className="text-xs text-slate-500 truncate">{s.email}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {s.department} · {s.enrollmentCount} section
                      {s.enrollmentCount === 1 ? "" : "s"}
                    </p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className={adminCard + " p-5 space-y-5 min-h-[420px]"}>
          {!selectedStudent ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 text-slate-500">
              <UserPlus className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-sm">Select a student to view or edit their sections.</p>
            </div>
          ) : (
            <>
              <div>
                <h3 className="font-semibold text-slate-800">{selectedStudent.name}</h3>
                <p className="text-xs text-slate-500">{selectedStudent.email}</p>
              </div>

              {loadingEnrollments ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : enrollments.length === 0 ? (
                <p className="text-sm text-slate-500 rounded-lg border border-dashed border-[#dce5d4] px-4 py-6 text-center">
                  No sections assigned yet. Add one below.
                </p>
              ) : (
                <ul className="space-y-2">
                  {enrollments.map((e) => (
                    <li
                      key={e.enrollment_id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-[#eef3e8] px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-slate-800">
                          {e.course_code} · {e.section_label}
                        </p>
                        <p className="text-xs text-slate-500">{e.course_title}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          void handleRemoveEnrollment(e.course_code, e.section_label)
                        }
                        className="text-slate-400 hover:text-rose-600 p-1"
                        aria-label="Remove enrollment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="border-t border-[#eef3e8] pt-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Add section
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select
                    value={addCourse}
                    onValueChange={(v) => {
                      setAddCourse(v);
                      setAddSection("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courseOptions.map((c) => (
                        <SelectItem key={c.course_code} value={c.course_code}>
                          {c.course_code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={addSection}
                    onValueChange={setAddSection}
                    disabled={!addCourse}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Section" />
                    </SelectTrigger>
                    <SelectContent>
                      {sectionOptions.map((s) => (
                        <SelectItem key={`${s.course_code}-${s.section}`} value={s.section}>
                          {s.section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <button
                  type="button"
                  disabled={adding || !addCourse || !addSection}
                  onClick={() => void handleAddEnrollment()}
                  className={adminBtnPrimary}
                >
                  {adding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  Add to student
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
