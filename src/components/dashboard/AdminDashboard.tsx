import { useAdmin } from "@/hooks/useAdmin";
import { AdminOverviewPanel } from "@/components/admin/AdminOverviewPanel";
import { AdminCoursesPanel } from "@/components/admin/AdminCoursesPanel";
import { AdminSectionsPanel } from "@/components/admin/AdminSectionsPanel";
import { AdminUsersPanel } from "@/components/admin/AdminUsersPanel";
import { AdminFacultyRosterPanel } from "@/components/admin/AdminFacultyRosterPanel";
import { AdminModerationPanel } from "@/components/admin/AdminModerationPanel";
import { AdminAnnouncementsPanel } from "@/components/admin/AdminAnnouncementsPanel";
import { AdminPublishPanel } from "@/components/admin/AdminPublishPanel";
import { AdminEnrollmentsPanel } from "@/components/admin/AdminEnrollmentsPanel";

interface AdminDashboardProps {
  view: string;
}

export function AdminDashboard({ view }: AdminDashboardProps) {
  const admin = useAdmin();
  const activeTab = view || "overview";

  switch (activeTab) {
    case "courses":
      return <AdminCoursesPanel admin={admin} />;
    case "sections":
      return <AdminSectionsPanel admin={admin} />;
    case "faculty":
      return <AdminFacultyRosterPanel admin={admin} />;
    case "enrollments":
      return <AdminEnrollmentsPanel admin={admin} />;
    case "users":
      return <AdminUsersPanel admin={admin} />;
    case "publish":
      return <AdminPublishPanel admin={admin} />;
    case "moderation":
      return <AdminModerationPanel admin={admin} />;
    case "system":
      return <AdminAnnouncementsPanel admin={admin} />;
    case "management":
      return <AdminPublishPanel admin={admin} />;
    case "overview":
    default:
      return <AdminOverviewPanel admin={admin} />;
  }
}
