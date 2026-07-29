import type { PipelineStage } from "@/lib/types";

export const initialAssessmentStageMessage =
  "Initial assessments can only be submitted for schools in the identified or not selected stage.";

export function canSubmitInitialAssessment(
  pipelineStage: PipelineStage | string | null | undefined
) {
  return pipelineStage === "identified" || pipelineStage === "not_selected";
}
