import { ForumWorkspace } from "@/components/forum/ForumWorkspace";

export function CourseForumPanel({ code }: { code: string }) {
  return <ForumWorkspace mode="course" courseCode={code} />;
}
