/** Blog domain types (API-backed; no demo seed data). */

export type AuthorRole = "student" | "faculty" | "admin";

export interface Author {
  name: string;
  initials: string;
  role: AuthorRole;
}

export interface BlogPost {
  id: string;
  courseCode: string;
  topicId?: string;
  topicTitle?: string;
  title: string;
  excerpt: string;
  body: string;
  tags: string[];
  readTimeMin: number;
  author: Author;
  createdAt: Date;
  upvotes: number;
  downvotes: number;
  viewerVote?: "up" | "down" | null;
  isVerified: boolean;
  isAdminCurated: boolean;
  commentCount: number;
  isPinned?: boolean;
  coverImageUrl?: string;
  reported?: boolean;
  reportReason?: string;
  reportDetails?: string;
}

export interface Comment {
  id: string;
  postId: string;
  parentId: string | null;
  author: Author;
  body: string;
  createdAt: Date;
  upvotes: number;
  downvotes: number;
  isVerified?: boolean;
  reported?: boolean;
  reportReason?: string;
  reportDetails?: string;
}

export const blogPosts: BlogPost[] = [];
export const comments: Comment[] = [];

let nextPostId = 1;
let nextCommentId = 1;

export function makePostId() {
  return `p${nextPostId++}`;
}

export function makeCommentId() {
  return `c${nextCommentId++}`;
}

export function saveBlogsToStorage() {
  /* no-op: blogs are API-backed */
}

export function saveCommentsToStorage() {
  /* no-op: comments are API-backed */
}

export function deleteBlogPost(_id: string): boolean {
  return false;
}

export function deleteComment(_id: string): boolean {
  return false;
}
