import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { ApprovalQueueItem, ChangeRequestDetail, SchoolDetail, SchoolSummary } from "@/lib/types";

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

export async function getSchools(params?: {
  q?: string;
  stage?: string;
  outcome?: string;
  cleanup?: string;
}) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [] as SchoolSummary[];

  let query = supabase
    .from("active_school_summary_view")
    .select("*")
    .order("school_number", { ascending: true });

  if (params?.q) {
    const q = params.q.replaceAll(",", " ");
    query = query.or(
      `school_number.ilike.%${q}%,name.ilike.%${q}%,address.ilike.%${q}%,principal_name.ilike.%${q}%`
    );
  }
  if (params?.stage) query = query.eq("pipeline_stage", params.stage);
  if (params?.outcome) query = query.eq("selection_outcome", params.outcome);
  if (params?.cleanup === "true") query = query.eq("needs_map_pin_cleanup", true);

  const { data, error } = await query;
  if (error) {
    console.error(error);
    return [];
  }
  return (data ?? []) as SchoolSummary[];
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

export async function getChangeRequest(id: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("change_requests")
    .select(
      "*, schools(school_number, name), profiles!change_requests_submitted_by_fkey(display_name)"
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

export function getConfigWarning() {
  if (isSupabaseConfigured()) return null;
  return "Supabase environment variables are not configured yet. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to connect live data.";
}
