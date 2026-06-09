/** Section hub domain types (API-backed; no demo seed data). */

export interface SectionUser {
  name: string;
  role: "student" | "faculty";
  initials: string;
}

export interface AnnouncementComment {
  id: string;
  announcementId: string;
  content: string;
  author: SectionUser;
  createdAt: Date;
}

export interface SectionAnnouncement {
  id: string;
  courseCode: string;
  section: string;
  title: string;
  content: string;
  author: SectionUser;
  createdAt: Date;
  comments: AnnouncementComment[];
  pinned?: boolean;
  images?: string[];
}

export interface DoubtAnswer {
  id: string;
  doubtId: string;
  content: string;
  author: SectionUser;
  isVerified: boolean;
  isEndorsed?: boolean;
  isOfficial?: boolean;
  createdAt: Date;
  reported?: boolean;
  reportReason?: string;
  reportDetails?: string;
}

export interface SectionDoubt {
  id: string;
  courseCode: string;
  section: string;
  question: string;
  description: string;
  author: SectionUser;
  createdAt: Date;
  answers: DoubtAnswer[];
  images?: string[];
  isVerified?: boolean;
  acceptedAnswerId?: string | null;
  answerCount?: number;
  reported?: boolean;
  reportReason?: string;
  reportDetails?: string;
}

export interface ChatMessage {
  id: string;
  courseCode: string;
  section: string;
  content: string;
  author: SectionUser;
  createdAt: Date;
}

export interface ProjectGrade {
  componentName: string;
  marksObtained: number;
  maxMarks: number;
  feedback?: string;
}

export interface StudentGrades {
  id: string;
  name: string;
  email: string;
  ctMarks: number[];
  midMarks: number;
  attendance: number;
  overallStatus: "Excellent" | "Steady" | "Needs Attention" | "Critical Risk";
  projectGrades?: ProjectGrade[];
}
