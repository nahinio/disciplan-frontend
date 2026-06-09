/** Fallback captions when API has no caption (pre-migration). */

export const FAMILY_INTRO: Record<string, string> = {
  moderator:
    "Report posts or comments that break community rules. Each approved report counts toward your progress.",
  iron_will:
    "Finish every task on your daily planner blueprint — no skips — on consecutive days.",
  faculty_favorite:
    "Answer section doubts well enough that faculty accept your reply as the official solution.",
  master_author: "Write and publish blog posts for your courses.",
  catalyst:
    "Collect upvotes on a single published blog post. Higher tiers need more upvotes on one post.",
  speedrunner:
    "Complete urgent or high-priority tasks within 2 hours of creating them (up to 3 count per day).",
};

export const ACHIEVEMENT_CAPTIONS: Record<string, string> = {
  moderator_1: "Have 1 content report you filed approved by moderators",
  moderator_2: "Have 10 content reports you filed approved by moderators",
  moderator_3: "Have 25 content reports you filed approved by moderators",
  moderator_4: "Have 50 content reports you filed approved by moderators",
  moderator_5: "Have 100 content reports you filed approved by moderators",
  iron_will_1: "Complete 100% of today's planner tasks for 3 days in a row",
  iron_will_2: "Complete 100% of today's planner tasks for 7 days in a row",
  iron_will_3: "Complete 100% of today's planner tasks for 14 days in a row",
  iron_will_4: "Complete 100% of today's planner tasks for 30 days in a row",
  iron_will_5: "Complete 100% of today's planner tasks for 90 days in a row",
  faculty_favorite_1: "Have 1 doubt answer accepted as the official solution by faculty",
  faculty_favorite_2: "Have 10 doubt answers accepted as official solutions by faculty",
  faculty_favorite_3: "Have 25 doubt answers accepted as official solutions by faculty",
  faculty_favorite_4: "Have 50 doubt answers accepted as official solutions by faculty",
  faculty_favorite_5: "Have 100 doubt answers accepted as official solutions by faculty",
  master_author_1: "Publish 1 blog post",
  master_author_2: "Publish 5 blog posts",
  master_author_3: "Publish 10 blog posts",
  master_author_4: "Publish 25 blog posts",
  master_author_5: "Publish 50 blog posts",
  catalyst_1: "Get 100 upvotes on one of your blog posts",
  catalyst_2: "Get 250 upvotes on one of your blog posts",
  catalyst_3: "Get 500 upvotes on one of your blog posts",
  catalyst_4: "Get 1,000 upvotes on one of your blog posts",
  catalyst_5: "Get 2,500 upvotes on one of your blog posts",
  speedrunner_1: "Finish 5 urgent/high-priority tasks within 2 hours of creating them",
  speedrunner_2: "Finish 15 urgent/high-priority tasks within 2 hours of creating them",
  speedrunner_3: "Finish 40 urgent/high-priority tasks within 2 hours of creating them",
  speedrunner_4: "Finish 80 urgent/high-priority tasks within 2 hours of creating them",
  speedrunner_5: "Finish 150 urgent/high-priority tasks within 2 hours of creating them",
};

export function achievementCaption(code: string, apiCaption?: string | null): string {
  return apiCaption?.trim() || ACHIEVEMENT_CAPTIONS[code] || "Complete the required actions to unlock this badge.";
}
