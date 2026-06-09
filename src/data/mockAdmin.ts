/** Admin console domain types (API-backed; no demo seed data). */

import type { CatalogueCourse } from "./mockCatalogue";
import type { CourseOffering } from "./mockRoutine";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "student" | "faculty" | "admin";
  status: "active" | "pending" | "suspended";
  department?: string;
};

export type SystemAnnouncement = {
  id: string;
  title: string;
  content: string;
  scheduledFor?: string;
  createdAt: Date;
};

const KEY_COURSES = "disciplan_admin_courses";
const KEY_SECTIONS = "disciplan_admin_sections";
const KEY_USERS = "disciplan_admin_users";
const KEY_ANNOUNCEMENTS = "disciplan_admin_announcements";

function getStoredData<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getAdminCourses(): CatalogueCourse[] {
  return getStoredData<CatalogueCourse[]>(KEY_COURSES, []);
}

export function getAdminSections(): CourseOffering[] {
  return getStoredData<CourseOffering[]>(KEY_SECTIONS, []);
}

export function getAdminUsers(): AdminUser[] {
  return getStoredData<AdminUser[]>(KEY_USERS, []);
}

export function getSystemAnnouncements(): SystemAnnouncement[] {
  return getStoredData<SystemAnnouncement[]>(KEY_ANNOUNCEMENTS, []);
}
