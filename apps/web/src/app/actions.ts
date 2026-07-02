"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseServerClient = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>;

function requiredString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function optionalString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

async function requireManagerProfile(supabase: SupabaseServerClient) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("You must be signed in.");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!profile || !["manager", "admin"].includes(profile.role)) {
    throw new Error("Manager role is required.");
  }

  return profile;
}

function optionalJson(formData: FormData, key: string) {
  const value = optionalString(formData, key);
  if (!value) return null;

  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new Error(`${key} must be valid JSON`);
  }
}

export async function signIn(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?error=config");

  const email = requiredString(formData, "email");
  const password = requiredString(formData, "password");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/schools");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/login");
}

export async function createSchool(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/schools/new?error=config");
  const manager = await requireManagerProfile(supabase);

  const schoolNumber = optionalString(formData, "school_number");
  let generatedNumber = schoolNumber;
  if (!generatedNumber) {
    const { data, error } = await supabase.rpc("generate_school_number");
    if (error) throw new Error(error.message);
    generatedNumber = data as string;
  }

  const latitude = Number(requiredString(formData, "latitude"));
  const longitude = Number(requiredString(formData, "longitude"));

  const { data, error } = await supabase
    .from("schools")
    .insert({
      school_number: generatedNumber,
      name: requiredString(formData, "name"),
      name_english: optionalString(formData, "name_english"),
      name_bangla: optionalString(formData, "name_bangla"),
      address: optionalString(formData, "address"),
      district: optionalString(formData, "district"),
      donor_id: optionalString(formData, "donor_id"),
      latitude,
      longitude,
      map_pin_source: "manual",
      map_pin_confirmed_at: new Date().toISOString(),
      map_pin_confirmed_by: manager.id,
      pipeline_stage: "identified",
      selection_outcome: "pending",
      created_source: "manager",
      created_by: manager.id,
      updated_by: manager.id
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/schools");
  redirect(`/schools/${data.id}`);
}

export async function updateSchool(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is not configured");
  const manager = await requireManagerProfile(supabase);

  const id = requiredString(formData, "id");
  const latitudeValue = optionalString(formData, "latitude");
  const longitudeValue = optionalString(formData, "longitude");
  const hasConfirmedPin = Boolean(latitudeValue && longitudeValue);

  const { error } = await supabase
    .from("schools")
    .update({
      school_number: requiredString(formData, "school_number"),
      name: requiredString(formData, "name"),
      name_english: optionalString(formData, "name_english"),
      name_bangla: optionalString(formData, "name_bangla"),
      address: optionalString(formData, "address"),
      district: optionalString(formData, "district"),
      donor_id: optionalString(formData, "donor_id"),
      latitude: latitudeValue ? Number(latitudeValue) : null,
      longitude: longitudeValue ? Number(longitudeValue) : null,
      needs_map_pin_cleanup: hasConfirmedPin ? false : formData.get("needs_map_pin_cleanup") === "on",
      map_pin_source: hasConfirmedPin ? "manual" : null,
      map_pin_confirmed_at: hasConfirmedPin ? new Date().toISOString() : null,
      map_pin_confirmed_by: hasConfirmedPin ? manager.id : null,
      pipeline_stage: requiredString(formData, "pipeline_stage"),
      selection_outcome: requiredString(formData, "selection_outcome"),
      updated_by: manager.id
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/schools");
  revalidatePath(`/schools/${id}`);
  redirect(`/schools/${id}`);
}

export async function reviewChangeRequest(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is not configured");
  await requireManagerProfile(supabase);

  const id = requiredString(formData, "id");
  const status = requiredString(formData, "status");
  const reviewNotes = optionalString(formData, "review_notes");
  const selectionOutcome = optionalString(formData, "selection_outcome");
  const appliedData = optionalJson(formData, "applied_data_json");
  const componentDecisions = optionalJson(formData, "component_decisions_json");

  const decision: Record<string, unknown> = {
    status,
    review_notes: reviewNotes
  };
  if (selectionOutcome) decision.selection_outcome = selectionOutcome;
  if (appliedData) decision.applied_data = appliedData;
  if (componentDecisions) decision.component_decisions = componentDecisions;

  const { error } = await supabase.rpc("manager_review_change_request", {
    change_request_id: id,
    decision
  });

  if (error) throw new Error(error.message);
  revalidatePath("/approvals");
  redirect("/approvals");
}
