import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface RefreshButtonProps {
  onClick: () => void | Promise<void>;
  loading?: boolean;
  label?: string;
  className?: string;
}

export function RefreshButton({
  onClick,
  loading = false,
  label = "Refresh",
  className,
}: RefreshButtonProps) {
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={loading}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#dce5d4] bg-white text-xs font-semibold text-slate-600 hover:bg-[#faf8f3] transition disabled:opacity-50",
        className
      )}
    >
      <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
      {label}
    </button>
  );
}
