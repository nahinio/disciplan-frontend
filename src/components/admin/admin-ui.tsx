import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const adminInput =
  "w-full h-10 px-3 rounded-xl border border-[#dce5d4] bg-white focus:outline-none focus:ring-2 focus:ring-rose-200/80 text-sm text-slate-800";
export const adminSelect =
  "w-full h-10 rounded-xl border-[#dce5d4] bg-white text-sm text-slate-800 focus:ring-rose-200/80";
export const adminTextarea =
  "w-full p-3 rounded-xl border border-[#dce5d4] bg-white focus:outline-none focus:ring-1 focus:ring-[#7d9b76] text-sm text-slate-800 resize-none";
export const adminBtnPrimary =
  "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition disabled:opacity-60";
export const adminBtnSecondary =
  "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-[#dce5d4] bg-white hover:bg-[#f5f8f2] text-sm font-semibold text-slate-700 transition";
export const adminCard = "bg-white border border-[#dce5d4] rounded-2xl shadow-sm";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#dce5d4] pb-5">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-rose-600">
          {eyebrow}
        </p>
        <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-slate-800 mt-1">
          {title}
        </h2>
        <p className="text-sm text-slate-500 mt-1">{description}</p>
      </div>
      {actions}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
}) {
  return (
    <div className={cn(adminCard, "p-5 flex items-center gap-4")}>
      <div className="w-10 h-10 rounded-xl bg-[#f5f8f2] text-[#5d7a56] grid place-items-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5 tabular-nums">{value}</p>
      </div>
    </div>
  );
}

export function AdminLoading({ label = "Loading admin data…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
      <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
      {label}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className={cn(adminCard, "p-8 text-center text-sm text-slate-500")}>{message}</div>
  );
}
