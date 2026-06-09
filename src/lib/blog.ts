import type { Comment } from "@/data/mockBlog";

export function encodeCourseCode(code: string): string {
  return code.replace(/\s+/g, "-");
}

export function decodeCourseCode(slug: string): string {
  return slug.replace(/-/g, " ");
}

export function score(p: { upvotes: number; downvotes: number }): number {
  return p.upvotes - p.downvotes;
}

export interface CommentNode extends Comment {
  children: CommentNode[];
}

export function vote(
  target: { upvotes: number; downvotes: number },
  dir: "up" | "down" | "clear",
  prev: "up" | "down" | null
): "up" | "down" | null {
  if (prev === "up") target.upvotes = Math.max(0, target.upvotes - 1);
  if (prev === "down") target.downvotes = Math.max(0, target.downvotes - 1);
  if (dir === "up") {
    target.upvotes += 1;
    return "up";
  }
  if (dir === "down") {
    target.downvotes += 1;
    return "down";
  }
  return null;
}

export function readTimeFromBody(body: string): number {
  const words = body.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  return date.toLocaleDateString();
}
