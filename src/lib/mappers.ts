import { initialsFromName } from "@/lib/offerings";
import type { Author, AuthorRole, BlogPost, Comment } from "@/data/mockBlog";
import type { ForumTag, ForumThread } from "@/data/mockForum";
import type { PracticeProblem, PracticeTopic } from "@/data/mockPractice";
import type {
  ImportantDate,
  Team,
  TeamAnnouncement,
  TeamMember,
  TeamTask,
} from "@/data/mockTeams";

export interface PendingTeamInvitation {
  invitationId: string;
  teamId: string;
  teamName: string;
  leaderName: string;
  leaderEmail: string;
  courseCode: string;
  courseTitle: string;
  section?: string;
}

export function mapTeamListItem(row: Record<string, unknown>): Team & { memberCount?: number; isPinned?: boolean } {
  return {
    id: String(row.id),
    teamName: String(row.team_name ?? ""),
    leaderName: String(row.leader_name ?? ""),
    leaderEmail: String(row.leader_email ?? ""),
    courseCode: String(row.course_code ?? ""),
    courseTitle: String(row.course_title ?? ""),
    section: row.section ? String(row.section) : undefined,
    members: [],
    memberCount: Number(row.member_count ?? 0),
    isPinned: Boolean(row.is_pinned),
  };
}

export function mapPendingInvitation(row: Record<string, unknown>): PendingTeamInvitation {
  return {
    invitationId: String(row.invitation_id ?? row.id),
    teamId: String(row.team_id),
    teamName: String(row.team_name ?? ""),
    leaderName: String(row.leader_name ?? ""),
    leaderEmail: String(row.leader_email ?? ""),
    courseCode: String(row.course_code ?? ""),
    courseTitle: String(row.course_title ?? ""),
    section: row.section ? String(row.section) : undefined,
  };
}

function mapTeamMember(row: Record<string, unknown>, status: TeamMember["status"]): TeamMember {
  return {
    email: String(row.email ?? ""),
    name: String(row.name ?? row.email ?? ""),
    status,
    pendingTasks: [],
    userId: row.user_id != null ? Number(row.user_id) : undefined,
  };
}

export function mapTeamDetail(row: Record<string, unknown>): Team {
  const membersRaw = Array.isArray(row.members)
    ? (row.members as Record<string, unknown>[])
    : [];
  const leader = membersRaw.find((m) => String(m.role_code) === "leader");
  const members: TeamMember[] = membersRaw
    .filter((m) => String(m.status) === "accepted")
    .map((m) => mapTeamMember(m, "accepted"));

  const pendingInvites = Array.isArray(row.pending_invitations)
    ? (row.pending_invitations as Record<string, unknown>[])
    : [];
  for (const inv of pendingInvites) {
    members.push({
      email: String(inv.invitee_email ?? ""),
      name: String(inv.invitee_email ?? ""),
      status: "pending",
      pendingTasks: [],
    });
  }

  const tasks: TeamTask[] = Array.isArray(row.tasks)
    ? (row.tasks as Record<string, unknown>[]).map((t) => ({
        id: String(t.id),
        title: String(t.title ?? ""),
        description: t.description ? String(t.description) : undefined,
        assignedToEmail: t.assignee_email ? String(t.assignee_email) : undefined,
        assignedToName: t.assignee_name ? String(t.assignee_name) : undefined,
        dueDate: new Date(String(t.due_at ?? Date.now())),
        status: t.is_completed ? "completed" : "pending",
      }))
    : [];

  const importantDates: ImportantDate[] = Array.isArray(row.important_dates)
    ? (row.important_dates as Record<string, unknown>[]).map((d) => ({
        id: String(d.id),
        title: String(d.title ?? d.label ?? ""),
        date: new Date(String(d.date ?? d.occurs_at ?? Date.now())),
        description: undefined,
      }))
    : [];

  const announcements: TeamAnnouncement[] = Array.isArray(row.announcements)
    ? (row.announcements as Record<string, unknown>[]).map((a) => ({
        id: String(a.id),
        title: String(a.title ?? ""),
        content: String(a.content ?? a.body ?? ""),
        createdAt: new Date(String(a.created_at ?? Date.now())),
        authorName: String(a.author_name ?? "Member"),
      }))
    : [];

  return {
    id: String(row.id),
    teamName: String(row.team_name ?? ""),
    leaderName: String(leader?.name ?? leader?.email ?? ""),
    leaderEmail: String(leader?.email ?? ""),
    courseCode: String(row.course_code ?? ""),
    courseTitle: String(row.course_title ?? ""),
    section: row.section ? String(row.section) : undefined,
    members,
    tasks,
    importantDates,
    announcements,
  };
}

export function mapAuthor(name: string, roleCode?: string): Author {
  const role = (roleCode === "faculty" || roleCode === "admin" ? roleCode : "student") as AuthorRole;
  return {
    name: name || "User",
    initials: initialsFromName(name || "User"),
    role,
  };
}

export function mapBlogPostListItem(row: Record<string, unknown>): BlogPost {
  const created = String(row.published_at ?? row.created_at ?? Date.now());
  const roleCode = String(row.author_role_code ?? "student");
  const isVerified = Boolean(row.is_verified) || roleCode === "faculty" || roleCode === "admin";
  const topicTitle = row.topic_title ? String(row.topic_title) : undefined;
  const explicitTags = Array.isArray(row.tags)
    ? row.tags.map((tag) => String(tag))
    : [];
  return {
    id: String(row.id),
    courseCode: String(row.course_code ?? ""),
    topicId: row.topic_id != null ? String(row.topic_id) : undefined,
    topicTitle,
    title: String(row.title ?? ""),
    excerpt: String(row.excerpt ?? ""),
    body: "",
    tags: explicitTags.length > 0 ? explicitTags : topicTitle ? [topicTitle] : [],
    readTimeMin: Number(row.read_time_min ?? 5),
    author: mapAuthor(String(row.author_name ?? ""), roleCode),
    createdAt: new Date(created),
    upvotes: Number(row.upvotes ?? 0),
    downvotes: Number(row.downvotes ?? 0),
    viewerVote:
      row.viewer_vote === "up" || row.viewer_vote === "down"
        ? (row.viewer_vote as "up" | "down")
        : null,
    isVerified,
    isAdminCurated: roleCode === "admin",
    commentCount: Number(row.comment_count ?? 0),
    isPinned: Boolean(row.is_pinned),
    coverImageUrl: row.cover_image_url ? String(row.cover_image_url) : undefined,
  };
}

export function mapBlogPostDetail(row: Record<string, unknown>): BlogPost {
  const base = mapBlogPostListItem(row);
  return {
    ...base,
    body: String(row.body_html ?? row.body ?? ""),
  };
}

export function mapBlogComment(row: Record<string, unknown>, postId: string): Comment {
  return {
    id: String(row.id),
    postId,
    parentId: row.parent_comment_id != null ? String(row.parent_comment_id) : null,
    author: mapAuthor(String(row.author_name ?? ""), String(row.author_role_code ?? "student")),
    body: String(row.body ?? ""),
    createdAt: new Date(String(row.created_at ?? Date.now())),
    upvotes: 0,
    downvotes: 0,
  };
}

const FORUM_TYPE_TO_TAG: Record<string, ForumTag> = {
  doubt: "Doubt",
  advice: "Advice",
  resource: "Resource",
  discussion: "Discussion",
};

export function forumTagToType(tag: ForumTag): string {
  return tag.toLowerCase();
}

function parseForumImageUrls(row: Record<string, unknown>): string[] {
  const raw = row.image_urls;
  if (Array.isArray(raw)) {
    return raw.filter((u): u is string => typeof u === "string" && u.length > 0);
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((u): u is string => typeof u === "string" && u.length > 0);
      }
    } catch {
      /* ignore */
    }
  }
  return [];
}

export function mapForumThread(row: Record<string, unknown>): ForumThread {
  const roleCode = String(row.author_role_code ?? "student");
  const role =
    roleCode === "faculty" ? "faculty" : roleCode === "cr" ? "cr" : "student";
  const typeCode = String(row.thread_type_code ?? "discussion");
  return {
    id: String(row.id),
    courseCode: String(row.course_code ?? ""),
    title: String(row.title ?? ""),
    body: String(row.body ?? ""),
    author: {
      name: String(row.author_name ?? ""),
      initials: initialsFromName(String(row.author_name ?? "")),
      role,
    },
    authorUserId: Number(row.author_user_id ?? 0),
    tag: FORUM_TYPE_TO_TAG[typeCode] ?? "Discussion",
    upvotes: Number(row.upvotes ?? 0),
    replies: Number(row.reply_count ?? 0),
    lastActivity: new Date(String(row.last_activity ?? row.created_at ?? Date.now())),
    resolved: Boolean(row.is_locked),
    images: parseForumImageUrls(row),
    viewerHasUpvoted: Boolean(row.viewer_has_upvoted),
  };
}

export interface ForumReply {
  id: string;
  threadId: string;
  parentId: string | null;
  body: string;
  author: { name: string; initials: string; role: "student" | "cr" | "faculty" };
  authorUserId: number;
  createdAt: Date;
  upvotes: number;
}

export function mapForumReply(row: Record<string, unknown>, threadId: string): ForumReply {
  const roleCode = String(row.author_role_code ?? "student");
  const role =
    roleCode === "faculty" ? "faculty" : roleCode === "cr" ? "cr" : "student";
  return {
    id: String(row.id),
    threadId,
    parentId: row.parent_reply_id != null ? String(row.parent_reply_id) : null,
    body: String(row.body ?? ""),
    author: {
      name: String(row.author_name ?? ""),
      initials: initialsFromName(String(row.author_name ?? "")),
      role,
    },
    authorUserId: Number(row.author_user_id ?? 0),
    createdAt: new Date(String(row.created_at ?? Date.now())),
    upvotes: Number(row.upvotes ?? 0),
  };
}

export function mapPracticeTopic(row: Record<string, unknown>): PracticeTopic {
  return {
    id: String(row.id),
    topic: String(row.topic ?? row.title ?? ""),
    problemCount: Number(row.problem_count ?? 0),
  };
}

export function mapPracticeProblem(row: Record<string, unknown>): PracticeProblem {
  const tags = Array.isArray(row.tags)
    ? (row.tags as unknown[]).map((t) => String(t)).filter(Boolean)
    : [];
  return {
    id: String(row.id),
    topicId: String(row.topic_id ?? ""),
    problemNumber:
      row.problem_number != null ? Number(row.problem_number) : undefined,
    question: String(row.question ?? ""),
    answer: String(row.answer ?? ""),
    tags,
    questionImage: row.question_image_url
      ? String(row.question_image_url)
      : undefined,
    answerImage: row.answer_image_url ? String(row.answer_image_url) : undefined,
  };
}

export interface PastPaperItem {
  id: string;
  title: string;
  term: "ct" | "mid-final";
  trimester: string;
  year: string;
  syllabus?: string;
  fileSize: string;
  downloadUrl?: string;
}

export function mapPastPaper(row: Record<string, unknown>): PastPaperItem {
  const title = String(row.title ?? "");
  const titleLower = title.toLowerCase();
  let term: "ct" | "mid-final" = "mid-final";
  if (titleLower.includes("class test") || titleLower.includes(" ct") || titleLower.startsWith("ct")) {
    term = "ct";
  }
  const sizeBytes = Number(row.file_size ?? 0);
  const fileSize =
    sizeBytes > 0
      ? sizeBytes < 1048576
        ? `${(sizeBytes / 1024).toFixed(1)} KB`
        : `${(sizeBytes / 1048576).toFixed(1)} MB`
      : "—";
  return {
    id: String(row.id),
    title,
    term,
    trimester: "—",
    year: String(row.year ?? row.exam_year ?? ""),
    fileSize,
    downloadUrl: row.secure_url ? String(row.secure_url) : undefined,
  };
}
