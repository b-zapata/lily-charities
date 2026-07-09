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
    title: "Visit Summary",
    fields: [
      { key: "visit_date", label: "Visit date", type: "date" },
      { key: "prepared_by_name", label: "Prepared by", type: "text" },
      { key: "is_good_fit_for_project", label: "Good fit", type: "boolean" },
      { key: "additional_comments", label: "Additional comments", type: "textarea", full: true }
    ]
  },
  {
    title: "Location Eligibility",
    fields: [
      { key: "located_in_dhaka_district", label: "Located in Dhaka district", type: "boolean" },
      { key: "underprivileged_or_low_income_area", label: "Low-income area", type: "boolean" },
      { key: "geographic_notes", label: "Notes", type: "textarea", full: true }
    ]
  },
  {
    title: "Library Readiness",
    fields: [
      { key: "no_existing_library_facilities", label: "No existing library facilities", type: "boolean" },
      { key: "secure_space_available_for_library", label: "Secure space available", type: "boolean" },
      { key: "space_sufficient_for_library_needs", label: "Space sufficient", type: "boolean" },
      { key: "library_space_description", label: "Space description", type: "textarea", full: true },
      { key: "library_space_size", label: "Space size", type: "text" },
      { key: "infrastructure_notes", label: "Notes", type: "textarea", full: true }
    ]
  },
  {
    title: "School Support",
    fields: [
      { key: "commitment_from_school_administration", label: "Administration commitment", type: "boolean" },
      { key: "supports_establishing_and_maintaining_library", label: "Supports maintaining library", type: "boolean" },
      { key: "willing_to_participate_in_ambassador_program", label: "Student ambassador program", type: "boolean" },
      { key: "administrative_support_notes", label: "Notes", type: "textarea", full: true }
    ]
  },
  {
    title: "Student Population",
    fields: [
      { key: "at_least_200_students", label: "At least 200 students", type: "boolean" },
      { key: "diverse_student_demographics", label: "Diverse demographics", type: "boolean" },
      { key: "estimated_total_students", label: "Estimated total students", type: "number" },
      { key: "key_demographics", label: "Key demographics", type: "textarea", full: true }
    ]
  },
  {
    title: "Project Fit",
    fields: [
      { key: "environment_conducive_to_learning", label: "Conducive learning environment", type: "boolean" },
      { key: "positive_attitude_toward_project", label: "Positive attitude toward project", type: "boolean" },
      { key: "potential_challenges_identified", label: "Potential challenges identified", type: "boolean" },
      { key: "suitability_notes", label: "Notes", type: "textarea", full: true }
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
