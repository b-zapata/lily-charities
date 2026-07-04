import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const columns: Array<[string, string]> = [
  ["school_number", "School Number"],
  ["name_english", "School Name in English"],
  ["name_bangla", "School Name in Bangla"],
  ["address", "Address"],
  ["area", "Area"],
  ["city", "City"],
  ["district", "District"],
  ["division", "Division"],
  ["country", "Country"],
  ["latitude", "Latitude"],
  ["longitude", "Longitude"],
  ["needs_map_pin_cleanup", "Needs Map Pin Cleanup"],
  ["pipeline_stage", "Status"],
  ["donor_id", "Donor ID"],
  ["donor_name", "Donor Name"],
  ["donor_organization", "Donor Organization"],
  ["donor_anonymous", "Donor Anonymous"],
  ["principal_name", "Principal Name"],
  ["principal_phone", "Principal Phone"],
  ["principal_email", "Principal Email"],
  ["lead_teacher_name", "Lead Teacher Name"],
  ["lead_teacher_phone", "Lead Teacher Phone"],
  ["lead_teacher_email", "Lead Teacher Email"],
  ["assessment_visit_date", "Assessment Visit Date"],
  ["is_good_fit_for_project", "Good Fit"],
  ["estimated_total_students", "Estimated Total Students"],
  ["setup_started_date", "Setup Started Date"],
  ["training_completed_date", "Training Completed Date"],
  ["operational_date", "Operational Date"],
  ["updated_at", "Updated At"]
];

function csvValue(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\r\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function csvFromRows(rows: Array<Record<string, unknown>>) {
  const header = columns.map(([, label]) => csvValue(label)).join(",");
  const body = rows.map((row) => columns.map(([key]) => csvValue(row[key])).join(","));
  return [header, ...body].join("\r\n");
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return new Response("Supabase is not configured.", { status: 503 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return Response.redirect(new URL("/login", request.url));
  }
  if (!["manager", "admin"].includes(user.role)) {
    return new Response("Manager role is required.", { status: 403 });
  }

  const url = new URL(request.url);
  const stage = url.searchParams.get("stage")?.trim();
  const cleanup = url.searchParams.get("cleanup")?.trim();

  let query = supabase
    .from("school_export_view")
    .select("*")
    .order("school_number", { ascending: true });

  if (stage) query = query.eq("pipeline_stage", stage);
  if (cleanup === "true") query = query.or("needs_map_pin_cleanup.eq.true,latitude.is.null,longitude.is.null");

  const { data, error } = await query;
  if (error) {
    return new Response(error.message, { status: 500 });
  }

  await supabase.from("export_jobs").insert({
    requested_by: user.id,
    export_type: "schools_csv",
    filters: {
      stage: stage || null,
      cleanup: cleanup || null
    },
    status: "completed",
    completed_at: new Date().toISOString()
  });

  const csv = csvFromRows((data ?? []) as Array<Record<string, unknown>>);
  const timestamp = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lily-schools-${timestamp}.csv"`
    }
  });
}
