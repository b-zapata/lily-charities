export const requiredAssessmentPhotos = [
  {
    key: "front_view",
    label: "Front View of the School",
    description:
      "Clear photograph of the school building, including the main entrance/gate and school name if visible.",
    photoType: "school_exterior",
    caption: "Front view of the school"
  },
  {
    key: "principal_meeting",
    label: "Meeting with the Head Teacher/Principal",
    description:
      "Photograph of the project volunteer(s) with the Head Teacher/Principal during the school visit.",
    photoType: "principal_meeting",
    caption: "Meeting with the Head Teacher/Principal"
  },
  {
    key: "library_space",
    label: "Proposed Library Space",
    description:
      "Photograph showing the designated area where the library will be established, taken before installation.",
    photoType: "library_space",
    caption: "Proposed library space"
  }
] as const;
