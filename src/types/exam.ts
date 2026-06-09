export interface StudentSubmission {
  id?: number;
  studentId: string;
  studentName: string;
  studentEmail: string;
  submittedFile: string;
  submittedAt: string;
  marksObtained?: number;
  maxMarks: number;
  feedback?: string;
  gradedAt?: string;
  fileUrl?: string;
}

export interface ExamAssignment {
  id: string;
  courseCode: string;
  section: string;
  title: string;
  deadline: string;
  questions: string;
  attachmentName?: string;
  maxMarks: number;
  submissions: StudentSubmission[];
  createdAt: string;
}
