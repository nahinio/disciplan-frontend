export type ForumTag = "Doubt" | "Advice" | "Resource" | "Discussion";

export interface ForumThread {
  id: string;
  courseCode: string;
  title: string;
  body: string;
  author: { name: string; initials: string; role: "student" | "cr" | "faculty" };
  authorUserId: number;
  tag: ForumTag;
  upvotes: number;
  replies: number;
  lastActivity: Date;
  resolved: boolean;
  images: string[];
  viewerHasUpvoted?: boolean;
}
