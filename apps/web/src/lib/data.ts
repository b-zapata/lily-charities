import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type {
  ApprovalQueueItem,
  ChangeRequestDetail,
  SchoolDetail,
  SchoolPhoto,
  SchoolPhotoPage,
  SchoolSummary,
  SchoolTimelineEvent,
  UserProfile
} from "@/lib/types";

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, email, role, is_active")
    .eq("id", data.user.id)
    .maybeSingle();

  return profile;
}

export async function getCurrentUserProfile() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, email, phone, role, preferred_app_language, is_active, home_area, notes, last_seen_at, created_at, updated_at")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (error) {
    console.error(error);
    return null;
  }

  return data as UserProfile | null;
}

export async function getUserProfileById(id: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, email, phone, role, preferred_app_language, is_active, home_area, notes, last_seen_at, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(error);
    return null;
  }

  return data as UserProfile | null;
}

export async function getSchools(params?: {
  q?: string;
  stage?: string;
  cleanup?: string;
  page?: string;
  pageSize?: string;
}) {
  const supabase = await createSupabaseServerClient();
  const pageSize = clampNumber(params?.pageSize, 25, 10, 100);
  const requestedPage = clampNumber(params?.page, 1, 1, 9999);

  if (!supabase) {
    return {
      schools: [] as SchoolSummary[],
      total: 0,
      page: requestedPage,
      pageSize,
      totalPages: 1
    };
  }

  let query = supabase
    .from("active_school_summary_view")
    .select("*", { count: "exact" })
    .order("school_number", { ascending: true });

  if (params?.q) {
    const q = params.q.replaceAll(",", " ");
    query = query.or(
      `school_number.ilike.%${q}%,name.ilike.%${q}%,address.ilike.%${q}%,principal_name.ilike.%${q}%`
    );
  }
  if (params?.stage) query = query.eq("pipeline_stage", params.stage);
  if (params?.cleanup === "true") {
    query = query.or("needs_map_pin_cleanup.eq.true,latitude.is.null,longitude.is.null");
  }

  const from = (requestedPage - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await query.range(from, to);
  if (error) {
    console.error(error);
    return {
      schools: [] as SchoolSummary[],
      total: 0,
      page: requestedPage,
      pageSize,
      totalPages: 1
    };
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    schools: (data ?? []) as SchoolSummary[],
    total,
    page: requestedPage,
    pageSize,
    totalPages
  };
}

function clampNumber(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

export async function getSchool(id: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("school_detail_view")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(error);
    return null;
  }
  return data as SchoolDetail | null;
}

export async function getSchoolTimeline(school: SchoolDetail) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [] as SchoolTimelineEvent[];

  const { data: auditEvents, error } = await supabase
    .from("audit_events")
    .select("id, actor_id, event_type, entity_type, change_request_id, metadata, created_at")
    .eq("school_id", school.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
  }

  const actorIds = new Set<string>();
  if (school.created_by) actorIds.add(school.created_by);
  if (school.updated_by) actorIds.add(school.updated_by);

  const assessment = asRecord(school.assessment);
  const librarySetup = asRecord(school.library_setup);
  const assessmentActor = stringValue(assessment.prepared_by_user_id) ?? stringValue(assessment.created_by);
  if (assessmentActor) actorIds.add(assessmentActor);

  for (const event of auditEvents ?? []) {
    if (event.actor_id) actorIds.add(event.actor_id);
  }

  const actorNames = await getActorNames([...actorIds]);
  const events: SchoolTimelineEvent[] = [];

  if (school.created_at) {
    events.push({
      id: `school-created-${school.id}`,
      label: school.created_source === "import" ? "Imported into Lily Ops" : "School created",
      description: school.school_number,
      occurred_at: school.created_at,
      actor_name: school.created_by ? actorNames.get(school.created_by) ?? null : null,
      event_type: "school_created"
    });
  }

  const assessmentDate = stringValue(assessment.submitted_at) ?? stringValue(assessment.created_at) ?? stringValue(assessment.visit_date);
  if (assessmentDate) {
    events.push({
      id: `assessment-${school.id}`,
      label: "Initial assessment submitted",
      description: stringValue(assessment.visit_date) ? `Visit date: ${formatDate(stringValue(assessment.visit_date)!)} ` : null,
      occurred_at: assessmentDate,
      actor_name: assessmentActor ? actorNames.get(assessmentActor) ?? null : stringValue(assessment.prepared_by_name),
      event_type: "assessment_submitted"
    });
  }

  addLibraryDate(events, librarySetup, "setup_started_date", "Setup started", school, actorNames);
  addLibraryDate(events, librarySetup, "training_completed_date", "Training completed", school, actorNames);
  addLibraryDate(events, librarySetup, "operational_date", "Library operational", school, actorNames);

  for (const event of auditEvents ?? []) {
    events.push({
      id: event.id,
      label: humanizeAuditEvent(event.event_type),
      description: auditDescription(event),
      occurred_at: event.created_at,
      actor_name: event.actor_id ? actorNames.get(event.actor_id) ?? null : null,
      event_type: event.event_type
    });
  }

  return events.sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());
}

export async function getSchoolPhotos(
  schoolId: string,
  params?: {
    page?: string;
    pageSize?: string;
  }
) {
  const supabase = await createSupabaseServerClient();
  const pageSize = clampNumber(params?.pageSize, 12, 4, 48);
  const requestedPage = clampNumber(params?.page, 1, 1, 9999);

  if (!supabase) {
    return {
      photos: [] as SchoolPhoto[],
      total: 0,
      page: requestedPage,
      pageSize,
      totalPages: 1
    } satisfies SchoolPhotoPage;
  }

  const from = (requestedPage - 1) * pageSize;
  const to = from + pageSize - 1;

  const initialResult = await supabase
    .from("photos")
    .select("id, photo_type, caption, approval_status, created_at, uploaded_by, storage_bucket, storage_path, thumbnail_storage_path, external_url", { count: "exact" })
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false })
    .range(from, to);
  let data = initialResult.data as Array<Record<string, unknown>> | null;
  let error = initialResult.error;
  let count = initialResult.count;

  if (error && error.message.includes("external_url")) {
    const fallback = await supabase
      .from("photos")
      .select("id, photo_type, caption, approval_status, created_at, uploaded_by, storage_bucket, storage_path, thumbnail_storage_path", { count: "exact" })
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .range(from, to);
    data = fallback.data as Array<Record<string, unknown>> | null;
    error = fallback.error;
    count = fallback.count;
  }

  if (error) {
    console.error(error);
    return {
      photos: [] as SchoolPhoto[],
      total: 0,
      page: requestedPage,
      pageSize,
      totalPages: 1
    } satisfies SchoolPhotoPage;
  }

  const uploaderIds = [...new Set((data ?? []).map((photo) => photo.uploaded_by).filter(Boolean))] as string[];
  const uploaderNames = await getActorNames(uploaderIds);

  const photos: SchoolPhoto[] = [];
  for (const photo of data ?? []) {
    let imageUrl = stringValue(photo.external_url) ?? null;
    const thumbnailPath = stringValue(photo.thumbnail_storage_path) ?? stringValue(photo.storage_path);
    const storageBucket = stringValue(photo.storage_bucket);

    if (!imageUrl && storageBucket && thumbnailPath) {
      const { data: signedUrl } = await supabase.storage
        .from(storageBucket)
        .createSignedUrl(thumbnailPath, 60 * 60);
      imageUrl = signedUrl?.signedUrl ?? null;
    }

    photos.push({
      id: stringValue(photo.id) ?? "",
      photo_type: stringValue(photo.photo_type) ?? "other",
      caption: stringValue(photo.caption),
      approval_status: stringValue(photo.approval_status) ?? "pending_review",
      created_at: stringValue(photo.created_at) ?? new Date(0).toISOString(),
      uploaded_by_name: stringValue(photo.uploaded_by) ? uploaderNames.get(stringValue(photo.uploaded_by)!) ?? null : null,
      image_url: imageUrl
    });
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    photos,
    total,
    page: requestedPage,
    pageSize,
    totalPages
  } satisfies SchoolPhotoPage;
}

export async function getApprovalQueue() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [] as ApprovalQueueItem[];

  const { data, error } = await supabase
    .from("manager_approval_queue_view")
    .select("*")
    .order("submitted_at", { ascending: true, nullsFirst: false });

  if (error) {
    console.error(error);
    return [];
  }
  return (data ?? []) as ApprovalQueueItem[];
}

export async function getPendingApprovalCount() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from("manager_approval_queue_view")
    .select("id", { count: "exact", head: true });

  if (error) {
    console.error(error);
    return 0;
  }

  return count ?? 0;
}

export async function getChangeRequest(id: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("change_requests")
    .select(
      "*, schools!change_requests_school_id_fkey(school_number, name), profiles!change_requests_submitted_by_fkey(display_name)"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(error);
    return null;
  }

  if (!data) return null;

  return {
    ...data,
    school_number: data.schools?.school_number ?? null,
    school_name: data.schools?.name ?? null,
    submitter_name: data.profiles?.display_name ?? null
  } as ChangeRequestDetail;
}

export async function getUsers() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, email, phone, role, is_active, last_seen_at")
    .order("display_name", { ascending: true });

  if (error) {
    console.error(error);
    return [];
  }
  return data ?? [];
}

async function getActorNames(actorIds: string[]) {
  const names = new Map<string, string>();
  if (actorIds.length === 0) return names;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return names;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, email")
    .in("id", actorIds);

  if (error) {
    console.error(error);
    return names;
  }

  for (const profile of data ?? []) {
    names.set(profile.id, profile.display_name || profile.email);
  }

  return names;
}

function addLibraryDate(
  events: SchoolTimelineEvent[],
  librarySetup: Record<string, unknown>,
  key: string,
  label: string,
  school: SchoolDetail,
  actorNames: Map<string, string>
) {
  const date = stringValue(librarySetup[key]);
  if (!date) return;

  const actorId = stringValue(librarySetup.updated_by) ?? school.updated_by ?? null;
  events.push({
    id: `${key}-${school.id}`,
    label,
    description: null,
    occurred_at: date,
    actor_name: actorId ? actorNames.get(actorId) ?? null : null,
    event_type: key
  });
}

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {} as Record<string, unknown>;
  return value as Record<string, unknown>;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function humanizeValue(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function humanizeAuditEvent(value: string) {
  const labels: Record<string, string> = {
    change_request_reviewed: "Change request reviewed",
    school_created: "School created",
    school_updated: "School updated",
    user_created: "User created",
    user_updated: "User updated"
  };

  return labels[value] ?? humanizeValue(value);
}

function auditDescription(event: { entity_type: string; change_request_id: string | null; metadata: unknown }) {
  const metadata = asRecord(event.metadata);
  const decision = asRecord(metadata.decision);
  const pipelineStage = stringValue(decision.pipeline_stage);
  if (pipelineStage) return `Status: ${humanizeValue(pipelineStage)}`;
  const status = stringValue(decision.status);
  if (status) return `Decision: ${humanizeValue(status)}`;
  if (event.change_request_id) return `Change request ${event.change_request_id}`;
  return event.entity_type ? humanizeValue(event.entity_type) : null;
}

export function getConfigWarning() {
  if (isSupabaseConfigured()) return null;
  return "Supabase environment variables are not configured yet. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to connect live data.";
}
