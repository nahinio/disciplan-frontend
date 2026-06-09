import { useState } from "react";
import { Plus, Trash2, UserCheck, Clock, Check, X } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import type { useAdmin } from "@/hooks/useAdmin";
import {
  AdminLoading,
  AdminPageHeader,
  adminBtnPrimary,
  adminBtnSecondary,
  adminCard,
  adminInput,
} from "./admin-ui";

type AdminData = ReturnType<typeof useAdmin>;

export function AdminFacultyRosterPanel({ admin }: { admin: AdminData }) {
  const {
    facultyRoster,
    facultyVerificationRequests,
    loading,
    addFacultyRoster,
    removeFacultyRoster,
    approveFacultyVerification,
    rejectFacultyVerification,
  } = admin;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const trimmedEmail = email.trim().toLowerCase();
  const emailDomainValid =
    !trimmedEmail || trimmedEmail.endsWith("@uiu.ac.bd");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    if (!trimmedName || !normalizedEmail) {
      toast.error("Enter both name and email.");
      return;
    }
    if (!normalizedEmail.endsWith("@uiu.ac.bd")) {
      setEmailError("Faculty email must end with @uiu.ac.bd (e.g. name@uiu.ac.bd).");
      toast.error("Use a @uiu.ac.bd email address.");
      return;
    }
    setEmailError(null);
    setSubmitting(true);
    try {
      await addFacultyRoster(trimmedName, normalizedEmail);
      toast.success("Faculty added to roster.");
      setName("");
      setEmail("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not add faculty.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeFacultyRoster(id);
      toast.success("Faculty removed from roster.");
    } catch {
      toast.error("Could not remove faculty entry.");
    }
  };

  if (loading && facultyRoster.length === 0 && facultyVerificationRequests.length === 0) {
    return <AdminLoading />;
  }

  const pendingRoster = facultyRoster.filter((f) => f.status === "pending");
  const claimed = facultyRoster.filter((f) => f.status === "claimed");

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Faculty management"
        title="Faculty portal"
        description="Pre-register faculty, review verification requests, and manage faculty access."
      />

      {facultyVerificationRequests.length > 0 && (
        <div className={adminCard + " overflow-hidden"}>
          <div className="px-5 py-4 border-b border-[#dce5d4] flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <h3 className="font-semibold text-slate-800">
              Verification requests ({facultyVerificationRequests.length})
            </h3>
          </div>
          <ul className="divide-y divide-[#eef3e8]">
            {facultyVerificationRequests.map((req) => (
              <li key={req.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800">{req.name}</p>
                  <p className="text-xs text-slate-500">{req.email}</p>
                  {req.message && (
                    <p className="text-xs text-slate-600 mt-1 italic">&ldquo;{req.message}&rdquo;</p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1">
                    Requested {new Date(req.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    className={adminBtnPrimary + " h-9 px-3"}
                    onClick={() =>
                      void approveFacultyVerification(req.id).then(() =>
                        toast.success("Faculty approved — they now have dashboard access.")
                      )
                    }
                  >
                    <Check className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    type="button"
                    className={adminBtnSecondary + " h-9 px-3 text-rose-600 border-rose-200"}
                    onClick={() =>
                      void rejectFacultyVerification(req.id).then(() =>
                        toast.success("Request rejected.")
                      )
                    }
                  >
                    <X className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={(e) => void handleAdd(e)} className={adminCard + " p-5 space-y-4"}>
        <p className="text-sm font-semibold text-slate-700">Pre-register faculty (instant access on signup)</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400">Full name</label>
            <input
              className={adminInput + " mt-1"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr. Sarah Ahmed"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400">UIU email</label>
            <input
              type="email"
              className={
                adminInput +
                " mt-1" +
                (emailError || (trimmedEmail && !emailDomainValid)
                  ? " border-rose-300 focus:border-rose-400"
                  : "")
              }
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(null);
              }}
              placeholder="name@uiu.ac.bd"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Only official UIU addresses (<span className="font-mono">@uiu.ac.bd</span>) are
              accepted.
            </p>
            {(emailError || (trimmedEmail && !emailDomainValid)) && (
              <p className="text-[11px] text-rose-600 mt-1 font-medium">
                {emailError ?? "Email must end with @uiu.ac.bd"}
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className={adminBtnPrimary}
            disabled={
              submitting ||
              !name.trim() ||
              !trimmedEmail ||
              !emailDomainValid
            }
          >
            <Plus className="w-4 h-4" />
            Add to roster
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={adminCard + " overflow-hidden"}>
          <div className="px-5 py-4 border-b border-[#dce5d4] flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <h3 className="font-semibold text-slate-800">Awaiting signup ({pendingRoster.length})</h3>
          </div>
          {pendingRoster.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">No pre-registered faculty awaiting signup.</p>
          ) : (
            <ul className="divide-y divide-[#eef3e8]">
              {pendingRoster.map((f) => (
                <li key={f.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">{f.name}</p>
                    <p className="text-xs text-slate-500 truncate">{f.email}</p>
                  </div>
                  <button
                    type="button"
                    className={adminBtnSecondary + " h-8 px-2 text-rose-600 border-rose-200"}
                    onClick={() => void handleRemove(f.id)}
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={adminCard + " overflow-hidden"}>
          <div className="px-5 py-4 border-b border-[#dce5d4] flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="font-semibold text-slate-800">Active faculty ({claimed.length})</h3>
          </div>
          {claimed.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">No active faculty yet.</p>
          ) : (
            <ul className="divide-y divide-[#eef3e8]">
              {claimed.map((f) => (
                <li key={f.id} className="px-5 py-3">
                  <p className="font-medium text-slate-800 truncate">{f.name}</p>
                  <p className="text-xs text-slate-500 truncate">{f.email}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
