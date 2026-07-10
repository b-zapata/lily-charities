export type AssessmentFieldType = "boolean" | "date" | "number" | "text" | "textarea";

export type AssessmentField = {
  key: string;
  label: string;
  type: AssessmentFieldType;
  full?: boolean;
};

export type AssessmentSection = {
  title: string;
  fields: AssessmentField[];
};

export const assessmentSections: AssessmentSection[] = [
  {
    title: "Student Population",
    fields: [
      { key: "underprivileged_or_low_income_area", label: "Underprivileged / low-income", type: "boolean" },
      { key: "estimated_total_students", label: "Total students", type: "number" },
      { key: "at_least_200_students", label: "At least 200 students", type: "boolean" }
    ]
  },
  {
    title: "Final Remarks",
    fields: [
      { key: "is_good_fit_for_project", label: "Recommended for the program", type: "boolean" },
      { key: "additional_comments", label: "Notes", type: "textarea", full: true }
    ]
  }
];

export const assessmentGradeCountFields = [
  { key: "play", label: "Play" },
  { key: "kg", label: "KG" },
  { key: "grade_1", label: "Grade 1" },
  { key: "grade_2", label: "Grade 2" },
  { key: "grade_3", label: "Grade 3" },
  { key: "grade_4", label: "Grade 4" },
  { key: "grade_5", label: "Grade 5" },
  { key: "total", label: "Total" }
];
