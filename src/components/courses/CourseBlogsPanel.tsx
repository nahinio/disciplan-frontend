import { useEffect, useMemo, useState } from "react";
import { encodeCourseCode } from "@/lib/blog";
import { useBlogPosts } from "@/hooks/useBlogPosts";
import { BlogPostCard } from "@/components/blogs/BlogPostCard";
import { Link } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { AppSelect } from "@/components/ui/app-select";
import { api } from "@/lib/api";

interface Topic {
  id: number;
  title: string;
}

export function CourseBlogsPanel({ code, initialTopic }: { code: string; initialTopic?: string }) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);

  useEffect(() => {
    void api
      .getPracticeTopics(code)
      .then((res) => {
        const items = (res.items as Record<string, unknown>[]).map((t) => ({
          id: Number(t.id),
          title: String(t.topic ?? t.title ?? ""),
        }));
        setTopics(items);
        if (initialTopic) {
          const match = items.find(
            (t) =>
              t.title.toLowerCase() === initialTopic.toLowerCase() ||
              t.title.toLowerCase().includes(initialTopic.toLowerCase())
          );
          if (match) setSelectedTopicId(match.id);
        }
      })
      .catch(() => setTopics([]));
  }, [code, initialTopic]);

  const { posts, loading } = useBlogPosts(code, 50, selectedTopicId);

  const verifiedCount = useMemo(() => posts.filter((p) => p.isVerified).length, [posts]);
  const slug = encodeCourseCode(code);

  if (loading && posts.length === 0) {
    return (
      <section className="rounded-[1.5rem] border border-[#dce5d4] bg-white p-6">
        <p className="text-sm text-slate-500">Loading blog posts…</p>
      </section>
    );
  }

  return (
    <section className="rounded-[1.5rem] border border-[#dce5d4] bg-white p-6 shadow-[0_8px_24px_-16px_rgba(125,155,118,0.35)]">
      <header className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="font-display text-2xl tracking-tight text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#7d9b76]" />
            Blogs
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Topic guides from admin & faculty. Student posts appear when verified.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {topics.length > 0 && (
            <AppSelect
              size="sm"
              value={selectedTopicId != null ? String(selectedTopicId) : ""}
              onValueChange={(v) => setSelectedTopicId(v ? Number(v) : null)}
              placeholder="All topics"
              options={[
                { value: "", label: "All topics" },
                ...topics.map((t) => ({ value: String(t.id), label: t.title })),
              ]}
            />
          )}
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#7d9b76] font-bold">
            {verifiedCount} verified · {posts.length} total
          </span>
        </div>
      </header>

      {posts.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-[#dce5d4] rounded-2xl">
          <p className="text-sm text-slate-500">
            {selectedTopicId
              ? "No blog posts for this topic yet."
              : "No blog posts yet for this course."}
          </p>
          <Link
            to="/blogs/new"
            search={{ course: code, topic_id: selectedTopicId ?? undefined }}
            className="mt-3 inline-flex items-center gap-1.5 px-3.5 h-8 rounded-full border border-[#dce5d4] hover:border-slate-400 text-xs font-semibold text-slate-600 transition cursor-pointer bg-white"
          >
            Write a post
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="divide-y divide-slate-100">
            {posts.map((post) => (
              <BlogPostCard key={post.id} post={post} />
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-center">
            <Link
              to="/blogs/$courseCode"
              params={{ courseCode: slug }}
              className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full bg-[#7d9b76] text-white text-xs font-semibold hover:bg-[#6b8865] transition cursor-pointer"
            >
              See all blog posts →
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
