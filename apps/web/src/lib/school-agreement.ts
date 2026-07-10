export const schoolAgreementVersion = "school_agreement_website_v1";

export const schoolAgreementConditions = [
  "A dedicated room will be allocated for operating the library activities.",
  "At least 30 students will be provided for taking photographs with the bookshelf. For photography purposes, the shelf may need to be moved.",
  "The school will cooperate in conducting a student survey once or twice a year, involving 5-10 students.",
  "Students will be responsible for managing the library. Therefore, 6 students will be nominated for Ambassador Training, along with 1 teacher who will serve as the Lead Teacher.",
  "The Ambassador Training will take approximately 1.5-2 hours. This amount of time must be allocated on the training day. The Lead Teacher, the 6 students, and the students' guardians should be informed about this beforehand.",
  "After the library activities begin, a monthly report on library usage must be provided to us. In this regard, the Lead Teacher will be responsible for submitting the report.",
  "Overall, the school will cooperate with us to ensure the successful completion of the program."
];

export function buildSchoolAgreementIntro(schoolName: string, signatoryName = "the signer") {
  return `I hereby certify that, on behalf of ${schoolName}, I, ${signatoryName}, agree to the following conditions to ensure that all activities of the Porooya (Reading) Project at our school are implemented correctly and successfully:`;
}
