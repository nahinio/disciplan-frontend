export interface DoubtSearchItem {
  id: number;
  courseCode: string;
  sectionLabel: string;
  title: string;
  body: string;
  authorName: string;
  createdAt: Date;
  isVerified: boolean;
  acceptedAnswerId: number | null;
  hasFacultyAnswer: boolean;
  answerCount: number;
  relevanceScore: number;
}

export interface DoubtAnswerItem {
  id: number;
  parentAnswerId: number | null;
  body: string;
  authorName: string;
  authorRole: "student" | "faculty" | "admin";
  isFacultyAnswer: boolean;
  isFacultyEndorsed: boolean;
  createdAt: Date;
}

export interface DoubtDetail extends DoubtSearchItem {
  answers: DoubtAnswerItem[];
}

export function mapDoubtSearchRow(row: Record<string, unknown>): DoubtSearchItem {
  return {
    id: Number(row.id),
    courseCode: String(row.course_code ?? ""),
    sectionLabel: String(row.section_label ?? ""),
    title: String(row.title ?? ""),
    body: String(row.body ?? ""),
    authorName: String(row.author_name ?? "Student"),
    createdAt: new Date(String(row.created_at ?? Date.now())),
    isVerified: Number(row.is_verified ?? 0) === 1,
    acceptedAnswerId:
      row.accepted_answer_id != null ? Number(row.accepted_answer_id) : null,
    hasFacultyAnswer: Boolean(row.has_faculty_answer),
    answerCount: Number(row.answer_count ?? 0),
    relevanceScore: Number(row.relevance_score ?? 0),
  };
}

export function mapDoubtDetail(row: Record<string, unknown>): DoubtDetail {
  const base = mapDoubtSearchRow(row);
  const answers = ((row.answers as Record<string, unknown>[]) ?? []).map((a) => ({
    id: Number(a.id),
    parentAnswerId: a.parent_answer_id != null ? Number(a.parent_answer_id) : null,
    body: String(a.body ?? ""),
    authorName: String(a.author_name ?? ""),
    authorRole: (a.author_role_code === "faculty" || a.author_role_code === "admin"
      ? a.author_role_code
      : a.is_faculty_answer
        ? "faculty"
        : "student") as DoubtAnswerItem["authorRole"],
    isFacultyAnswer: Boolean(a.is_faculty_answer),
    isFacultyEndorsed: Boolean(a.is_faculty_endorsed),
    createdAt: new Date(String(a.created_at ?? Date.now())),
  }));
  return { ...base, answers };
}

export function isDoubtResolved(
  item: Pick<DoubtSearchItem, "isVerified" | "acceptedAnswerId" | "hasFacultyAnswer">
): boolean {
  return item.isVerified || item.acceptedAnswerId != null || item.hasFacultyAnswer;
}

export function sortAnswersWithOfficialFirst(
  answers: DoubtAnswerItem[],
  acceptedAnswerId: number | null
): DoubtAnswerItem[] {
  if (!acceptedAnswerId) return answers;
  const official = answers.find((a) => a.id === acceptedAnswerId);
  if (!official) return answers;
  return [official, ...answers.filter((a) => a.id !== acceptedAnswerId)];
}
