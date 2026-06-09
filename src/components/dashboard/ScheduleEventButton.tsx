import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { EventDialog } from "./EventDialog";

export function ScheduleEventButton({
  label = "Add Event",
  initialDate,
  className,
  size = "sm",
}: {
  label?: string;
  initialDate?: Date | null;
  className?: string;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | null>(null);

  const openDialog = () => {
    setDate(initialDate ?? new Date());
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className={cn(
          "inline-flex items-center gap-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold transition shadow-sm cursor-pointer shrink-0",
          size === "sm" ? "px-4 py-2 text-xs" : "px-4 py-2.5 text-sm",
          className
        )}
      >
        <Plus className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
        {label}
      </button>
      <EventDialog open={open} onClose={() => setOpen(false)} initialDate={date} />
    </>
  );
}
