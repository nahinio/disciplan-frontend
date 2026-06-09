export interface CourseOffering {
  section_id?: number;
  program: string;
  course_code: string;
  title: string;
  section: string;
  rooms: string[];
  days: string[];
  times: string[];
  faculty_name: string;
  faculty_initial: string;
  faculty_user_id?: number;
  semester_label?: string;
  schedule_key?: string;
  schedule_days?: string;
  credit: number;
  has_project?: boolean;
  course_type_code?: string;
  course_type_label?: string;
  class_duration_minutes?: number;
  starts_at?: string;
  ends_at?: string;
}
