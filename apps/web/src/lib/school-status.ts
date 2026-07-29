import type { PipelineStage } from "@/lib/types";

export type SchoolStatusRole = "volunteer" | "manager" | "admin";

export const schoolStatusOptions: ReadonlyArray<{
  value: PipelineStage;
  label: string;
}> = [
  { value: "identified", label: "Identified" },
  { value: "assessed", label: "Assessed" },
  { value: "selected", label: "Selected" },
  { value: "not_selected", label: "Not selected" },
  { value: "setup_in_progress", label: "Setup in progress" },
  { value: "training", label: "Training" },
  { value: "operational", label: "Operational" }
];

const pipelineStages = new Set<PipelineStage>(
  schoolStatusOptions.map((option) => option.value)
);

export function isPipelineStage(value: unknown): value is PipelineStage {
  return typeof value === "string" && pipelineStages.has(value as PipelineStage);
}

export function canChooseSchoolStatus(
  role: SchoolStatusRole | null | undefined,
  status: PipelineStage
) {
  if (role === "admin") return true;
  if (status === "assessed") return false;
  if (role === "manager") return true;
  if (role === "volunteer") {
    return status !== "selected" && status !== "not_selected";
  }
  return false;
}

export function schoolStatusPermissionMessage(role: SchoolStatusRole) {
  if (role === "manager") {
    return "Managers cannot change a school to assessed. Complete an initial assessment instead.";
  }
  if (role === "volunteer") {
    return "Volunteers cannot propose assessed, selected, or not selected status.";
  }
  return "This status change is not allowed.";
}
