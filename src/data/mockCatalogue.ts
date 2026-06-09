export type CourseTypeCode = "theory" | "lab";

export interface CatalogueCourse {
  code: string;
  title: string;
  credit: number;
  department: string;
  description: string;
  has_project?: boolean;
  course_type_code?: CourseTypeCode;
  course_type_label?: string;
  class_duration_minutes?: number;
}

/** @deprecated Use API catalogue via useCatalogue() */
export const CATALOGUE: CatalogueCourse[] = [];
