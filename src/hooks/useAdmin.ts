import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { initialsFromName, mapCatalogueCourse } from "@/lib/offerings";
import { mapBlogPostListItem } from "@/lib/mappers";
import type { CatalogueCourse } from "@/data/mockCatalogue";
import type { CourseOffering } from "@/types/course";
import type { BlogPost } from "@/data/mockBlog";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  initials?: string;
  role: "student" | "faculty" | "admin";
  status: "active" | "suspended";
  department: string;
}

export interface FacultyRosterEntry {
  id: string;
  name: string;
  email: string;
  status: "pending" | "claimed";
  createdAt: string;
}

export interface FacultyVerificationRequest {
  id: string;
  name: string;
  email: string;
  message?: string;
  createdAt: string;
}

export interface GlobalAnnouncement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  active: boolean;
  authorName: string;
  scheduledFor?: string;
  targetAudience?: "all" | "student" | "faculty";
}

export interface AuditLog {
  id: string;
  action: string;
  timestamp: string;
  user: string;
  details?: string;
}

export interface ActivitySummary {
  total_users: number;
  active_courses: number;
  blog_posts: number;
  forum_threads: number;
  submissions: number;
  active_teams: number;
}

export interface TopCourse {
  code: string;
  title: string;
  enrollments: number;
}

function mapAdminSection(row: Record<string, unknown>): CourseOffering {
  const facultyName = String(row.faculty_name ?? "").trim() || "—";
  const room = row.room ? String(row.room) : "";
  const scheduleDays = row.schedule_days ? String(row.schedule_days) : "";
  const startsAt = row.starts_at ? String(row.starts_at) : "";
  const endsAt = row.ends_at ? String(row.ends_at) : "";
  return {
    section_id: row.section_id != null ? Number(row.section_id) : undefined,
    program: String(row.program ?? "BSCSE"),
    course_code: String(row.course_code ?? ""),
    title: String(row.course_title ?? row.title ?? ""),
    section: String(row.section ?? ""),
    rooms: room ? [room] : [],
    days: scheduleDays ? scheduleDays.split(", ").filter(Boolean) : [],
    times: startsAt && endsAt ? [`${startsAt} – ${endsAt}`] : [],
    faculty_name: facultyName,
    faculty_initial: initialsFromName(facultyName === "—" ? "NA" : facultyName),
    faculty_user_id:
      row.faculty_user_id != null ? Number(row.faculty_user_id) : undefined,
    semester_label: row.semester_label ? String(row.semester_label) : undefined,
    schedule_key: row.schedule_key ? String(row.schedule_key) : undefined,
    schedule_days: scheduleDays || undefined,
    credit: Number(row.credit ?? 3),
    course_type_code: row.course_type_code ? String(row.course_type_code) : "theory",
    course_type_label: row.course_type_label ? String(row.course_type_label) : undefined,
    class_duration_minutes:
      row.class_duration_minutes != null ? Number(row.class_duration_minutes) : undefined,
    starts_at: startsAt || undefined,
    ends_at: endsAt || undefined,
  };
}

function mapFacultyVerification(row: Record<string, unknown>): FacultyVerificationRequest {
  return {
    id: String(row.id),
    name: String(row.display_name ?? ""),
    email: String(row.email ?? ""),
    message: row.message ? String(row.message) : undefined,
    createdAt: String(row.created_at ?? ""),
  };
}

function mapFacultyRoster(row: Record<string, unknown>): FacultyRosterEntry {
  return {
    id: String(row.id),
    name: String(row.display_name ?? ""),
    email: String(row.email ?? ""),
    status: String(row.status) === "claimed" ? "claimed" : "pending",
    createdAt: String(row.created_at ?? ""),
  };
}

function mapAdminUser(row: Record<string, unknown>): AdminUser {
  const name = String(row.name ?? row.display_name ?? row.email ?? "User");
  const parts = name.trim().split(/\s+/);
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  const role = String(row.role_code ?? "student");
  return {
    id: String(row.id),
    name,
    email: String(row.email ?? ""),
    initials: role === "faculty" ? initials : undefined,
    role: role as AdminUser["role"],
    status: String(row.status_code) === "suspended" ? "suspended" : "active",
    department: String(row.department_code ?? row.department_name ?? "—"),
  };
}

function mapAnnouncement(row: Record<string, unknown>): GlobalAnnouncement {
  const audiences = String(row.target_audiences ?? "all");
  let targetAudience: GlobalAnnouncement["targetAudience"] = "all";
  if (audiences === "student" || audiences === "faculty") {
    targetAudience = audiences;
  }
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    content: String(row.content ?? row.body ?? ""),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    active: Boolean(row.active ?? row.is_active),
    authorName: String(row.author_name ?? "Administrator"),
    scheduledFor: row.scheduled_for ? String(row.scheduled_for) : undefined,
    targetAudience,
  };
}

function mapAuditLog(row: Record<string, unknown>): AuditLog {
  let details: string | undefined;
  if (row.details) {
    details =
      typeof row.details === "string"
        ? row.details
        : JSON.stringify(row.details);
  } else if (row.details_json) {
    details = String(row.details_json);
  }
  return {
    id: String(row.id),
    action: String(row.action_label ?? row.action ?? "ACTION"),
    timestamp: String(row.timestamp ?? row.created_at ?? ""),
    user: String(row.user_name ?? row.user_email ?? "System"),
    details,
  };
}

export function useAdmin() {
  const [courses, setCourses] = useState<CatalogueCourse[]>([]);
  const [sections, setSections] = useState<CourseOffering[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [facultyRoster, setFacultyRoster] = useState<FacultyRosterEntry[]>([]);
  const [facultyVerificationRequests, setFacultyVerificationRequests] = useState<
    FacultyVerificationRequest[]
  >([]);
  const [globalAnnouncements, setGlobalAnnouncements] = useState<GlobalAnnouncement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [moderationBlogs, setModerationBlogs] = useState<BlogPost[]>([]);
  const [activity, setActivity] = useState<ActivitySummary | null>(null);
  const [topCourses, setTopCourses] = useState<TopCourse[]>([]);
  const [departments, setDepartments] = useState<
    { id: number; code: string; name: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!hasLoadedRef.current) setLoading(true);

    const results = await Promise.allSettled([
      api.getCatalogue(),
      api.adminListSections(),
      api.adminListUsers(),
      api.adminListFacultyRoster(),
      api.adminListFacultyVerificationRequests("pending"),
      api.adminListAnnouncements(),
      api.adminListAuditLogs(),
      api.getBlogs({ limit: 100 }),
      api.adminActivityReport(),
      api.getDepartments(),
    ]);

    const pick = <T,>(index: number): T | null =>
      results[index].status === "fulfilled" ? (results[index] as PromiseFulfilledResult<T>).value : null;

    const catalogueRes = pick<{ items: unknown[] }>(0);
    const offeringsRes = pick<{ items: Record<string, unknown>[] }>(1);
    const usersRes = pick<{ items: unknown[] }>(2);
    const rosterRes = pick<{ items: unknown[] }>(3);
    const verificationRes = pick<{ items: unknown[] }>(4);
    const annRes = pick<{ items: unknown[] }>(5);
    const logsRes = pick<{ items: unknown[] }>(6);
    const blogsRes = pick<{ items: unknown[] }>(7);
    const activityRes = pick<{
      summary?: Record<string, unknown>;
      top_courses?: unknown[];
    }>(8);
    let deptRes = pick<{ items: { id: number; code: string; name: string }[] }>(9);

    if (!deptRes?.items?.length) {
      try {
        deptRes = await api.getDepartments();
      } catch {
        deptRes = { items: [] };
      }
    }

    setCourses(
      (catalogueRes?.items as Record<string, unknown>[] | undefined)?.map(mapCatalogueCourse) ?? []
    );
    setSections(
      (offeringsRes?.items as Record<string, unknown>[] | undefined)?.map(mapAdminSection) ?? []
    );
    setUsers(
      (usersRes?.items as Record<string, unknown>[] | undefined)?.map(mapAdminUser) ?? []
    );
    setFacultyRoster(
      (rosterRes?.items as Record<string, unknown>[] | undefined)?.map(mapFacultyRoster) ?? []
    );
    setFacultyVerificationRequests(
      (verificationRes?.items as Record<string, unknown>[] | undefined)?.map(
        mapFacultyVerification
      ) ?? []
    );
    setGlobalAnnouncements(
      (annRes?.items as Record<string, unknown>[] | undefined)?.map(mapAnnouncement) ?? []
    );
    setAuditLogs(
      (logsRes?.items as Record<string, unknown>[] | undefined)?.map(mapAuditLog) ?? []
    );
    setModerationBlogs(
      (blogsRes?.items as Record<string, unknown>[] | undefined)?.map(mapBlogPostListItem) ?? []
    );

    const summary = activityRes?.summary ?? {};
    setActivity(
      activityRes
        ? {
            total_users: Number(summary.total_users ?? 0),
            active_courses: Number(summary.active_courses ?? 0),
            blog_posts: Number(summary.blog_posts ?? 0),
            forum_threads: Number(summary.forum_threads ?? 0),
            submissions: Number(summary.submissions ?? 0),
            active_teams: Number(summary.active_teams ?? 0),
          }
        : null
    );
    setDepartments(deptRes?.items ?? []);
    setTopCourses(
      ((activityRes?.top_courses ?? []) as Record<string, unknown>[]).map((c) => ({
        code: String(c.code ?? ""),
        title: String(c.title ?? ""),
        enrollments: Number(c.enrollments ?? 0),
      }))
    );

    hasLoadedRef.current = true;
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createDepartment = async (name: string, code?: string) => {
    const res = await api.adminCreateDepartment({
      name: name.trim(),
      ...(code?.trim() ? { code: code.trim().toUpperCase() } : {}),
    });
    const dept = { id: res.id, code: res.code, name: res.name };
    setDepartments((prev) =>
      [...prev.filter((d) => d.id !== dept.id), dept].sort((a, b) =>
        a.code.localeCompare(b.code)
      )
    );
    return dept;
  };

  const updateDepartment = async (departmentId: number, name: string) => {
    const res = await api.adminUpdateDepartment(departmentId, { name: name.trim() });
    const dept = { id: res.id, code: res.code, name: res.name };
    setDepartments((prev) =>
      prev
        .map((d) => (d.id === dept.id ? dept : d))
        .sort((a, b) => a.code.localeCompare(b.code))
    );
    return dept;
  };

  const deleteDepartment = async (departmentId: number) => {
    const res = await api.adminDeleteDepartment(departmentId);
    setDepartments((prev) => prev.filter((d) => d.id !== departmentId));
    await refresh();
    return res;
  };

  const saveCourse = async (course: CatalogueCourse, editingCode: string | null) => {
    if (editingCode) {
      await api.adminUpdateCourse(editingCode, {
        title: course.title,
        has_project: course.has_project,
        course_type_code: course.course_type_code ?? "theory",
      });
    } else {
      const dept = departments.find(
        (d) => d.code === course.department || d.name === course.department
      );
      if (!dept) {
        throw new Error("Select a valid department from the list.");
      }
      await api.adminCreateCourse({
        code: course.code,
        title: course.title,
        department_id: dept.id,
        credit_hours: course.credit,
        has_project: Boolean(course.has_project),
        course_type_code: course.course_type_code ?? "theory",
      });
    }
    await refresh();
  };

  const createSection = async (
    courseCode: string,
    sectionLabel: string,
    room?: string,
    facultyUserId?: number,
    schedule?: { schedule_key: string; starts_at: string }
  ) => {
    await api.adminCreateSection({
      course_code: courseCode,
      section_label: sectionLabel,
      room: room ?? null,
      ...(facultyUserId != null ? { faculty_user_id: facultyUserId } : {}),
      ...(schedule
        ? { schedule_key: schedule.schedule_key, starts_at: schedule.starts_at }
        : {}),
    });
    await refresh();
  };

  const updateUser = async (
    userId: string,
    body: {
      display_name?: string;
      role_code?: string;
      status_code?: string;
    }
  ) => {
    await api.adminUpdateUser(Number(userId), body);
    await refresh();
  };

  const createAnnouncement = async (ann: GlobalAnnouncement) => {
    await api.adminCreateAnnouncement({
      title: ann.title,
      body: ann.content,
      is_active: ann.active,
      scheduled_for: ann.scheduledFor ?? null,
      target_audience: ann.targetAudience ?? "all",
    });
    await refresh();
  };

  const deleteBlog = async (postId: string) => {
    await api.adminDeleteBlog(Number(postId));
    await refresh();
  };

  const pinBlog = async (postId: string, pinned: boolean) => {
    await api.pinBlogPost(Number(postId), pinned);
    await refresh();
  };

  const deactivateCourse = async (courseCode: string) => {
    await api.adminUpdateCourse(courseCode, { is_active: false });
    await refresh();
  };

  const suspendUser = async (userId: string) => {
    await updateUser(userId, { status_code: "suspended" });
  };

  const activateUser = async (userId: string) => {
    await updateUser(userId, { status_code: "active" });
  };

  const deleteUser = async (
    userId: string,
    confirmEmail: string,
    deleteFacultySections = false
  ) => {
    await api.adminDeleteUser(Number(userId), {
      confirm_email: confirmEmail,
      delete_faculty_sections: deleteFacultySections,
    });
    await refresh();
  };

  const adjustPoints = async (userId: string, delta: number, reason?: string) => {
    await api.adminAdjustPoints(Number(userId), delta, reason);
    await refresh();
  };

  const deleteForumThread = async (threadId: number) => {
    await api.adminDeleteForumThread(threadId);
  };

  const moveForumThread = async (threadId: number, targetCourseCode: string) => {
    await api.adminMoveForumThread(threadId, targetCourseCode);
  };

  const mergeForumThreads = async (threadId: number, targetThreadId: number) => {
    await api.adminMergeForumThreads(threadId, targetThreadId);
  };

  const updateAnnouncement = async (
    id: string,
    body: { title?: string; body?: string; is_active?: boolean }
  ) => {
    await api.adminUpdateAnnouncement(Number(id), body);
    await refresh();
  };

  const deleteAnnouncement = async (id: string) => {
    await api.adminDeleteAnnouncement(Number(id));
    await refresh();
  };

  const updateSection = async (
    sectionId: number,
    body: {
      room?: string;
      faculty_user_id?: number | null;
      schedule_key?: string;
      starts_at?: string;
    }
  ) => {
    await api.adminUpdateSection(sectionId, body);
    await refresh();
  };

  const deactivateSection = async (sectionId: number) => {
    await api.adminDeactivateSection(sectionId);
    await refresh();
  };

  const createBlogPost = async (body: {
    course_code: string;
    topic_id?: number;
    title: string;
    excerpt: string;
    body_html: string;
    read_time_min?: number;
    cover_image_file_id?: number;
    tags?: string[];
  }) => {
    const result = await api.createBlogPost(body);
    void refresh();
    return result;
  };

  const addFacultyRoster = async (name: string, email: string) => {
    await api.adminAddFacultyRoster({ display_name: name, email });
    await refresh();
  };

  const removeFacultyRoster = async (id: string) => {
    await api.adminRemoveFacultyRoster(Number(id));
    await refresh();
  };

  const approveFacultyVerification = async (id: string) => {
    await api.adminApproveFacultyVerification(Number(id));
    await refresh();
  };

  const rejectFacultyVerification = async (id: string) => {
    await api.adminRejectFacultyVerification(Number(id));
    await refresh();
  };

  const updateBlog = async (
    postId: string,
    body: {
      title?: string;
      excerpt?: string;
      body_html?: string;
      read_time_min?: number;
      cover_image_file_id?: number | null;
    }
  ) => {
    await api.updateBlogPost(Number(postId), body);
    await refresh();
  };

  return {
    courses,
    sections,
    users,
    facultyRoster,
    facultyVerificationRequests,
    globalAnnouncements,
    auditLogs,
    moderationBlogs,
    activity,
    topCourses,
    departments,
    loading,
    refresh,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    saveCourse,
    createSection,
    updateUser,
    addFacultyRoster,
    removeFacultyRoster,
    approveFacultyVerification,
    rejectFacultyVerification,
    createAnnouncement,
    deleteBlog,
    pinBlog,
    deactivateCourse,
    suspendUser,
    activateUser,
    deleteUser,
    adjustPoints,
    deleteForumThread,
    moveForumThread,
    mergeForumThreads,
    updateAnnouncement,
    deleteAnnouncement,
    updateSection,
    deactivateSection,
    createBlogPost,
    updateBlog,
  };
}
