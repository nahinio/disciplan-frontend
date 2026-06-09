import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CourseRow, type RowState } from "./CourseRow";
import type { ProfileData } from "./OnboardingFlow";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { clearSignupDraft, getSignupDraft } from "@/lib/auth";
import { invalidateEnrollmentData } from "@/lib/invalidateAppData";
import { useUserStats } from "@/hooks/useUserStats";

interface Props {
  profile: ProfileData;
  onBack: () => void;
}

let rid = 0;
const newRow = (): RowState => ({ id: `row-${++rid}-${Date.now()}` });

export function RoutineStep({ profile, onBack }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { refreshProfile } = useUserStats();
  const [rows, setRows] = useState<RowState[]>([newRow()]);
  const [submitting, setSubmitting] = useState(false);

  const takenCodes =
    profile.role === "faculty" ? [] : rows.map((r) => r.courseCode).filter((c): c is string => Boolean(c));
  const filledCount = rows.filter((r) => r.courseCode && r.section).length;
  const lastRow = rows[rows.length - 1];
  const canAdd = Boolean(lastRow?.courseCode && lastRow?.section);

  const update = (id: string, next: RowState) =>
    setRows((rs) => rs.map((r) => (r.id === id ? next : r)));

  const remove = (id: string) =>
    setRows((rs) => {
      const filtered = rs.filter((r) => r.id !== id);
      return filtered.length ? filtered : [newRow()];
    });

  const finish = async () => {
    const draft = getSignupDraft();
    if (!draft) {
      toast.error("Session expired. Please sign up again.");
      navigate({ to: "/signup" });
      return;
    }

    const sections = rows
      .filter((r) => r.courseCode && r.section)
      .map((r) => ({ course_code: r.courseCode!, section_label: r.section! }));

    if (sections.length === 0) {
      toast.error(
        profile.role === "faculty"
          ? "Add at least one section you teach."
          : "Add at least one course section."
      );
      return;
    }

    setSubmitting(true);
    try {
      const reg = await api.register({
        email: draft.email,
        password: profile.password,
        display_name: profile.name,
        department_id: profile.departmentId,
        role_code: profile.role,
      });

      if (profile.role === "faculty" && (reg.verification_pending || reg.status_code === "pending")) {
        clearSignupDraft();
        await refreshProfile();
        toast.success("Verification submitted", {
          description: "An administrator will review your faculty account shortly.",
        });
        navigate({ to: "/dashboard" });
        return;
      }

      await api.completeOnboarding({
        display_name: profile.name,
        department_id: profile.departmentId,
        sections,
      });
      clearSignupDraft();
      await invalidateEnrollmentData(qc);
      await refreshProfile();
      toast.success(`Welcome, ${profile.name.split(" ")[0] || "friend"}!`, {
        description:
          profile.role === "faculty"
            ? `${filledCount} teaching section${filledCount === 1 ? "" : "s"} linked.`
            : `${filledCount} section${filledCount === 1 ? "" : "s"} added to your routine.`,
      });
      navigate({ to: "/dashboard" });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Onboarding failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-rose-600 font-medium">
          <span className="w-1 h-1 rounded-full bg-rose-600" />
          Step 2 of 2
        </span>
        <h1 className="mt-3 font-display text-3xl md:text-4xl tracking-tighter font-semibold leading-[1.05]">
          {profile.role === "faculty" ? "Select sections you teach" : "Build your class routine"}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {profile.role === "faculty"
            ? "Choose the course sections assigned to you this semester."
            : "Search for a course, pick your section, and we'll fill in the rest from the UIU schedule."}
        </p>
      </div>

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {rows.map((row) => (
            <CourseRow
              key={row.id}
              row={row}
              takenCodes={takenCodes}
              canRemove={rows.length > 1 || Boolean(row.courseCode)}
              onChange={(next) => update(row.id, next)}
              onRemove={() => remove(row.id)}
            />
          ))}
        </AnimatePresence>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-10"
          disabled={!canAdd}
          onClick={() => setRows((rs) => [...rs, newRow()])}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add another course
        </Button>
      </div>

      <div className="mt-10 flex items-center justify-between">
        <Button type="button" variant="ghost" className="h-11" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back
        </Button>
        <Button
          type="button"
          className="h-11 px-6 bg-rose-600 hover:bg-rose-700 text-white"
          disabled={filledCount === 0 || submitting}
          onClick={() => void finish()}
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Finish setup
              <Check className="w-4 h-4 ml-1.5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
