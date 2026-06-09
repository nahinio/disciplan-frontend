import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api";
import { deletePlannerEvent } from "@/lib/eventPlanActions";
import { canManagePlannerEvent, type PlannerEventRef } from "@/lib/eventPlanUtils";
import { useTasks } from "@/hooks/useTasks";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
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
import { EventDialog } from "./EventDialog";

export function EventPlanMenu({
  eventRef,
  className,
  size = "sm",
}: {
  eventRef: PlannerEventRef;
  className?: string;
  size?: "sm" | "md";
}) {
  const { refresh: refreshTasks } = useTasks();
  const { refresh: refreshCalendar } = useCalendarEvents();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!canManagePlannerEvent(eventRef)) return null;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deletePlannerEvent(eventRef);
      toast.success("Event deleted");
      await Promise.all([refreshTasks(), refreshCalendar()]).catch(() => undefined);
      setConfirmOpen(false);
      setMenuOpen(false);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Could not delete event";
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const btnSize = size === "sm" ? "w-7 h-7" : "w-8 h-8";

  return (
    <>
      <div className={cn("relative", className)}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          className={cn(
            "grid place-items-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer",
            btnSize
          )}
          aria-label="Event options"
        >
          <MoreHorizontal className={iconSize} />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[9rem] rounded-xl border border-border bg-card shadow-lg py-1 overflow-hidden">
              {eventRef.eventPlanId ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    setEditOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
              ) : null}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  setConfirmOpen(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </>
        )}
      </div>

      {eventRef.eventPlanId ? (
        <EventDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          planId={eventRef.eventPlanId}
        />
      ) : null}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this event?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the event and any linked tasks from your planner. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
