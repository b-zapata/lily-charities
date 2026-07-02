export type PipelineStage =
  | "identified"
  | "assessed"
  | "selected"
  | "setup_in_progress"
  | "training"
  | "operational";

export type SelectionOutcome =
  | "pending"
  | "selected"
  | "future_potential"
  | "not_selected";

export type ChangeRequestStatus =
  | "draft"
  | "pending_review"
  | "needs_clarification"
  | "approved"
  | "partially_approved"
  | "rejected"
  | "cancelled";

export type SchoolSummary = {
  id: string;
  school_number: string;
  name: string;
  name_english: string | null;
  name_bangla: string | null;
  address: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  needs_map_pin_cleanup: boolean;
  pipeline_stage: PipelineStage;
  selection_outcome: SelectionOutcome;
  donor_id: string | null;
  principal_name: string | null;
  principal_phone: string | null;
  lead_teacher_name: string | null;
  lead_teacher_phone: string | null;
  assessment_id: string | null;
  agreement_id: string | null;
  agreement_approved_at: string | null;
  pending_approvals_count: number;
  updated_at: string;
};

export type SchoolDetail = SchoolSummary & {
  contacts?: Array<{
    id: string;
    role: string;
    name: string;
    phone: string | null;
    email: string | null;
    title: string | null;
  }>;
  summary_notes?: string | null;
  version?: number;
};

export type ApprovalQueueItem = {
  id: string;
  request_type: string;
  status: ChangeRequestStatus;
  school_id: string | null;
  school_number: string | null;
  school_name: string | null;
  submitted_by: string;
  submitter_name: string | null;
  submitted_at: string | null;
  conflict_detected: boolean;
  updated_at: string;
};

export type ChangeRequestDetail = ApprovalQueueItem & {
  proposed_data: Record<string, unknown>;
  before_data: Record<string, unknown> | null;
  applied_data: Record<string, unknown> | null;
  component_decisions: Record<string, unknown> | null;
  review_notes: string | null;
};
