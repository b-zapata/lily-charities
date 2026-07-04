export type PipelineStage =
  | "identified"
  | "assessed"
  | "selected"
  | "not_selected"
  | "setup_in_progress"
  | "training"
  | "operational";

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
  donor_id: string | null;
  created_source?: string;
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
  assessment?: Record<string, unknown> | null;
  library_setup?: Record<string, unknown> | null;
  summary_notes?: string | null;
  created_at?: string;
  created_by?: string | null;
  updated_by?: string | null;
  version?: number;
};

export type SchoolTimelineEvent = {
  id: string;
  label: string;
  description: string | null;
  occurred_at: string;
  actor_name: string | null;
  event_type: string;
};

export type SchoolPhoto = {
  id: string;
  photo_type: string;
  caption: string | null;
  approval_status: string;
  created_at: string;
  uploaded_by_name: string | null;
  image_url: string | null;
};

export type SchoolPhotoPage = {
  photos: SchoolPhoto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
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

export type UserProfile = {
  id: string;
  display_name: string;
  email: string;
  phone: string | null;
  role: "volunteer" | "manager" | "admin";
  preferred_app_language: string | null;
  is_active: boolean;
  home_area: string | null;
  notes: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};
