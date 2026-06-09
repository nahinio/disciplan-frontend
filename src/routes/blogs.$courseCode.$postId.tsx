import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { appRouteSsr, requireAuth } from "@/lib/routeAuth";
import { ArrowLeft, PenSquare, Crown, Pin, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useUserStats } from "@/hooks/useUserStats";
import { TopHeader } from "@/components/dashboard/TopHeader";
import { MobileTabBar } from "@/components/dashboard/MobileTabBar";
import { AuthorBlock } from "@/components/blogs/AuthorBlock";
import { ShareButton, VoteBar } from "@/components/blogs/VoteBar";
import { PostActionsMenu } from "@/components/blogs/PostActionsMenu";
import { CommentThread } from "@/components/blogs/CommentThread";
import { decodeCourseCode, encodeCourseCode } from "@/lib/blog";
import { useBlogPost } from "@/hooks/useBlogPost";

export const Route = createFileRoute("/blogs/$courseCode/$postId")({
  ssr: appRouteSsr,
  beforeLoad: () => {
    requireAuth();
  },
  loader: ({ params }) => {
    const code = decodeCourseCode(params.courseCode);
    const postId = Number(params.postId);
    if (!Number.isFinite(postId)) throw notFound();
    return { code, postId };
  },
  head: () => ({
    meta: [{ title: "DisciPlan — Post" }],
  }),
  notFoundComponent: () => (
    <div className="h-screen flex items-center justify-center text-muted-foreground">
      Post not found.
    </div>
  ),
  component: PostPage,
});

function PostPage() {
  const { code, postId } = Route.useLoaderData();
  const { profile } = useUserStats();
  const { post, comments, loading, refresh } = useBlogPost(postId);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-muted-foreground">
        Loading post…
      </div>
    );
  }

  if (!post || post.courseCode !== code) {
    throw notFound();
  }

  const slug = encodeCourseCode(post.courseCode);
  const href = `/blogs/${slug}/${post.id}`;
  const canVerify =
    (profile.role === "faculty" || profile.role === "admin") &&
    post.author.role === "student" &&
    !post.isVerified;

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-background text-foreground">
      <TopHeader />
      <main className="flex-1 overflow-y-auto no-scrollbar pb-20 md:pb-0">
        <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 space-y-8">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Link
              to="/blogs/$courseCode"
              params={{ courseCode: slug }}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to {post.courseCode}
            </Link>
            <Link
              to="/blogs/new"
              search={{ course: post.courseCode }}
              className="inline-flex items-center gap-2 px-3.5 h-9 rounded-full bg-rose-600 text-white text-xs font-medium hover:bg-rose-700 transition shadow-sm"
            >
              <PenSquare className="w-3.5 h-3.5" />
              New post
            </Link>
          </div>

          <article className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <AuthorBlock
                author={post.author}
                createdAt={post.createdAt}
                courseCode={post.courseCode}
                readTimeMin={post.readTimeMin}
                size="md"
              />
              <PostActionsMenu post={post} href={href} />
            </div>

            <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight leading-tight flex items-center gap-2 flex-wrap">
              {post.title}
              {(post.isPinned || (post.author.role === "admin" && post.isPinned !== false)) && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-2 py-1 rounded border border-rose-200/50">
                  <Pin className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                  Pinned
                </span>
              )}
              {post.isVerified && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2 py-1 rounded border border-rose-200/60">
                  <BadgeCheck className="w-3.5 h-3.5 text-rose-600" />
                  Verified
                </span>
              )}
              {post.isAdminCurated && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200/50">
                  <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  Official
                </span>
              )}
              {post.topicTitle && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#5a7354] bg-[#f5f8f2] px-2 py-1 rounded border border-[#dce5d4]">
                  {post.topicTitle}
                </span>
              )}
            </h1>

            {canVerify && (
              <button
                type="button"
                onClick={() =>
                  void api.verifyBlogPost(postId).then(() => {
                    toast.success("Student post verified.");
                    void refresh();
                  }).catch(() => toast.error("Could not verify post."))
                }
                className="inline-flex items-center gap-2 px-4 h-9 rounded-full bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition"
              >
                <BadgeCheck className="w-4 h-4" />
                Verify student post
              </button>
            )}

            <div className="prose prose-neutral max-w-none dark:prose-invert">
              {/<[a-z][\s\S]*>/i.test(post.body) ? (
                <div
                  className="rich-content"
                  dangerouslySetInnerHTML={{ __html: post.body }}
                />
              ) : (
                <div className="space-y-4">
                  {post.body
                    .split(/\n{2,}/)
                    .map((s: string) => s.trim())
                    .filter(Boolean)
                    .map((para: string, i: number) => (
                      <p
                        key={i}
                        className="text-[15px] md:text-base text-foreground leading-relaxed whitespace-pre-wrap"
                      >
                        {para}
                      </p>
                    ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
              <VoteBar
                target={post}
                postId={postId}
                initialVote={post.viewerVote}
                commentCount={post.commentCount}
                shareUrl={href}
                shareSlot="end"
                size="md"
                onVoteChange={() => void refresh()}
                onComment={() => {
                  document.getElementById("comments")?.scrollIntoView({ behavior: "smooth" });
                }}
              />
              <ShareButton shareUrl={href} cls="text-sm h-9 px-3" />
            </div>
          </article>

          <CommentThread postId={post.id} comments={comments} onRefresh={refresh} />
        </div>
      </main>
      <MobileTabBar />
    </div>
  );
}
