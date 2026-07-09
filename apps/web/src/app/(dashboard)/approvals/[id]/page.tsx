import { redirect } from "next/navigation";
import { ApprovalDecisionForm } from "@/components/approval-decision-form";
import { StatusBadge } from "@/components/status-badge";
import { getChangeRequest, getCurrentUser } from "@/lib/data";
import type { ChangeRequestDetail } from "@/lib/types";

export default async function ApprovalDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !["manager", "admin"].includes(user.role)) redirect("/schools");

  const { id } = await params;
  const request = await getChangeRequest(id);

  if (!request) return <div className="rounded-md border bg-white p-6 text-sm">Request not found.</div>;

  const changes = buildChangeRows(request);
  const decisionHelp = getDecisionHelp(request.request_type);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-medium text-red-700">{formatRequestType(request.request_type)}</div>
        <h1 className="text-xl font-semibold text-slate-950">{request.school_name ?? "New school request"}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          <StatusBadge value={request.status} />
          {request.conflict_detected ? <StatusBadge value="needs_clarification" /> : null}
        </div>
      </div>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-950">Submission summary</h2>
        <dl className="mt-3 grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-4">
          <SummaryItem label="School" value={request.school_name ?? "New school"} />
          <SummaryItem label="School number" value={request.school_number ?? "Pending number"} />
          <SummaryItem label="Submitted by" value={request.submitter_name ?? "Unknown"} />
          <SummaryItem label="Submitted" value={formatDateTime(request.submitted_at)} />
        </dl>
      </section>

      <section className="rounded-md border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <h2 className="font-semibold text-slate-950">Proposed changes</h2>
          <p className="mt-1 text-sm text-slate-500">
            Review the field, current value, and proposed value before making a decision.
          </p>
        </div>
        {changes.length === 0 ? (
          <div className="p-4 text-sm text-slate-500">No changed fields were found in this submission.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Field</th>
                  <th className="px-4 py-3 font-medium">Current</th>
                  <th className="px-4 py-3 font-medium">Proposed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {changes.map((change) => (
                  <tr key={change.key}>
                    <td className="w-1/4 px-4 py-3 font-medium text-slate-900">{change.label}</td>
                    <td className="w-1/3 px-4 py-3 text-slate-600">{change.before}</td>
                    <td className="px-4 py-3 text-slate-900">{change.after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-950">Decision</h2>
        <p className="mt-1 text-sm text-slate-500">{decisionHelp}</p>
        <ApprovalDecisionForm requestId={request.id} requestType={request.request_type} />
      </section>
    </div>
  );
}

type ChangeRow = {
  key: string;
  label: string;
  before: string;
  after: string;
};

const schoolFieldOrder = [
  "school_number",
  "name_english",
  "name_bangla",
  "address",
  "area",
  "city",
  "district",
  "division",
  "donor_id",
  "pipeline_stage",
  "summary_notes"
];

const assessmentFieldOrder = [
  "visit_date",
  "prepared_by_name",
  "located_in_dhaka_district",
  "underprivileged_or_low_income_area",
  "no_existing_library_facilities",
  "secure_space_available_for_library",
  "commitment_from_school_administration",
  "supports_establishing_and_maintaining_library",
  "willing_to_participate_in_ambassador_program",
  "at_least_200_students",
  "diverse_student_demographics",
  "estimated_total_students",
  "environment_conducive_to_learning",
  "positive_attitude_toward_project",
  "potential_challenges_identified",
  "is_good_fit_for_project",
  "geographic_notes",
  "library_space_description",
  "library_space_size",
  "infrastructure_notes",
  "administrative_support_notes",
  "key_demographics",
  "suitability_notes",
  "additional_comments"
];

const fieldLabels: Record<string, string> = {
  school_number: "School number",
  name: "School name",
  name_english: "School name in English",
  name_bangla: "School name in Bangla",
  address: "Address",
  area: "Area",
  city: "City",
  district: "District",
  division: "Division",
  donor_id: "Donor",
  pipeline_stage: "Status",
  summary_notes: "Notes",
  visit_date: "Visit date",
  prepared_by_name: "Prepared by",
  located_in_dhaka_district: "Located in Dhaka district",
  underprivileged_or_low_income_area: "Low-income area",
  no_existing_library_facilities: "No existing library facilities",
  secure_space_available_for_library: "Secure library space available",
  library_space_description: "Library space description",
  library_space_size: "Library space size",
  space_sufficient_for_library_needs: "Space sufficient for library",
  commitment_from_school_administration: "School administration commitment",
  supports_establishing_and_maintaining_library: "Supports maintaining library",
  willing_to_participate_in_ambassador_program: "Willing to participate in ambassador program",
  administrative_support_notes: "Administrative support notes",
  at_least_200_students: "At least 200 students",
  diverse_student_demographics: "Diverse student demographics",
  estimated_total_students: "Estimated total students",
  key_demographics: "Key demographics",
  environment_conducive_to_learning: "Good learning environment",
  positive_attitude_toward_project: "Positive attitude toward project",
  potential_challenges_identified: "Potential challenges identified",
  suitability_notes: "Suitability notes",
  is_good_fit_for_project: "Good fit for project",
  additional_comments: "Additional comments",
  agreement_date: "Agreement date",
  represented_school_name: "School represented in agreement",
  signatory_name: "Signatory name",
  signatory_title: "Signatory title",
  signatory_phone: "Signatory phone",
  agreement_language: "Agreement language",
  accepted_standard_terms: "Accepted standard terms",
  authorized_signatory_confirmed: "Authorized signatory confirmed",
  caption: "Caption",
  photo_type: "Photo type"
};

const ignoredFields = new Set([
  "id",
  "version",
  "created_at",
  "created_by",
  "updated_at",
  "updated_by",
  "deleted_at",
  "source_import_filename",
  "source_import_row_number",
  "legacy_source_payload",
  "created_source",
  "created_from_change_request_id",
  "client_mutation_id",
  "client_created_at",
  "source_device_id",
  "school_id",
  "selection_outcome"
]);

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function buildChangeRows(request: ChangeRequestDetail) {
  const proposed = asRecord(request.proposed_data);
  const before = asRecord(request.before_data);

  if (request.request_type === "new_school") {
    return [
      ...buildSchoolRows(childRecordOrSelf(proposed, "school"), {}, "New school"),
      ...buildContactRows(proposed.contacts, "New school")
    ];
  }

  if (request.request_type === "school_edit") {
    return [
      ...buildSchoolRows(childRecordOrSelf(proposed, "school"), before, "Blank", true),
      ...buildContactRows(proposed.contacts, "Current contact not included in this request")
    ];
  }

  if (request.request_type === "assessment_submission") {
    return buildPlainRows(childRecordOrSelf(proposed, "assessment"), before, assessmentFieldOrder, "No official assessment yet");
  }

  if (request.request_type === "agreement_submission") {
    return buildPlainRows(childRecordOrSelf(proposed, "agreement"), before, undefined, "No approved agreement yet");
  }

  if (request.request_type === "photo_upload") {
    return buildPlainRows(childRecordOrSelf(proposed, "photo"), before, undefined, "No approved photo yet");
  }

  return buildPlainRows(proposed, before, undefined, "Blank");
}

function buildSchoolRows(payload: Record<string, unknown>, before: Record<string, unknown>, emptyBefore: string, changedOnly = false) {
  const rows: ChangeRow[] = [];
  const seen = new Set<string>();

  const beforePin = formatPin(before.latitude, before.longitude);
  const afterPin = formatPin(payload.latitude, payload.longitude);
  if (afterPin !== "Blank" && (!changedOnly || beforePin !== afterPin)) {
    rows.push({
      key: "map_pin",
      label: "Map pin",
      before: beforePin === "Blank" ? emptyBefore : beforePin,
      after: afterPin
    });
  }

  for (const field of schoolFieldOrder) {
    seen.add(field);
    addRow(rows, field, payload[field], before[field], emptyBefore, changedOnly);
  }

  for (const [field, value] of Object.entries(payload)) {
    if (ignoredFields.has(field) || seen.has(field) || field === "name" || field === "latitude" || field === "longitude") continue;
    addRow(rows, field, value, before[field], emptyBefore, changedOnly);
  }

  return rows;
}

function buildPlainRows(
  payload: Record<string, unknown>,
  before: Record<string, unknown>,
  preferredOrder?: string[],
  emptyBefore = "Blank"
) {
  const rows: ChangeRow[] = [];
  const orderedFields = preferredOrder ?? Object.keys(payload);
  const seen = new Set<string>();

  for (const field of orderedFields) {
    seen.add(field);
    addRow(rows, field, payload[field], before[field], emptyBefore, false);
  }

  for (const [field, value] of Object.entries(payload)) {
    if (seen.has(field) || ignoredFields.has(field)) continue;
    addRow(rows, field, value, before[field], emptyBefore, false);
  }

  return rows;
}

function buildContactRows(value: unknown, emptyBefore: string) {
  if (!Array.isArray(value)) return [];

  return value.flatMap((contact, index) => {
    const record = asRecord(contact);
    if (!record.name && !record.phone && !record.email && !record.title) return [];
    const role = typeof record.role === "string" ? record.role : `contact_${index + 1}`;
    return [{
      key: `contact_${index}`,
      label: `${humanize(role)} contact`,
      before: emptyBefore,
      after: formatContact(record)
    }];
  });
}

function addRow(
  rows: ChangeRow[],
  field: string,
  afterValue: unknown,
  beforeValue: unknown,
  emptyBefore: string,
  changedOnly: boolean
) {
  if (ignoredFields.has(field) || isEmptyValue(afterValue)) return;

  const before = formatValue(beforeValue);
  const after = formatValue(afterValue);
  if (changedOnly && before === after) return;

  rows.push({
    key: `${field}-${rows.length}`,
    label: fieldLabels[field] ?? humanize(field),
    before: before === "Blank" ? emptyBefore : before,
    after
  });
}

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {} as Record<string, unknown>;
  return value as Record<string, unknown>;
}

function childRecordOrSelf(record: Record<string, unknown>, key: string) {
  const child = asRecord(record[key]);
  return Object.keys(child).length > 0 ? child : record;
}

function isEmptyValue(value: unknown) {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

function formatValue(value: unknown): string {
  if (isEmptyValue(value)) return "Blank";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return humanizeKnownValue(value);
  if (Array.isArray(value)) return value.length === 1 ? "1 item" : `${value.length} items`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([field, entryValue]) => !ignoredFields.has(field) && !isEmptyValue(entryValue))
      .slice(0, 4)
      .map(([field, entryValue]) => `${fieldLabels[field] ?? humanize(field)}: ${formatValue(entryValue)}`);

    if (entries.length === 0) return "Blank";
    return entries.join("; ");
  }

  return String(value);
}

function formatPin(latitude: unknown, longitude: unknown) {
  if (isEmptyValue(latitude) || isEmptyValue(longitude)) return "Blank";
  return `${formatValue(latitude)}, ${formatValue(longitude)}`;
}

function formatContact(contact: Record<string, unknown>) {
  const parts = [
    formatValue(contact.name),
    isEmptyValue(contact.title) ? null : formatValue(contact.title),
    isEmptyValue(contact.phone) ? null : formatValue(contact.phone),
    isEmptyValue(contact.email) ? null : formatValue(contact.email)
  ].filter(Boolean);

  return parts.join(" - ");
}

function formatDateTime(value: string | null) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatRequestType(value: string) {
  const labels: Record<string, string> = {
    new_school: "New school",
    school_edit: "School edit",
    assessment_submission: "Initial assessment",
    agreement_submission: "Agreement",
    photo_upload: "Photo upload",
    lifecycle_update: "Lifecycle update"
  };

  return labels[value] ?? humanize(value);
}

function getDecisionHelp(requestType: string) {
  if (requestType === "assessment_submission") {
    return "Choose whether this assessed school is selected for the Lily project.";
  }

  if (requestType === "new_school" || requestType === "school_edit") {
    return "Approve the proposed school changes or deny them with feedback.";
  }

  return "Approve or deny this submission.";
}

function humanizeKnownValue(value: string) {
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return formatDateTime(value);
  if (/^[a-z]+(?:_[a-z0-9]+)+$/.test(value)) return humanize(value);
  return value;
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
