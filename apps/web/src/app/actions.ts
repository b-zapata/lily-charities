"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assessmentGradeCountFields, assessmentSections } from "@/lib/assessment-fields";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { AssessmentField } from "@/lib/assessment-fields";

type SupabaseServerClient = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>;
type UserRole = "volunteer" | "manager" | "admin";

const contactRoles = ["principal", "lead_teacher", "local_liaison"] as const;
const assessmentFields = assessmentSections.flatMap((section) => section.fields);
const maxFailedLoginAttempts = 3;
const loginLockoutMinutes = 15;

function requiredString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function optionalString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

async function requireActiveProfile(supabase: SupabaseServerClient) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("You must be signed in.");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!profile || !profile.is_active) throw new Error("An active profile is required.");

  return profile as { id: string; role: UserRole; is_active: boolean };
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

async function requireAdminProfile(supabase: SupabaseServerClient) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("You must be signed in.");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!profile || profile.role !== "admin") {
    throw new Error("Admin role is required.");
  }

  return profile as { id: string; role: UserRole };
}

function assertCanAssignRole(actorRole: UserRole, targetRole: UserRole) {
  if (actorRole === "admin") return;
  if (targetRole === "admin") {
    throw new Error("Managers cannot create or assign administrator accounts.");
  }
}

async function getTargetProfile(supabase: SupabaseServerClient, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("User profile not found.");

  return data as { id: string; role: UserRole };
}

function assertCanManageTarget(actor: { id: string; role: UserRole }, target: { id: string; role: UserRole }) {
  if (actor.id === target.id) {
    throw new Error("You cannot change your own account from this screen.");
  }
  if (actor.role === "admin") return;
  if (target.role === "admin") {
    throw new Error("Managers cannot change administrator accounts.");
  }
}

function requiredRole(formData: FormData, key: string): UserRole {
  const value = requiredString(formData, key);
  if (!["volunteer", "manager", "admin"].includes(value)) {
    throw new Error(`${key} must be volunteer, manager, or admin`);
  }

  return value as UserRole;
}

function legacySelectionOutcomeForStatus(status: string) {
  if (["selected", "setup_in_progress", "training", "operational"].includes(status)) return "selected";
  if (status === "not_selected") return "not_selected";
  return "pending";
}

function optionalBoolean(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) return null;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${key} must be yes or no`);
}

function optionalNumber(formData: FormData, key: string) {
  const value = optionalString(formData, key);
  if (value === null) return null;

  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue < 0) {
    throw new Error(`${key} must be a whole number zero or greater`);
  }

  return numberValue;
}

function readAssessmentField(formData: FormData, field: AssessmentField) {
  const key = `assessment_${field.key}`;
  if (field.type === "boolean") return optionalBoolean(formData, key);
  if (field.type === "number") return optionalNumber(formData, key);
  return optionalString(formData, key);
}

function readAssessmentPayload(formData: FormData) {
  const assessment: Record<string, string | boolean | number | null> = {};
  let hasAnyValue = false;

  for (const field of assessmentFields) {
    const value = readAssessmentField(formData, field);
    assessment[field.key] = value;
    if (value !== null) hasAnyValue = true;
  }

  const gradeCounts = assessmentGradeCountFields.map((grade) => {
    const studentCount = optionalNumber(formData, `assessment_grade_count_${grade.key}`);
    if (studentCount !== null) hasAnyValue = true;

    return {
      grade_label: grade.key,
      student_count: studentCount
    };
  });

  return {
    assessment,
    gradeCounts,
    hasAnyValue
  };
}

export async function signIn(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?error=config");

  const email = requiredString(formData, "email").toLowerCase();
  const password = requiredString(formData, "password");
  const lockedUntil = await getActiveLoginLock(email);
  if (lockedUntil) {
    redirect(`/login?error=${encodeURIComponent(formatLockoutMessage(lockedUntil))}`);
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const failure = await recordFailedLogin(email);
    redirect(`/login?error=${encodeURIComponent(failure.message)}`);
  }

  await clearFailedLogins(email);
  redirect("/schools");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/login");
}

async function getActiveLoginLock(email: string) {
  const adminClient = createSupabaseServiceRoleClient();
  if (!adminClient) return null;

  const { data, error } = await adminClient
    .from("auth_login_attempts")
    .select("locked_until")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.error(error);
    return null;
  }

  const lockedUntil = data?.locked_until ? new Date(data.locked_until) : null;
  if (!lockedUntil || lockedUntil.getTime() <= Date.now()) return null;

  return lockedUntil;
}

async function recordFailedLogin(email: string) {
  const adminClient = createSupabaseServiceRoleClient();
  if (!adminClient) {
    return { message: "Invalid email or password." };
  }

  const { data } = await adminClient
    .from("auth_login_attempts")
    .select("failed_count, locked_until")
    .eq("email", email)
    .maybeSingle();

  const existingLock = data?.locked_until ? new Date(data.locked_until) : null;
  const isExpiredLock = existingLock ? existingLock.getTime() <= Date.now() : false;
  const currentFailedCount = isExpiredLock ? 0 : data?.failed_count ?? 0;
  const failedCount = currentFailedCount + 1;
  const shouldLock = failedCount >= maxFailedLoginAttempts;
  const lockedUntil = shouldLock
    ? new Date(Date.now() + loginLockoutMinutes * 60 * 1000)
    : null;

  const { error } = await adminClient
    .from("auth_login_attempts")
    .upsert({
      email,
      failed_count: failedCount,
      locked_until: lockedUntil?.toISOString() ?? null,
      last_failed_at: new Date().toISOString()
    });

  if (error) {
    console.error(error);
    return { message: "Invalid email or password." };
  }

  if (lockedUntil) {
    return { message: formatLockoutMessage(lockedUntil) };
  }

  const attemptsRemaining = Math.max(0, maxFailedLoginAttempts - failedCount);
  return {
    message: `Invalid email or password. ${attemptsRemaining} ${attemptsRemaining === 1 ? "attempt" : "attempts"} remaining before a temporary lock.`
  };
}

async function clearFailedLogins(email: string) {
  const adminClient = createSupabaseServiceRoleClient();
  if (!adminClient) return;

  const { error } = await adminClient
    .from("auth_login_attempts")
    .upsert({
      email,
      failed_count: 0,
      locked_until: null,
      last_success_at: new Date().toISOString()
    });

  if (error) console.error(error);
}

function formatLockoutMessage(lockedUntil: Date) {
  const minutes = Math.max(1, Math.ceil((lockedUntil.getTime() - Date.now()) / 60000));
  return `Too many failed sign-in attempts. Try again in about ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`;
}

export async function updateOwnProfile(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("You must be signed in.");

  const adminClient = createSupabaseServiceRoleClient();
  if (!adminClient) throw new Error("Service role key is not configured");

  const displayName = requiredString(formData, "display_name");
  const email = requiredString(formData, "email").toLowerCase();
  const phone = optionalString(formData, "phone");
  const preferredAppLanguage = optionalString(formData, "preferred_app_language");
  const homeArea = optionalString(formData, "home_area");
  const notes = optionalString(formData, "notes");

  const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(authData.user.id, {
    email,
    user_metadata: {
      display_name: displayName,
      phone,
      preferred_app_language: preferredAppLanguage
    }
  });
  if (authUpdateError) throw new Error(authUpdateError.message);

  const { error: profileError } = await adminClient
    .from("profiles")
    .update({
      display_name: displayName,
      email,
      phone,
      preferred_app_language: preferredAppLanguage,
      home_area: homeArea,
      notes
    })
    .eq("id", authData.user.id);
  if (profileError) throw new Error(profileError.message);

  revalidatePath("/profile");
  revalidatePath("/users");
  redirect("/profile?updated=profile");
}

export async function updateOwnPassword(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("You must be signed in.");

  const password = requiredString(formData, "password");
  const passwordConfirmation = requiredString(formData, "password_confirmation");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");
  if (password !== passwordConfirmation) throw new Error("Passwords do not match.");

  const adminClient = createSupabaseServiceRoleClient();
  if (!adminClient) throw new Error("Service role key is not configured");

  const { error } = await adminClient.auth.admin.updateUserById(authData.user.id, {
    password
  });
  if (error) throw new Error(error.message);

  redirect("/profile?updated=password");
}

export async function updateAdminUserProfile(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is not configured");
  const actor = await requireAdminProfile(supabase);

  const adminClient = createSupabaseServiceRoleClient();
  if (!adminClient) throw new Error("Service role key is not configured");

  const userId = requiredString(formData, "user_id");
  const displayName = requiredString(formData, "display_name");
  const email = requiredString(formData, "email").toLowerCase();
  const phone = optionalString(formData, "phone");
  const preferredAppLanguage = optionalString(formData, "preferred_app_language");
  const homeArea = optionalString(formData, "home_area");
  const notes = optionalString(formData, "notes");
  const role = requiredRole(formData, "role");
  const isActive = formData.get("is_active") === "on";

  if (actor.id === userId && (role !== "admin" || !isActive)) {
    throw new Error("You cannot demote or deactivate your own admin account.");
  }

  const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(userId, {
    email,
    user_metadata: {
      display_name: displayName,
      phone,
      preferred_app_language: preferredAppLanguage
    }
  });
  if (authUpdateError) throw new Error(authUpdateError.message);

  const { error: profileError } = await adminClient
    .from("profiles")
    .update({
      display_name: displayName,
      email,
      phone,
      preferred_app_language: preferredAppLanguage,
      home_area: homeArea,
      notes,
      role,
      is_active: isActive
    })
    .eq("id", userId);
  if (profileError) throw new Error(profileError.message);

  revalidatePath("/users");
  revalidatePath(`/users/${userId}`);
  if (actor.id === userId) revalidatePath("/profile");
  redirect(`/users/${userId}?updated=profile`);
}

export async function updateAdminUserPassword(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is not configured");
  await requireAdminProfile(supabase);

  const adminClient = createSupabaseServiceRoleClient();
  if (!adminClient) throw new Error("Service role key is not configured");

  const userId = requiredString(formData, "user_id");
  const password = requiredString(formData, "password");
  const passwordConfirmation = requiredString(formData, "password_confirmation");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");
  if (password !== passwordConfirmation) throw new Error("Passwords do not match.");

  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    password
  });
  if (error) throw new Error(error.message);

  redirect(`/users/${userId}?updated=password`);
}

export async function createSchool(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/schools/new?error=config");
  const actor = await requireActiveProfile(supabase);

  const schoolNumber = optionalString(formData, "school_number");
  const latitude = Number(requiredString(formData, "latitude"));
  const longitude = Number(requiredString(formData, "longitude"));
  const nameEnglish = requiredString(formData, "name_english");
  const schoolPayload = {
    school_number: schoolNumber,
    name: nameEnglish,
    name_english: nameEnglish,
    name_bangla: optionalString(formData, "name_bangla"),
    address: optionalString(formData, "address"),
    district: optionalString(formData, "district"),
    donor_id: optionalString(formData, "donor_id"),
    latitude,
    longitude,
    map_pin_source: optionalString(formData, "map_pin_source") ?? "manual",
    pipeline_stage: "identified"
  };

  if (actor.role === "volunteer") {
    const { error } = await supabase.from("change_requests").insert({
      request_type: "new_school",
      status: "pending_review",
      submitted_by: actor.id,
      submitted_at: new Date().toISOString(),
      proposed_data: {
        school: schoolPayload
      },
      client_mutation_id: `web-${crypto.randomUUID()}`,
      client_created_at: new Date().toISOString()
    });

    if (error) throw new Error(error.message);
    revalidatePath("/schools");
    revalidatePath("/approvals");
    redirect("/schools?submitted=new_school");
  }

  let generatedNumber = schoolNumber;
  if (!generatedNumber) {
    const { data, error } = await supabase.rpc("generate_school_number");
    if (error) throw new Error(error.message);
    generatedNumber = data as string;
  }

  const { data, error } = await supabase
    .from("schools")
    .insert({
      school_number: generatedNumber,
      name: nameEnglish,
      name_english: nameEnglish,
      name_bangla: optionalString(formData, "name_bangla"),
      address: optionalString(formData, "address"),
      district: optionalString(formData, "district"),
      donor_id: optionalString(formData, "donor_id"),
      latitude,
      longitude,
      map_pin_source: optionalString(formData, "map_pin_source") ?? "manual",
      map_pin_confirmed_at: new Date().toISOString(),
      map_pin_confirmed_by: actor.id,
      pipeline_stage: "identified",
      selection_outcome: "pending",
      created_source: "manager",
      created_by: actor.id,
      updated_by: actor.id
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  await supabase.from("audit_events").insert({
    actor_id: actor.id,
    event_type: "school_created",
    entity_type: "school",
    entity_id: data.id,
    school_id: data.id,
    after_data: {
      school_number: generatedNumber,
      name: nameEnglish,
      name_english: nameEnglish,
      name_bangla: optionalString(formData, "name_bangla"),
      address: optionalString(formData, "address"),
      district: optionalString(formData, "district"),
      donor_id: optionalString(formData, "donor_id"),
      latitude,
      longitude
    },
    metadata: { source: "manager_dashboard" }
  });
  revalidatePath("/schools");
  redirect(`/schools/${data.id}`);
}

export async function updateSchool(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is not configured");
  const actor = await requireActiveProfile(supabase);

  const id = requiredString(formData, "id");
  const latitudeValue = optionalString(formData, "latitude");
  const longitudeValue = optionalString(formData, "longitude");
  const hasConfirmedPin = Boolean(latitudeValue && longitudeValue);
  const nameEnglish = requiredString(formData, "name_english");
  const schoolStatus = requiredString(formData, "pipeline_stage");
  const schoolPatch = {
    school_number: requiredString(formData, "school_number"),
    name: nameEnglish,
    name_english: nameEnglish,
    name_bangla: optionalString(formData, "name_bangla"),
    address: optionalString(formData, "address"),
    district: optionalString(formData, "district"),
    donor_id: optionalString(formData, "donor_id"),
    latitude: latitudeValue ? Number(latitudeValue) : null,
    longitude: longitudeValue ? Number(longitudeValue) : null,
    needs_map_pin_cleanup: !hasConfirmedPin,
    map_pin_source: hasConfirmedPin ? optionalString(formData, "map_pin_source") ?? "manual" : null,
    pipeline_stage: schoolStatus,
    selection_outcome: legacySelectionOutcomeForStatus(schoolStatus)
  };

  const { data: beforeData } = await supabase
    .from("schools")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (actor.role === "volunteer") {
    const contacts = readContactPatches(formData);
    const { error } = await supabase.from("change_requests").insert({
      request_type: "school_edit",
      status: "pending_review",
      school_id: id,
      submitted_by: actor.id,
      submitted_at: new Date().toISOString(),
      base_version: typeof beforeData?.version === "number" ? beforeData.version : null,
      proposed_data: {
        school: schoolPatch,
        contacts
      },
      before_data: beforeData ?? null,
      conflict_detected: false,
      client_mutation_id: `web-${crypto.randomUUID()}`,
      client_created_at: new Date().toISOString()
    });

    if (error) throw new Error(error.message);
    revalidatePath("/schools");
    revalidatePath(`/schools/${id}`);
    revalidatePath("/approvals");
    redirect(`/schools/${id}?submitted=edit`);
  }

  const { data: afterData, error } = await supabase
    .from("schools")
    .update({
      ...schoolPatch,
      map_pin_confirmed_at: hasConfirmedPin ? new Date().toISOString() : null,
      map_pin_confirmed_by: hasConfirmedPin ? actor.id : null,
      updated_by: actor.id
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  await updateSchoolContacts(supabase, formData, id, actor.id);
  await updateSchoolAssessment(supabase, formData, id, actor.id);

  await supabase.from("audit_events").insert({
    actor_id: actor.id,
    event_type: "school_updated",
    entity_type: "school",
    entity_id: id,
    school_id: id,
    before_data: beforeData ?? null,
    after_data: afterData ?? null,
    metadata: { source: "manager_dashboard" }
  });

  revalidatePath("/schools");
  revalidatePath(`/schools/${id}`);
  redirect(`/schools/${id}`);
}

async function updateSchoolAssessment(
  supabase: SupabaseServerClient,
  formData: FormData,
  schoolId: string,
  actorId: string
) {
  const assessmentPayload = readAssessmentPayload(formData);

  const { data: existingAssessment, error: existingError } = await supabase
    .from("school_assessments")
    .select("id")
    .eq("school_id", schoolId)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (!assessmentPayload.hasAnyValue && !existingAssessment) return null;

  const rawFormData = {
    ...assessmentPayload.assessment,
    grade_counts: assessmentPayload.gradeCounts
  };

  const assessmentPatch = {
    ...assessmentPayload.assessment,
    raw_form_data: rawFormData,
    updated_by: actorId,
    deleted_at: null
  };

  const assessmentResult = existingAssessment
    ? await supabase
      .from("school_assessments")
      .update(assessmentPatch)
      .eq("id", existingAssessment.id)
      .select("id")
      .single()
    : await supabase
      .from("school_assessments")
      .insert({
        school_id: schoolId,
        form_version: "school_selection_checklist_v1",
        prepared_by_user_id: actorId,
        created_by: actorId,
        ...assessmentPatch
      })
      .select("id")
      .single();

  if (assessmentResult.error) throw new Error(assessmentResult.error.message);

  const gradeRows = assessmentPayload.gradeCounts.map((grade) => ({
    assessment_id: assessmentResult.data.id,
    grade_label: grade.grade_label,
    student_count: grade.student_count
  }));

  const { error: gradeError } = await supabase
    .from("assessment_grade_counts")
    .upsert(gradeRows, { onConflict: "assessment_id,grade_label" });

  if (gradeError) throw new Error(gradeError.message);

  await supabase.from("audit_events").insert({
    actor_id: actorId,
    event_type: "school_assessment_updated",
    entity_type: "school_assessment",
    entity_id: assessmentResult.data.id,
    school_id: schoolId,
    after_data: rawFormData,
    metadata: { source: "manager_dashboard" }
  });

  return assessmentResult.data;
}

async function updateSchoolContacts(
  supabase: SupabaseServerClient,
  formData: FormData,
  schoolId: string,
  actorId: string
) {
  for (const role of contactRoles) {
    const contact = readContact(formData, role);
    await updateSchoolContact(supabase, schoolId, role, contact, actorId);
  }
}

function readContact(formData: FormData, role: (typeof contactRoles)[number]) {
  const name = optionalString(formData, `${role}_name`);
  const phone = optionalString(formData, `${role}_phone`);
  const email = optionalString(formData, `${role}_email`);
  const title = optionalString(formData, `${role}_title`);
  const hasAnyValue = Boolean(name || phone || email || title);

  if (!hasAnyValue) return null;
  if (!name) throw new Error(`${role}_name is required when contact details are provided`);

  return { name, phone, email, title };
}

function readContactPatches(formData: FormData) {
  return contactRoles.flatMap((role) => {
    const contact = readContact(formData, role);
    if (!contact) return [];

    return [{
      role,
      ...contact,
      is_primary: true
    }];
  });
}

async function updateSchoolContact(
  supabase: SupabaseServerClient,
  schoolId: string,
  role: (typeof contactRoles)[number],
  contact: { name: string; phone: string | null; email: string | null; title: string | null } | null,
  actorId: string
) {
  const { data: existingContacts, error: existingError } = await supabase
    .from("school_contacts")
    .select("id")
    .eq("school_id", schoolId)
    .eq("role", role)
    .is("deleted_at", null)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (existingError) throw new Error(existingError.message);

  const [primaryContact, ...duplicateContacts] = existingContacts ?? [];
  const now = new Date().toISOString();

  if (!contact) {
    if (existingContacts && existingContacts.length > 0) {
      const { error } = await supabase
        .from("school_contacts")
        .update({ deleted_at: now, updated_by: actorId })
        .in("id", existingContacts.map((item) => item.id));
      if (error) throw new Error(error.message);
    }
    return;
  }

  if (primaryContact) {
    const { error } = await supabase
      .from("school_contacts")
      .update({
        ...contact,
        is_primary: true,
        deleted_at: null,
        updated_by: actorId
      })
      .eq("id", primaryContact.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("school_contacts")
      .insert({
        school_id: schoolId,
        role,
        ...contact,
        is_primary: true,
        created_by: actorId,
        updated_by: actorId
      });
    if (error) throw new Error(error.message);
  }

  if (duplicateContacts.length > 0) {
    const { error } = await supabase
      .from("school_contacts")
      .update({ deleted_at: now, updated_by: actorId })
      .in("id", duplicateContacts.map((item) => item.id));
    if (error) throw new Error(error.message);
  }
}

async function updateSchoolContactsFromPayload(
  supabase: SupabaseServerClient,
  schoolId: string,
  contacts: unknown,
  actorId: string
) {
  if (!Array.isArray(contacts)) return;

  for (const item of contacts) {
    if (!item || typeof item !== "object") continue;
    const contact = item as Record<string, unknown>;
    const role = contact.role;
    if (!contactRoles.includes(role as (typeof contactRoles)[number])) continue;

    const name = typeof contact.name === "string" && contact.name.trim() ? contact.name.trim() : null;
    if (!name) continue;

    await updateSchoolContact(
      supabase,
      schoolId,
      role as (typeof contactRoles)[number],
      {
        name,
        phone: typeof contact.phone === "string" && contact.phone.trim() ? contact.phone.trim() : null,
        email: typeof contact.email === "string" && contact.email.trim() ? contact.email.trim() : null,
        title: typeof contact.title === "string" && contact.title.trim() ? contact.title.trim() : null
      },
      actorId
    );
  }
}

export async function createUser(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is not configured");
  const actor = await requireManagerProfile(supabase);

  const adminClient = createSupabaseServiceRoleClient();
  if (!adminClient) throw new Error("Service role key is not configured");

  const email = requiredString(formData, "email");
  const password = requiredString(formData, "password");
  const displayName = requiredString(formData, "display_name");
  const role = requiredRole(formData, "role");
  const phone = optionalString(formData, "phone");
  assertCanAssignRole(actor.role as UserRole, role);

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName }
  });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Could not create user");

  const { error: profileError } = await adminClient.from("profiles").upsert({
    id: data.user.id,
    display_name: displayName,
    email,
    phone,
    role,
    is_active: true
  });
  if (profileError) throw new Error(profileError.message);

  revalidatePath("/users");
}

export async function updateUserProfile(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is not configured");
  const actor = await requireManagerProfile(supabase);

  const userId = requiredString(formData, "user_id");
  const target = await getTargetProfile(supabase, userId);
  assertCanManageTarget(actor as { id: string; role: UserRole }, target);

  const role = requiredRole(formData, "role");
  assertCanAssignRole(actor.role as UserRole, role);

  const isActive = formData.get("is_active") === "on";
  if (actor.role === "admin" && userId === actor.id && (role !== "admin" || !isActive)) {
    throw new Error("You cannot demote or deactivate your own admin account.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: requiredString(formData, "display_name"),
      phone: optionalString(formData, "phone"),
      role,
      is_active: isActive
    })
    .eq("id", userId);

  if (error) throw new Error(error.message);
  revalidatePath("/users");
}

export async function deactivateUser(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is not configured");
  const actor = await requireManagerProfile(supabase);
  const userId = requiredString(formData, "user_id");
  const target = await getTargetProfile(supabase, userId);
  assertCanManageTarget(actor as { id: string; role: UserRole }, target);

  const { error } = await supabase.from("profiles").update({ is_active: false }).eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/users");
}

export async function reactivateUser(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is not configured");
  const actor = await requireManagerProfile(supabase);

  const userId = requiredString(formData, "user_id");
  const target = await getTargetProfile(supabase, userId);
  assertCanManageTarget(actor as { id: string; role: UserRole }, target);

  const { error } = await supabase.from("profiles").update({ is_active: true }).eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/users");
}

export async function deleteUser(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is not configured");
  const actor = await requireManagerProfile(supabase);
  const adminClient = createSupabaseServiceRoleClient();
  if (!adminClient) throw new Error("Service role key is not configured");

  const userId = requiredString(formData, "user_id");
  const target = await getTargetProfile(supabase, userId);
  assertCanManageTarget(actor as { id: string; role: UserRole }, target);

  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
  revalidatePath("/users");
}

export async function reviewChangeRequest(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is not configured");
  const actor = await requireManagerProfile(supabase);

  const id = requiredString(formData, "id");
  const requestedStatus = requiredString(formData, "status");
  const reviewNotes = optionalString(formData, "review_notes");
  const requestedPipelineStage = optionalString(formData, "pipeline_stage");

  const { data: requestRow, error: requestError } = await supabase
    .from("change_requests")
    .select("request_type, school_id")
    .eq("id", id)
    .maybeSingle();

  if (requestError) throw new Error(requestError.message);
  if (!requestRow) throw new Error("Change request not found.");

  let status = requestedStatus;
  let pipelineStage: string | null = null;

  if (requestRow.request_type === "assessment_submission") {
    if (!["selected", "not_selected"].includes(requestedPipelineStage ?? "")) {
      throw new Error("Initial assessment decision must be selected or not selected.");
    }
    status = "approved";
    pipelineStage = requestedPipelineStage;
  } else {
    if (!["approved", "rejected"].includes(requestedStatus)) {
      throw new Error("Decision must be approve or deny.");
    }
    if (requestedStatus === "rejected" && !reviewNotes) {
      throw new Error("Feedback is required when denying changes.");
    }
  }

  const decision: Record<string, unknown> = {
    status,
    review_notes: reviewNotes
  };
  if (pipelineStage) {
    decision.pipeline_stage = pipelineStage;
    decision.selection_outcome = legacySelectionOutcomeForStatus(pipelineStage);
  }

  const { data: reviewedRequest, error } = await supabase.rpc("manager_review_change_request", {
    change_request_id: id,
    decision
  });

  if (error) throw new Error(error.message);
  if (
    reviewedRequest?.request_type === "assessment_submission" &&
    reviewedRequest.school_id &&
    pipelineStage
  ) {
    const { error: statusError } = await supabase
      .from("schools")
      .update({
        pipeline_stage: pipelineStage,
        selection_outcome: legacySelectionOutcomeForStatus(pipelineStage),
        updated_by: actor.id
      })
      .eq("id", reviewedRequest.school_id);

    if (statusError) throw new Error(statusError.message);
  }
  if (
    ["approved", "partially_approved"].includes(status) &&
    reviewedRequest?.request_type === "school_edit" &&
    reviewedRequest.school_id
  ) {
    const appliedRequestData = asRecord(reviewedRequest.applied_data);
    await updateSchoolContactsFromPayload(
      supabase,
      reviewedRequest.school_id,
      appliedRequestData.contacts,
      actor.id
    );
  }
  revalidatePath("/approvals");
  redirect("/approvals");
}

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {} as Record<string, unknown>;
  return value as Record<string, unknown>;
}
