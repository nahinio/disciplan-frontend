import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateEnrollmentData } from "@/lib/invalidateAppData";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { mapApiOffering } from "@/lib/offerings";
import type { CourseOffering } from "@/types/course";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserStats } from "@/hooks/useUserStats";

interface EnrollmentRequestRow {
  id: number;
  course_code: string;
  section_label: string;
  status: string;
  created_at: string;
}

export function RequestSectionDialog() {
  const qc = useQueryClient();
  const { profile, refreshProfile } = useUserStats();
  const [open, setOpen] = useState(false);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [requests, setRequests] = useState<EnrollmentRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [courseCode, setCourseCode] = useState("");
  const [sectionLabel, setSectionLabel] = useState("");
  const [message, setMessage] = useState("");

  const enrolledKeys = useMemo(
    () => new Set((profile.sections ?? []).map((s) => s.toLowerCase())),
    [profile.sections]
  );

  const pendingKeys = useMemo(
    () =>
      new Set(
        requests
          .filter((r) => r.status === "pending")
          .map((r) => `${r.course_code}::${r.section_label}`.toLowerCase())
      ),
    [requests]
  );

  const courses = useMemo(() => {
    const seen = new Set<string>();
    return offerings.filter((o) => {
      if (seen.has(o.course_code)) return false;
      seen.add(o.course_code);
      return true;
    });
  }, [offerings]);

  const sectionsForCourse = useMemo(
    () => offerings.filter((o) => o.course_code === courseCode),
    [offerings, courseCode]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [offeringsRes, requestsRes] = await Promise.all([
        api.getOfferings(),
        api.listMyEnrollmentRequests(),
      ]);
      setOfferings(offeringsRes.items.map((row) => mapApiOffering(row)));
      setRequests(
        (requestsRes.items as Record<string, unknown>[]).map((r) => ({
          id: Number(r.id),
          course_code: String(r.course_code ?? ""),
          section_label: String(r.section_label ?? ""),
          status: String(r.status ?? ""),
          created_at: String(r.created_at ?? ""),
        }))
      );
    } catch {
      toast.error("Could not load section options.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void loadData();
  }, [open, loadData]);

  const submit = async () => {
    if (!courseCode || !sectionLabel) {
      toast.error("Select a course and section.");
      return;
    }
    const key = `${courseCode}::${sectionLabel}`.toLowerCase();
    if (enrolledKeys.has(key)) {
      toast.error("You are already enrolled in this section.");
      return;
    }
    if (pendingKeys.has(key)) {
      toast.error("You already have a pending request for this section.");
      return;
    }
    setSubmitting(true);
    try {
      await api.createEnrollmentRequest({
        course_code: courseCode,
        section_label: sectionLabel,
        message: message.trim() || undefined,
      });
      toast.success("Request submitted. An admin will review it.");
      setCourseCode("");
      setSectionLabel("");
      setMessage("");
      await loadData();
      await invalidateEnrollmentData(qc);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelRequest = async (id: number) => {
    try {
      await api.cancelEnrollmentRequest(id);
      toast.success("Request cancelled.");
      await loadData();
      await invalidateEnrollmentData(qc);
    } catch {
      toast.error("Could not cancel request.");
    }
  };

  if (profile.role !== "student") return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="rounded-full border-[#dce5d4] text-slate-700 hover:bg-[#f4f8f0]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Request a section
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Request section enrollment</DialogTitle>
          <DialogDescription>
            Pick a course and section. An administrator will approve your request and your courses
            will update automatically.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Course</label>
                <Select
                  value={courseCode}
                  onValueChange={(v) => {
                    setCourseCode(v);
                    setSectionLabel("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.course_code} value={c.course_code}>
                        {c.course_code} — {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Section</label>
                <Select
                  value={sectionLabel}
                  onValueChange={setSectionLabel}
                  disabled={!courseCode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectionsForCourse.map((s) => (
                      <SelectItem key={`${s.course_code}-${s.section}`} value={s.section}>
                        Section {s.section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Note (optional)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                placeholder="Why you need this section…"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#7d9b76]"
              />
            </div>

            <Button
              onClick={() => void submit()}
              disabled={submitting || !courseCode || !sectionLabel}
              className="w-full bg-[#7d9b76] hover:bg-[#6b8865]"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit request"}
            </Button>

            {requests.length > 0 && (
              <div className="border-t border-slate-100 pt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Your requests
                </p>
                <ul className="space-y-2 max-h-40 overflow-y-auto">
                  {requests.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-2 text-sm rounded-lg bg-slate-50 px-3 py-2"
                    >
                      <div>
                        <span className="font-medium">
                          {r.course_code} · {r.section_label}
                        </span>
                        <span className="ml-2 text-xs capitalize text-slate-500">{r.status}</span>
                      </div>
                      {r.status === "pending" && (
                        <button
                          type="button"
                          onClick={() => void cancelRequest(r.id)}
                          className="text-slate-400 hover:text-rose-600"
                          aria-label="Cancel request"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      {r.status === "approved" && (
                        <button
                          type="button"
                          onClick={() => void refreshProfile()}
                          className="text-xs text-[#7d9b76] font-semibold"
                        >
                          Refresh courses
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
