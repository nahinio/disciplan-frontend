/** Central TanStack Query keys — one cache entry per key, shared across all components. */

export const queryKeys = {
  tasks: {
    all: ["tasks"] as const,
    today: ["tasks", "today"] as const,
    energy: ["tasks", "energy"] as const,
    eventPlans: ["event-plans"] as const,
  },
  calendar: {
    events: (includeTasks = true) => ["calendar", "events", includeTasks] as const,
  },
  catalogue: ["catalogue"] as const,
  offerings: ["offerings"] as const,
  practice: {
    topics: (courseCode: string) => ["practice", "topics", courseCode] as const,
    problems: (courseCode: string, topicId?: number | null) =>
      ["practice", "problems", courseCode, topicId ?? "all"] as const,
    pastPapers: (courseCode: string) => ["practice", "past-papers", courseCode] as const,
  },
  blogs: {
    list: (courseCode?: string, topicId?: number | null, limit?: number) =>
      ["blogs", courseCode ?? "all", topicId ?? "all", limit ?? 50] as const,
    post: (postId: number) => ["blogs", "post", postId] as const,
    comments: (postId: number) => ["blogs", "comments", postId] as const,
  },
  forum: {
    feed: (courseCode: string, threadType: string, sort: string, mineOnly: boolean) =>
      ["forum", "feed", courseCode, threadType, sort, mineOnly ? "mine" : "all"] as const,
    threads: (courseCode: string, threadType: string, mineOnly: boolean) =>
      ["forum", "threads", courseCode, threadType, mineOnly ? "mine" : "all"] as const,
    thread: (threadId: number) => ["forum", "thread", threadId] as const,
    replies: (threadId: number) => ["forum", "replies", threadId] as const,
  },
  doubts: {
    search: (q: string, courseCode?: string, sectionLabel?: string, status?: string) =>
      ["doubts", "search", q, courseCode ?? "", sectionLabel ?? "", status ?? "all"] as const,
    detail: (doubtId: number) => ["doubts", "detail", doubtId] as const,
  },
  section: {
    hub: (courseCode: string, sectionLabel: string) =>
      ["section", "hub", courseCode, sectionLabel] as const,
    grades: (courseCode: string, sectionLabel: string) =>
      ["section", "grades", courseCode, sectionLabel] as const,
    resources: (courseCode: string, sectionLabel: string) =>
      ["section", "resources", courseCode, sectionLabel] as const,
    teams: (courseCode: string, sectionLabel: string) =>
      ["section", "teams", courseCode, sectionLabel] as const,
    practice: (courseCode: string, sectionLabel: string) =>
      ["section", "practice", courseCode, sectionLabel] as const,
  },
  teams: {
    list: ["teams"] as const,
    invitations: ["teams", "invitations"] as const,
    detail: (teamId: string) => ["teams", "detail", teamId] as const,
  },
  routine: ["routine"] as const,
  notifications: ["notifications"] as const,
  admin: {
    all: ["admin"] as const,
    contentStats: ["admin", "content-stats"] as const,
  },
} as const;
