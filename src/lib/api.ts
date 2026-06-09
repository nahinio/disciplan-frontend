import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "./auth";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) return data.detail.map((d: { msg: string }) => d.msg).join(", ");
    return res.statusText;
  } catch {
    return res.statusText;
  }
}

let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${BASE}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refresh }),
        });
        if (!res.ok) return false;
        const data = (await res.json()) as { access_token: string; refresh_token: string };
        setTokens(data.access_token, data.refresh_token);
        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { auth?: boolean; _retry?: boolean } = {}
): Promise<T> {
  const { auth = true, headers, _retry = false, ...rest } = options;
  const h = new Headers(headers);
  if (!h.has("Content-Type") && rest.body && !(rest.body instanceof FormData)) {
    h.set("Content-Type", "application/json");
  }
  if (auth) {
    const token = getAccessToken();
    if (token) h.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${BASE}${path}`, { ...rest, headers: h });

  if (res.status === 401 && auth && !_retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiFetch<T>(path, { ...options, _retry: true });
    }
    clearTokens();
  }

  if (!res.ok) {
    throw new ApiError(res.status, await parseError(res));
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function fetchAuthenticatedBlob(path: string): Promise<Blob> {
  const token = getAccessToken();
  const h = new Headers();
  if (token) h.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${BASE}${path}`, { headers: h });
  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return fetchAuthenticatedBlob(path);
    clearTokens();
    throw new ApiError(401, "Unauthorized");
  }
  if (!res.ok) throw new ApiError(res.status, await parseError(res));
  return res.blob();
}

export async function openStoredFile(
  fileId: number,
  filename: string,
  mode: "view" | "download"
): Promise<void> {
  const token = getAccessToken();
  const h = new Headers();
  if (token) h.set("Authorization", `Bearer ${token}`);
  const path = `/files/${fileId}/${mode === "view" ? "view" : "download"}`;
  let res = await fetch(`${BASE}${path}`, { headers: h });
  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      clearTokens();
      throw new ApiError(401, "Unauthorized");
    }
    const h2 = new Headers();
    const t2 = getAccessToken();
    if (t2) h2.set("Authorization", `Bearer ${t2}`);
    res = await fetch(`${BASE}${path}`, { headers: h2 });
  }
  if (!res.ok) throw new ApiError(res.status, await parseError(res));

  const contentType =
    res.headers.get("content-type")?.split(";")[0]?.trim() || "application/octet-stream";
  const buffer = await res.arrayBuffer();
  const file = new File([buffer], filename, { type: contentType });
  const url = URL.createObjectURL(file);

  const officeDoc =
    /\.(docx?|pptx?|xlsx?)$/i.test(filename) ||
    contentType.includes("wordprocessingml") ||
    contentType.includes("msword") ||
    contentType.includes("presentationml") ||
    contentType.includes("spreadsheetml");

  if (mode === "view" && !officeDoc && (contentType.startsWith("image/") || contentType === "application/pdf")) {
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const api = {
  sendOtp: (email: string) =>
    apiFetch<{ message: string }>("/auth/otp/send", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ email }),
    }),

  verifyOtp: (email: string, code: string) =>
    apiFetch<{ message: string }>("/auth/otp/verify", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ email, code }),
    }),

  checkFacultyRoster: (email: string) =>
    apiFetch<{ on_roster: boolean }>(`/auth/check-faculty-roster?email=${enc(email)}`, {
      auth: false,
    }),

  getSignupRole: (email: string) =>
    apiFetch<{
      role_code: "student" | "faculty";
      suggested_name?: string;
      on_roster: boolean;
    }>(`/auth/signup-role?email=${enc(email)}`, { auth: false }),

  register: (body: {
    email: string;
    password: string;
    display_name: string;
    role_code: "student" | "faculty";
    department_id?: number;
    message?: string;
  }) =>
    apiFetch<{
      access_token: string;
      refresh_token: string;
      verification_pending?: boolean;
      status_code?: string;
    }>("/auth/register", {
      method: "POST",
      auth: false,
      body: JSON.stringify(body),
    }).then((t) => {
      setTokens(t.access_token, t.refresh_token);
      return t;
    }),

  login: (email: string, password: string) =>
    apiFetch<{
      access_token: string;
      refresh_token: string;
      verification_pending?: boolean;
      status_code?: string;
    }>("/auth/login", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ email, password }),
    }).then((t) => {
      setTokens(t.access_token, t.refresh_token);
      return t;
    }),

  getMe: () => apiFetch<Record<string, unknown>>("/users/me"),

  getUserProfile: (userId: number) =>
    apiFetch<Record<string, unknown>>(`/users/${userId}/profile`),

  updateProfile: (body: Record<string, unknown>) =>
    apiFetch<{ message: string }>("/users/me/profile", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteAccount: (confirm_email: string) =>
    apiFetch<{ message: string }>("/users/me", {
      method: "DELETE",
      body: JSON.stringify({ confirm_email }),
    }),

  updatePreferences: (body: Record<string, unknown>) =>
    apiFetch<{ message: string }>("/users/me/preferences", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  completeOnboarding: (body: {
    display_name: string;
    department_id?: number;
    role_code?: string;
    sections: { course_code: string; section_label: string }[];
  }) =>
    apiFetch<{ message: string }>("/onboarding/complete", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getDepartments: () =>
    apiFetch<{ items: { id: number; code: string; name: string }[] }>(
      "/courses/meta/departments",
      { auth: false }
    ),

  listMyEnrollmentRequests: () =>
    apiFetch<{ items: unknown[] }>("/sections/enrollment-requests"),

  createEnrollmentRequest: (body: {
    course_code: string;
    section_label: string;
    message?: string;
  }) =>
    apiFetch<{ id: number; message: string }>("/sections/enrollment-requests", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  cancelEnrollmentRequest: (requestId: number) =>
    apiFetch<{ message: string }>(`/sections/enrollment-requests/${requestId}`, {
      method: "DELETE",
    }),

  getOfferings: () =>
    apiFetch<{ items: Array<Record<string, unknown>> }>("/courses/offerings", { auth: false }),

  getCatalogue: () => apiFetch<{ items: unknown[] }>("/courses/catalogue"),

  getCourse: (courseCode: string) =>
    apiFetch<Record<string, unknown>>(`/courses/${enc(courseCode)}`, { auth: false }),

  getCourses: () => apiFetch<{ items: unknown[]; view?: string }>("/courses"),

  getTasks: () => apiFetch<{ items: unknown[] }>("/dashboard/tasks"),

  getTodayTasks: (date?: string) =>
    apiFetch<{ items: unknown[]; date: string }>(
      `/dashboard/tasks/today${date ? `?date=${enc(date)}` : ""}`
    ),

  getTask: (id: number) => apiFetch<Record<string, unknown>>(`/dashboard/tasks/${id}`),

  generateLectureTasks: (date?: string) =>
    apiFetch<{ created: number }>(
      `/dashboard/tasks/generate-lectures${date ? `?date=${enc(date)}` : ""}`,
      { method: "POST" }
    ),

  setDailyEnergy: (energy_level_code: string, energy_date?: string) =>
    apiFetch<{ message: string }>("/dashboard/energy", {
      method: "POST",
      body: JSON.stringify({ energy_level_code, energy_date }),
    }),

  getDailyEnergy: (date?: string) =>
    apiFetch<{ energy: Record<string, unknown> | null; date: string }>(
      `/dashboard/energy/today${date ? `?date=${enc(date)}` : ""}`
    ),

  getRoutine: () => apiFetch<{ items: unknown[] }>("/dashboard/routine"),

  createTask: (body: Record<string, unknown>) =>
    apiFetch<{ id: number }>("/dashboard/tasks", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateTask: (id: number, body: Record<string, unknown>) =>
    apiFetch<{ message: string }>(`/dashboard/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteTask: (id: number) =>
    apiFetch<{ message: string }>(`/dashboard/tasks/${id}`, { method: "DELETE" }),

  getCalendarEvents: (merged = true) =>
    apiFetch<{ items: unknown[] }>(
      `/dashboard/calendar${merged ? "?merged=true" : "?merged=false"}`
    ),

  createCalendarEvent: (body: Record<string, unknown>) =>
    apiFetch<{ id: number; plan_id?: number; task_id?: number }>("/dashboard/calendar", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  createEventPlan: (body: Record<string, unknown>) =>
    apiFetch<{ id: number; calendar_event_id?: number; task_id?: number }>(
      "/dashboard/event-plans",
      { method: "POST", body: JSON.stringify(body) }
    ),

  listEventPlans: () => apiFetch<{ items: unknown[] }>("/dashboard/event-plans"),

  getEventPlan: (planId: number) =>
    apiFetch<Record<string, unknown>>(`/dashboard/event-plans/${planId}`),

  updateEventPlan: (planId: number, body: Record<string, unknown>) =>
    apiFetch<{ id: number; message: string }>(`/dashboard/event-plans/${planId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteEventPlan: (planId: number) =>
    apiFetch<{ message: string }>(`/dashboard/event-plans/${planId}`, {
      method: "DELETE",
    }),

  getNotifications: () =>
    apiFetch<{ items: Array<Record<string, unknown>>; has_more: boolean }>("/notifications"),

  getUnreadCount: () => apiFetch<{ unread_count: number }>("/notifications/unread-count"),

  markNotificationRead: (id: number) =>
    apiFetch<{ message: string }>(`/notifications/${id}/read`, { method: "PATCH" }),

  markAllNotificationsRead: () =>
    apiFetch<{ message: string }>("/notifications/read-all", { method: "POST" }),

  getLeaderboard: (period: "all_time" | "today" = "all_time", limit = 100) =>
    apiFetch<{
      items: Array<{
        rank?: number;
        leaderboard_rank?: number;
        display_name: string;
        points: number;
        user_id: number;
        tier_label?: string;
        tier_code?: string;
      }>;
      my_rank: {
        rank?: number;
        leaderboard_rank?: number;
        points: number;
        tier_label?: string;
        tier_code?: string;
      } | null;
      badges: unknown[];
    }>(`/gamification/leaderboard?period=${period}&limit=${limit}`),

  getBlogs: (params?: { course_code?: string; topic_id?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.course_code) q.set("course_code", params.course_code);
    if (params?.topic_id != null) q.set("topic_id", String(params.topic_id));
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return apiFetch<{ items: unknown[] }>(`/blogs${qs ? `?${qs}` : ""}`);
  },

  getBlogPost: (id: number) => apiFetch<Record<string, unknown>>(`/blogs/posts/${id}`),

  createBlogPost: (body: Record<string, unknown>) =>
    apiFetch<{ id: number }>("/blogs", { method: "POST", body: JSON.stringify(body) }),

  updateBlogPost: (id: number, body: Record<string, unknown>) =>
    apiFetch<{ message: string }>(`/blogs/posts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteBlogPost: (id: number) =>
    apiFetch<{ message: string }>(`/blogs/posts/${id}`, { method: "DELETE" }),

  pinBlogPost: (id: number, pinned = true) =>
    apiFetch<{ message: string }>(`/blogs/posts/${id}/pin?pinned=${pinned}`, {
      method: "POST",
    }),

  verifyBlogPost: (id: number) =>
    apiFetch<{ message: string }>(`/blogs/posts/${id}/verify`, { method: "POST" }),

  commentBlogPost: (id: number, body: string, parentId?: number) =>
    apiFetch<{ id: number }>(`/blogs/posts/${id}/comments`, {
      method: "POST",
      body: JSON.stringify({ body, parent_comment_id: parentId ?? null }),
    }),

  voteBlogPost: (id: number, direction: "up" | "down") =>
    apiFetch<{
      message: string;
      upvotes?: number;
      downvotes?: number;
      viewer_vote?: "up" | "down" | null;
    }>(`/blogs/posts/${id}/vote`, {
      method: "POST",
      body: JSON.stringify({ direction }),
    }),

  getGlobalAnnouncements: () =>
    apiFetch<{ items: unknown[] }>("/announcements/global"),

  getForumFeed: (params?: {
    course_code?: string;
    thread_type?: string;
    sort?: "recent" | "top";
    mine_only?: boolean;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.course_code) q.set("course_code", params.course_code);
    if (params?.thread_type) q.set("thread_type", params.thread_type);
    if (params?.sort) q.set("sort", params.sort);
    if (params?.mine_only) q.set("mine_only", "true");
    if (params?.limit != null) q.set("limit", String(params.limit));
    const qs = q.toString();
    return apiFetch<{ items: unknown[]; sort?: string }>(
      `/forum/feed${qs ? `?${qs}` : ""}`
    );
  },

  getForumThreads: (
    courseCode: string,
    params?: { thread_type?: string; mine_only?: boolean }
  ) => {
    const q = new URLSearchParams();
    if (params?.thread_type) q.set("thread_type", params.thread_type);
    if (params?.mine_only) q.set("mine_only", "true");
    const qs = q.toString();
    return apiFetch<{ items: unknown[] }>(
      `/forum/courses/${enc(courseCode)}/threads${qs ? `?${qs}` : ""}`
    );
  },

  getForumStats: (courseCode: string) =>
    apiFetch<Record<string, unknown>>(`/forum/courses/${enc(courseCode)}/stats`),

  createForumThread: (courseCode: string, body: Record<string, unknown>) =>
    apiFetch<{ id: number }>(`/forum/courses/${enc(courseCode)}/threads`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getForumThread: (threadId: number) =>
    apiFetch<Record<string, unknown>>(`/forum/threads/${threadId}`),

  replyForumThread: (threadId: number, body: string, parentReplyId?: number) =>
    apiFetch<{ id: number }>(`/forum/threads/${threadId}/replies`, {
      method: "POST",
      body: JSON.stringify({ body, parent_reply_id: parentReplyId ?? null }),
    }),

  getPracticeTopics: (courseCode: string) =>
    apiFetch<{ items: unknown[] }>(`/practice/courses/${enc(courseCode)}/topics`),

  getPracticeProblems: (
    courseCode: string,
    params?: { topic_id?: number; term?: string }
  ) => {
    const q = new URLSearchParams();
    if (params?.topic_id != null) q.set("topic_id", String(params.topic_id));
    if (params?.term) q.set("term", params.term);
    const qs = q.toString();
    return apiFetch<{ items: unknown[] }>(
      `/practice/courses/${enc(courseCode)}/problems${qs ? `?${qs}` : ""}`
    );
  },

  createPracticeTopic: (courseCode: string, body: Record<string, unknown>) =>
    apiFetch<{ id: number }>(`/practice/courses/${enc(courseCode)}/topics`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  adminUpdateTopic: (courseCode: string, topicId: number, body: { title: string }) =>
    apiFetch<{ message: string }>(
      `/admin/courses/${enc(courseCode)}/topics/${topicId}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      }
    ),

  adminDeleteTopic: (courseCode: string, topicId: number) =>
    apiFetch<{
      message: string;
      blogs_deleted: number;
      problems_deleted: number;
    }>(`/admin/courses/${enc(courseCode)}/topics/${topicId}`, {
      method: "DELETE",
    }),

  createPracticeProblem: (courseCode: string, body: Record<string, unknown>) =>
    apiFetch<{ id: number; problem_number?: number }>(
      `/practice/courses/${enc(courseCode)}/problems`,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    ),

  getPracticePastPapers: (courseCode: string) =>
    apiFetch<{ items: unknown[] }>(`/practice/courses/${enc(courseCode)}/past-papers`),

  createPastPaper: (courseCode: string, body: Record<string, unknown>) =>
    apiFetch<{ id: number }>(`/practice/courses/${enc(courseCode)}/past-papers`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  voteForumThread: (threadId: number, direction: "up" | "down") =>
    apiFetch<{ message: string }>(`/forum/threads/${threadId}/vote`, {
      method: "POST",
      body: JSON.stringify({ direction }),
    }),

  voteForumReply: (replyId: number, direction: "up" | "down") =>
    apiFetch<{ message: string }>(`/forum/replies/${replyId}/vote`, {
      method: "POST",
      body: JSON.stringify({ direction }),
    }),

  updateForumThread: (threadId: number, body: { title: string; body: string }) =>
    apiFetch<{ message: string }>(`/forum/threads/${threadId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteForumThread: (threadId: number) =>
    apiFetch<{ message: string }>(`/forum/threads/${threadId}`, { method: "DELETE" }),

  updateForumReply: (replyId: number, body: string) =>
    apiFetch<{ message: string }>(`/forum/replies/${replyId}`, {
      method: "PATCH",
      body: JSON.stringify({ body }),
    }),

  deleteForumReply: (replyId: number) =>
    apiFetch<{ message: string }>(`/forum/replies/${replyId}`, { method: "DELETE" }),

  getTeams: () => apiFetch<{ items: unknown[] }>("/teams"),

  getPendingTeamInvitations: () =>
    apiFetch<{ items: unknown[] }>("/teams/invitations/pending"),

  getTeam: (teamId: number) => apiFetch<Record<string, unknown>>(`/teams/${teamId}`),

  createTeam: (body: Record<string, unknown>) =>
    apiFetch<{ id: number }>("/teams", { method: "POST", body: JSON.stringify(body) }),

  disbandTeam: (teamId: number) =>
    apiFetch<{ message: string }>(`/teams/${teamId}`, { method: "DELETE" }),

  leaveTeam: (teamId: number) =>
    apiFetch<{ message: string }>(`/teams/${teamId}/members/me`, { method: "DELETE" }),

  respondTeamInvitation: (invitationId: number, accept: boolean) =>
    apiFetch<{ message: string }>(`/teams/invitations/${invitationId}/respond`, {
      method: "POST",
      body: JSON.stringify({ accept }),
    }),

  pinTeam: (teamId: number) =>
    apiFetch<{ message: string }>(`/teams/${teamId}/pin`, { method: "POST" }),

  unpinTeam: (teamId: number) =>
    apiFetch<{ message: string }>(`/teams/${teamId}/pin`, { method: "DELETE" }),

  createTeamTask: (
    teamId: number,
    body: {
      title: string;
      description?: string;
      assignee_user_id?: number;
      due_at?: string;
    }
  ) =>
    apiFetch<{ id: number }>(`/teams/${teamId}/tasks`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  toggleTeamTask: (teamId: number, taskId: number, completed: boolean) =>
    apiFetch<{ message: string }>(
      `/teams/${teamId}/tasks/${taskId}?completed=${completed ? "true" : "false"}`,
      { method: "PATCH" }
    ),

  createTeamDate: (teamId: number, body: { label: string; occurs_at: string }) =>
    apiFetch<{ id: number }>(`/teams/${teamId}/dates`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  createTeamAnnouncement: (teamId: number, body: { title: string; body: string }) =>
    apiFetch<{ id: number }>(`/teams/${teamId}/announcements`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getChatGroups: () => apiFetch<{ items: unknown[] }>("/chat/groups"),

  getChatMessages: (groupId: number, afterId?: number) => {
    const qs = afterId != null ? `?after_id=${afterId}` : "";
    return apiFetch<{ items: unknown[] }>(`/chat/groups/${groupId}/messages${qs}`);
  },

  sendChatMessage: (groupId: number, body: string) =>
    apiFetch<{ id: number }>(`/chat/groups/${groupId}/messages`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),

  uploadFile: (file: File, folder = "submissions") => {
    const form = new FormData();
    form.append("file", file);
    form.append("folder", folder);
    return apiFetch<{ file_id: number; original_filename: string }>("/files/upload", {
      method: "POST",
      body: form,
    });
  },

  getFile: (fileId: number) =>
    apiFetch<Record<string, unknown>>(`/files/${fileId}`),

  getSectionAnnouncements: (courseCode: string, section: string) =>
    apiFetch<{ items: unknown[] }>(
      `/sections/${enc(courseCode)}/${enc(section)}/announcements`
    ),

  createSectionAnnouncement: (
    courseCode: string,
    section: string,
    body: { title: string; body: string; is_pinned?: boolean }
  ) =>
    apiFetch<{ id: number }>(`/sections/${enc(courseCode)}/${enc(section)}/announcements`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateSectionAnnouncement: (
    announcementId: number,
    body: { title?: string; body?: string; is_pinned?: boolean }
  ) =>
    apiFetch<{ message: string }>(`/sections/announcements/${announcementId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteSectionAnnouncement: (announcementId: number) =>
    apiFetch<{ message: string }>(`/sections/announcements/${announcementId}`, {
      method: "DELETE",
    }),

  getSectionDoubts: (courseCode: string, section: string) =>
    apiFetch<{ items: unknown[] }>(`/sections/${enc(courseCode)}/${enc(section)}/doubts`),

  searchDoubts: (params?: {
    q?: string;
    course_code?: string;
    section_label?: string;
    status?: "all" | "resolved";
    limit?: number;
    offset?: number;
  }) => {
    const sp = new URLSearchParams();
    if (params?.q) sp.set("q", params.q);
    if (params?.course_code) sp.set("course_code", params.course_code);
    if (params?.section_label) sp.set("section_label", params.section_label);
    if (params?.status) sp.set("status", params.status);
    if (params?.limit != null) sp.set("limit", String(params.limit));
    if (params?.offset != null) sp.set("offset", String(params.offset));
    const qs = sp.toString();
    return apiFetch<{ items: unknown[]; total: number }>(
      `/sections/doubts/search${qs ? `?${qs}` : ""}`
    );
  },

  getDoubt: (doubtId: number) =>
    apiFetch<Record<string, unknown>>(`/sections/doubts/${doubtId}`),

  createSectionDoubt: (
    courseCode: string,
    section: string,
    body: { title: string; body: string }
  ) =>
    apiFetch<{ id: number }>(`/sections/${enc(courseCode)}/${enc(section)}/doubts`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  answerDoubt: (doubtId: number, body: { body: string; parent_answer_id?: number | null }) =>
    apiFetch<{ id: number }>(`/sections/doubts/${doubtId}/answers`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  verifyDoubt: (doubtId: number) =>
    apiFetch<{ message: string }>(`/sections/doubts/${doubtId}/verify`, { method: "POST" }),

  acceptDoubtAnswer: (answerId: number) =>
    apiFetch<{ message: string; new_achievements?: unknown[] }>(
      `/sections/doubts/answers/${answerId}/accept`,
      { method: "POST" }
    ),

  verifyDoubtAnswer: (answerId: number) =>
    apiFetch<{ message: string; new_achievements?: unknown[] }>(
      `/sections/doubts/answers/${answerId}/accept`,
      { method: "POST" }
    ),

  getGamificationMe: () =>
    apiFetch<{
      total_points: number;
      tier_code: string;
      tier_label: string;
      next_tier_points: number | null;
      next_tier_label: string | null;
      streaks: Array<{
        streak_code: string;
        current_count: number;
        best_count: number;
        last_date: string | null;
      }>;
      badges: unknown[];
    }>("/gamification/me"),

  getGamificationAchievements: () =>
    apiFetch<{
      items: Array<{
        code: string;
        family: string;
        level: number;
        label: string;
        caption?: string | null;
        threshold: number;
        counter: number;
        is_unlocked: boolean;
        icon_url: string;
      }>;
    }>("/gamification/me/achievements"),

  getAssessmentPortals: (courseCode: string, section: string) =>
    apiFetch<{ items: unknown[] }>(
      `/assessments/sections/${enc(courseCode)}/${enc(section)}/portals`
    ),

  getAssessmentPortal: (portalId: number) =>
    apiFetch<Record<string, unknown>>(`/assessments/portals/${portalId}`),

  createAssessmentPortal: (
    courseCode: string,
    section: string,
    body: Record<string, unknown>
  ) =>
    apiFetch<{ id: number }>(
      `/assessments/sections/${enc(courseCode)}/${enc(section)}/portals`,
      { method: "POST", body: JSON.stringify(body) }
    ),

  updateAssessmentPortal: (portalId: number, body: Record<string, unknown>) =>
    apiFetch<{ message: string }>(`/assessments/portals/${portalId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteAssessmentPortal: (portalId: number) =>
    apiFetch<{ message: string }>(`/assessments/portals/${portalId}`, {
      method: "DELETE",
    }),

  getPortalSubmissions: (portalId: number) =>
    apiFetch<{ items: unknown[] }>(`/assessments/portals/${portalId}/submissions`),

  submitAssessment: (portalId: number, fileId: number) =>
    apiFetch<{ id: number }>(`/assessments/portals/${portalId}/submissions`, {
      method: "POST",
      body: JSON.stringify({ file_id: fileId }),
    }),

  gradeSubmission: (submissionId: number, score: number, feedback?: string) =>
    apiFetch<{ message: string }>(`/assessments/submissions/${submissionId}/grade`, {
      method: "PATCH",
      body: JSON.stringify({ score, feedback }),
    }),

  getSectionGrades: (courseCode: string, section: string) =>
    apiFetch<{ items: unknown[]; rubric?: unknown[] }>(
      `/assessments/sections/${enc(courseCode)}/${enc(section)}/grades`
    ),

  getGradeComponents: (courseCode: string, section: string) =>
    apiFetch<{ items: unknown[] }>(
      `/assessments/sections/${enc(courseCode)}/${enc(section)}/components`
    ),

  createGradeComponent: (
    courseCode: string,
    section: string,
    body: Record<string, unknown>
  ) =>
    apiFetch<{ id: number; component_code: string }>(
      `/assessments/sections/${enc(courseCode)}/${enc(section)}/components`,
      { method: "POST", body: JSON.stringify(body) }
    ),

  updateGradeComponent: (componentId: number, body: Record<string, unknown>) =>
    apiFetch<{ message: string }>(`/assessments/components/${componentId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteGradeComponent: (componentId: number) =>
    apiFetch<{ message: string }>(`/assessments/components/${componentId}`, {
      method: "DELETE",
    }),

  getSectionResources: (courseCode: string, section: string) =>
    apiFetch<{ items: unknown[] }>(
      `/sections/${enc(courseCode)}/${enc(section)}/resources`
    ),

  createSectionResource: (
    courseCode: string,
    section: string,
    body: Record<string, unknown>
  ) =>
    apiFetch<{ id: number }>(`/sections/${enc(courseCode)}/${enc(section)}/resources`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateSectionResource: (resourceId: number, body: Record<string, unknown>) =>
    apiFetch<{ message: string }>(`/sections/resources/${resourceId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteSectionResource: (resourceId: number) =>
    apiFetch<{ message: string }>(`/sections/resources/${resourceId}`, {
      method: "DELETE",
    }),

  deleteSectionPracticeProblem: (problemId: number) =>
    apiFetch<{ message: string }>(`/sections/practice/problems/${problemId}`, {
      method: "DELETE",
    }),

  updateSectionPracticeProblem: (problemId: number, body: Record<string, unknown>) =>
    apiFetch<{ message: string }>(`/sections/practice/problems/${problemId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  getAnnouncementComments: (announcementId: number) =>
    apiFetch<{ items: unknown[] }>(`/sections/announcements/${announcementId}/comments`),

  createAnnouncementComment: (
    announcementId: number,
    body: { body: string; parent_comment_id?: number | null }
  ) =>
    apiFetch<{ id: number }>(`/sections/announcements/${announcementId}/comments`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  pinAnnouncementComment: (commentId: number, pinned: boolean) =>
    apiFetch<{ message: string }>(`/sections/announcements/comments/${commentId}/pin`, {
      method: "PATCH",
      body: JSON.stringify({ pinned }),
    }),

  getSectionPracticeProblems: (courseCode: string, section: string) =>
    apiFetch<{ items: unknown[] }>(
      `/sections/${enc(courseCode)}/${enc(section)}/practice/problems`
    ),

  createSectionPracticeProblem: (
    courseCode: string,
    section: string,
    body: Record<string, unknown>
  ) =>
    apiFetch<{ id: number }>(
      `/sections/${enc(courseCode)}/${enc(section)}/practice/problems`,
      { method: "POST", body: JSON.stringify(body) }
    ),

  facultyAssignTeam: (body: Record<string, unknown>) =>
    apiFetch<{ id: number }>("/teams/faculty-assign", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateTeam: (teamId: number, body: Record<string, unknown>) =>
    apiFetch<{ message: string }>(`/teams/${teamId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  gradeTeam: (
    teamId: number,
    body: { score: number; max_score: number; label?: string; feedback?: string }
  ) =>
    apiFetch<{ message: string }>(`/teams/${teamId}/grade`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  upsertSectionGrade: (
    courseCode: string,
    section: string,
    studentId: number,
    body: { component_code: string; score: number; max_score?: number; feedback?: string }
  ) =>
    apiFetch<{ message: string }>(
      `/assessments/sections/${enc(courseCode)}/${enc(section)}/grades/${studentId}`,
      { method: "PUT", body: JSON.stringify(body) }
    ),

  getSectionTeams: (courseCode: string, section: string) =>
    apiFetch<{ items: unknown[] }>(
      `/teams/by-section/${enc(courseCode)}/${enc(section)}`
    ),

  inviteTeamMember: (teamId: number, email: string) =>
    apiFetch<{ message: string }>(`/teams/${teamId}/invitations`, {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  updateCalendarEvent: (eventId: number, body: Record<string, unknown>) =>
    apiFetch<{ message: string }>(`/dashboard/calendar/${eventId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteCalendarEvent: (eventId: number) =>
    apiFetch<{ message: string }>(`/dashboard/calendar/${eventId}`, {
      method: "DELETE",
    }),

  adminListUsers: () => apiFetch<{ items: unknown[] }>("/admin/users"),

  adminListFacultyRoster: () =>
    apiFetch<{ items: unknown[] }>("/admin/faculty-roster"),

  adminAddFacultyRoster: (body: { email: string; display_name: string }) =>
    apiFetch<{ id: number }>("/admin/faculty-roster", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  adminRemoveFacultyRoster: (rosterId: number) =>
    apiFetch<{ message: string }>(`/admin/faculty-roster/${rosterId}`, {
      method: "DELETE",
    }),

  adminListFacultyVerificationRequests: (status = "pending") =>
    apiFetch<{ items: unknown[] }>(
      `/admin/faculty-verification-requests?status=${enc(status)}`
    ),

  adminApproveFacultyVerification: (requestId: number) =>
    apiFetch<{ message: string }>(
      `/admin/faculty-verification-requests/${requestId}/approve`,
      { method: "POST" }
    ),

  adminRejectFacultyVerification: (requestId: number) =>
    apiFetch<{ message: string }>(
      `/admin/faculty-verification-requests/${requestId}/reject`,
      { method: "POST" }
    ),

  adminListStudentsEnrollmentSummary: () =>
    apiFetch<{ items: unknown[] }>("/admin/students/enrollments-summary"),

  adminListUserEnrollments: (userId: number) =>
    apiFetch<{ items: unknown[]; user: Record<string, unknown> }>(
      `/admin/users/${userId}/enrollments`
    ),

  adminEnrollUser: (userId: number, body: { course_code: string; section_label: string }) =>
    apiFetch<{ message: string; section_key: string }>(
      `/admin/users/${userId}/enrollments`,
      { method: "POST", body: JSON.stringify(body) }
    ),

  adminDropUserEnrollment: (userId: number, courseCode: string, sectionLabel: string) =>
    apiFetch<{ message: string }>(
      `/admin/users/${userId}/enrollments/${enc(courseCode)}/${enc(sectionLabel)}`,
      { method: "DELETE" }
    ),

  adminImportEnrollmentsCsv: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiFetch<{
      total: number;
      enrolled: number;
      skipped_already_enrolled: number;
      failed: number;
      errors: { row: string; student_email: string; reason: string }[];
    }>("/admin/enrollments/import", { method: "POST", body: form });
  },

  adminListEnrollmentRequests: (status = "pending") =>
    apiFetch<{ items: unknown[] }>(
      `/admin/enrollment-requests?status=${enc(status)}`
    ),

  adminApproveEnrollmentRequest: (requestId: number) =>
    apiFetch<{ message: string }>(`/admin/enrollment-requests/${requestId}/approve`, {
      method: "POST",
    }),

  adminRejectEnrollmentRequest: (requestId: number) =>
    apiFetch<{ message: string }>(`/admin/enrollment-requests/${requestId}/reject`, {
      method: "POST",
    }),

  adminDeleteEnrollmentRequest: (requestId: number) =>
    apiFetch<{ message: string }>(`/admin/enrollment-requests/${requestId}`, {
      method: "DELETE",
    }),

  adminUpdateUser: (userId: number, body: Record<string, unknown>) =>
    apiFetch<{ message: string }>(`/admin/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  adminDeleteUser: (
    userId: number,
    body: { confirm_email: string; delete_faculty_sections?: boolean }
  ) =>
    apiFetch<{ message: string }>(`/admin/users/${userId}`, {
      method: "DELETE",
      body: JSON.stringify(body),
    }),

  adminCreateDepartment: (body: { name: string; code?: string }) =>
    apiFetch<{ id: number; code: string; name: string; message: string }>(
      "/admin/departments",
      { method: "POST", body: JSON.stringify(body) }
    ),

  adminUpdateDepartment: (departmentId: number, body: { name: string }) =>
    apiFetch<{ id: number; code: string; name: string; message: string }>(
      `/admin/departments/${departmentId}`,
      { method: "PATCH", body: JSON.stringify(body) }
    ),

  adminDeleteDepartment: (departmentId: number) =>
    apiFetch<{ message: string; courses_deleted: number }>(
      `/admin/departments/${departmentId}`,
      { method: "DELETE" }
    ),

  adminCreateCourse: (body: Record<string, unknown>) =>
    apiFetch<{ id: number }>("/admin/courses", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  adminUpdateCourse: (
    courseCode: string,
    body: {
      title?: string;
      is_active?: boolean;
      has_project?: boolean;
      course_type_code?: string;
    }
  ) => {
    const q = new URLSearchParams();
    if (body.title != null) q.set("title", body.title);
    if (body.is_active != null) q.set("is_active", String(body.is_active));
    if (body.has_project != null) q.set("has_project", String(body.has_project));
    if (body.course_type_code != null) q.set("course_type_code", body.course_type_code);
    const qs = q.toString();
    return apiFetch<{ message: string }>(
      `/admin/courses/${enc(courseCode)}${qs ? `?${qs}` : ""}`,
      { method: "PATCH" }
    );
  },

  adminListSections: () => apiFetch<{ items: unknown[] }>("/admin/sections"),

  adminCreateSection: (body: Record<string, unknown>) =>
    apiFetch<{ id: number }>("/admin/sections", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  adminListAnnouncements: () =>
    apiFetch<{ items: unknown[] }>("/admin/announcements"),

  adminCreateAnnouncement: (body: Record<string, unknown>) =>
    apiFetch<{ id: number }>("/admin/announcements", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  adminListAuditLogs: () => apiFetch<{ items: unknown[] }>("/admin/audit-logs"),

  adminActivityReport: () =>
    apiFetch<{ summary: Record<string, unknown>; top_courses: unknown[] }>(
      "/admin/reports/activity"
    ),

  adminListBlogs: (params?: {
    course_code?: string;
    topic_id?: number;
    q?: string;
    verified_only?: boolean;
    moderation_only?: boolean;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.course_code) q.set("course_code", params.course_code);
    if (params?.topic_id != null) q.set("topic_id", String(params.topic_id));
    if (params?.q) q.set("q", params.q);
    if (params?.verified_only) q.set("verified_only", "true");
    if (params?.moderation_only) q.set("moderation_only", "true");
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return apiFetch<{ items: unknown[] }>(`/admin/blogs${qs ? `?${qs}` : ""}`);
  },

  adminDeleteBlog: (postId: number) =>
    apiFetch<{ message: string }>(`/admin/blogs/posts/${postId}`, {
      method: "DELETE",
    }),

  adminDeleteForumThread: (threadId: number) =>
    apiFetch<{ message: string }>(`/admin/forum/threads/${threadId}`, {
      method: "DELETE",
    }),

  adminAdjustPoints: (userId: number, delta: number, reason?: string) =>
    apiFetch<{ message: string }>(`/admin/users/${userId}/points/adjust`, {
      method: "POST",
      body: JSON.stringify({ delta, reason }),
    }),

  adminAwardBadge: (body: { user_id: number; badge_code: string }) =>
    apiFetch<{ id: number }>("/admin/users/badges", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  adminMoveForumThread: (threadId: number, targetCourseCode: string) =>
    apiFetch<{ message: string }>(`/admin/forum/threads/${threadId}/move`, {
      method: "POST",
      body: JSON.stringify({ target_course_code: targetCourseCode }),
    }),

  adminMergeForumThreads: (threadId: number, targetThreadId: number) =>
    apiFetch<{ message: string }>(`/admin/forum/threads/${threadId}/merge`, {
      method: "POST",
      body: JSON.stringify({ target_thread_id: targetThreadId }),
    }),

  adminUpdateAnnouncement: (id: number, body: Record<string, unknown>) =>
    apiFetch<{ message: string }>(`/admin/announcements/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  adminDeleteAnnouncement: (id: number) =>
    apiFetch<{ message: string }>(`/admin/announcements/${id}`, { method: "DELETE" }),

  adminUpdateSection: (sectionId: number, body: Record<string, unknown>) =>
    apiFetch<{ message: string }>(`/admin/sections/${sectionId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  adminDeactivateSection: (sectionId: number) =>
    apiFetch<{ message: string }>(`/admin/sections/${sectionId}`, { method: "DELETE" }),

  submitContentReport: (body: {
    entity_type_code: string;
    entity_id: number;
    reason_code: string;
    notes?: string;
  }) =>
    apiFetch<{ id: number; message: string }>("/reports", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  adminCatalogContentStats: () =>
    apiFetch<{ items: unknown[] }>("/admin/catalog/content-stats"),

  adminListContentReports: (params?: {
    status?: string;
    entity_type?: string;
    entity_types?: string;
    limit?: number;
    offset?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.entity_types) q.set("entity_types", params.entity_types);
    else if (params?.entity_type) q.set("entity_type", params.entity_type);
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.offset) q.set("offset", String(params.offset));
    const qs = q.toString();
    return apiFetch<{ items: unknown[] }>(
      `/admin/content-reports${qs ? `?${qs}` : ""}`
    );
  },

  adminResolveContentReport: (
    reportId: number,
    body: { action: "resolved" | "dismissed"; delete_content?: boolean }
  ) =>
    apiFetch<{ message: string }>(`/admin/content-reports/${reportId}/resolve`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

function enc(value: string): string {
  return encodeURIComponent(value);
}
