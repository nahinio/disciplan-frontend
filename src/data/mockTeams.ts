/** Team domain types (API-backed; no demo seed data). */

export interface TeamMember {
  name?: string;
  email: string;
  status: "accepted" | "pending" | "rejected";
  pendingTasks: string[];
  userId?: number;
}

export interface TeamTask {
  id: string;
  title: string;
  description?: string;
  assignedToEmail?: string;
  assignedToName?: string;
  dueDate: Date;
  status: "pending" | "completed";
}

export interface ImportantDate {
  id: string;
  title: string;
  date: Date;
  description?: string;
}

export interface TeamAnnouncement {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  authorName: string;
  commentCount?: number;
}

export interface Team {
  id: string;
  teamName: string;
  leaderName: string;
  leaderEmail: string;
  courseCode: string;
  courseTitle: string;
  section?: string;
  members: TeamMember[];
  tasks?: TeamTask[];
  importantDates?: ImportantDate[];
  announcements?: TeamAnnouncement[];
}
