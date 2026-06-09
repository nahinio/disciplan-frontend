import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, Clock, Crown, Pin } from "lucide-react";
import type { BlogPost } from "@/data/mockBlog";
import { encodeCourseCode } from "@/lib/blog";
import { AuthorBlock } from "./AuthorBlock";
import { ShareButton, VoteBar } from "./VoteBar";
import { PostActionsMenu } from "./PostActionsMenu";

export function BlogPostCard({ post }: { post: BlogPost }) {
  const courseSlug = encodeCourseCode(post.courseCode);
  const href = `/blogs/${courseSlug}/${post.id}`;
  const isAdmin = post.author.role === "admin";

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={`py-5 border-b border-border ${isAdmin ? "border-l-2 border-l-rose-600 pl-4" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <AuthorBlock
          author={post.author}
          createdAt={post.createdAt}
          courseCode={post.courseCode}
        />
        <PostActionsMenu post={post} href={href} />
      </div>


      <Link
        to="/blogs/$courseCode/$postId"
        params={{ courseCode: courseSlug, postId: post.id }}
        className="block mt-3 group"
      >
        <h3 className="font-display text-xl font-semibold tracking-tight leading-tight text-foreground group-hover:underline underline-offset-4 flex items-center gap-2 flex-wrap">
          {post.title}
          {(post.isPinned || (post.author.role === "admin" && post.isPinned !== false)) && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.5 rounded border border-rose-200/50">
              <Pin className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
              Pinned
            </span>
          )}
          {post.isVerified && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/60">
              <BadgeCheck className="w-3.5 h-3.5 text-rose-600" />
              Verified
            </span>
          )}
          {post.isAdminCurated && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/50">
              <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              Official
            </span>
          )}
        </h3>
        <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
      </Link>

      <div className="mt-3 flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {post.readTimeMin} min read
        </span>
        <div className="flex flex-wrap gap-1">
          {post.topicTitle && (
            <span className="px-1.5 py-0.5 rounded bg-[#f5f8f2] text-[#5a7354] text-[10px] font-semibold border border-[#dce5d4]">
              {post.topicTitle}
            </span>
          )}
          {post.tags.filter((t) => t !== post.topicTitle).map((t) => (
            <span
              key={t}
              className="px-1.5 py-0.5 rounded bg-muted text-foreground text-[10px] font-medium"
            >
              #{t}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <VoteBar
          target={post}
          postId={Number.isFinite(Number(post.id)) ? Number(post.id) : undefined}
          courseCode={post.courseCode}
          initialVote={post.viewerVote}
          commentCount={post.commentCount}
          shareUrl={href}
          shareSlot="end"
          onComment={() => {
            window.location.href = href + "#comments";
          }}
        />
        <ShareButton shareUrl={href} />
      </div>
    </motion.article>
  );
}
