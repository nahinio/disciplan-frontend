import { api } from "@/lib/api";
import type { PlannerEventRef } from "@/lib/eventPlanUtils";

export async function deletePlannerEvent(ref: PlannerEventRef): Promise<void> {
  if (ref.eventPlanId) {
    await api.deleteEventPlan(ref.eventPlanId);
    return;
  }
  if (ref.calendarEventId) {
    await api.deleteCalendarEvent(ref.calendarEventId);
    return;
  }
  if (ref.taskId) {
    await api.deleteTask(ref.taskId);
  }
}
