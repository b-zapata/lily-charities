import Link from "next/link";
import { ArrowLeft, MapPin, Save } from "lucide-react";
import { updateSchool } from "@/app/actions";
import { MapPinPicker } from "@/components/map-pin-picker";
import { assessmentGradeCountFields, assessmentSections } from "@/lib/assessment-fields";
import { getCurrentUser, getSchool } from "@/lib/data";
import type { AssessmentField } from "@/lib/assessment-fields";

const pipelineOptions = [
  { value: "identified", label: "Identified" },
  { value: "assessed", label: "Assessed" },
  { value: "selected", label: "Selected" },
  { value: "not_selected", label: "Not selected" },
  { value: "setup_in_progress", label: "Setup in progress" },
  { value: "training", label: "Training" },
  { value: "operational", label: "Operational" }
];

export default async function EditSchoolPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [school, user] = await Promise.all([getSchool(id), getCurrentUser()]);
  if (!school) return <div className="rounded-md border bg-white p-6 text-sm">School not found.</div>;

  const isVolunteer = user?.role === "volunteer";
  const principal = school.contacts?.find((contact) => contact.role === "principal");
  const leadTeacher = school.contacts?.find((contact) => contact.role === "lead_teacher");
  const localLiaison = school.contacts?.find((contact) => contact.role === "local_liaison");
  const hasMapPin = school.latitude !== null && school.longitude !== null;
  const assessment = asRecord(school.assessment);
  const gradeCounts = getGradeCountMap(school.assessment_grade_counts, assessment);

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-950">Edit {school.school_number}</h1>
          <p className="text-sm text-slate-500">
            {isVolunteer
              ? "Your changes will be submitted for manager approval."
              : "Manager edits update the official record directly."}
          </p>
        </div>
        <Link
          href={`/schools/${school.id}`}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      <form action={updateSchool} className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <input type="hidden" name="id" value={school.id} />

        <FormSection
          title="Lifecycle"
          description="Status tracks where this school is in the Lily workflow."
          className="grid gap-4 md:grid-cols-2"
        >
          <SelectField
            label="Status"
            name="pipeline_stage"
            defaultValue={school.pipeline_stage}
            options={pipelineOptions}
          />
        </FormSection>

        <FormSection
          title="School identity"
          description="Keep the Lily school number and official names aligned with the current records."
          className="grid gap-4 md:grid-cols-2"
          borderTop
        >
          <Field label="School number" name="school_number" defaultValue={school.school_number} required />
          <Field
            label="School name in English"
            name="name_english"
            defaultValue={school.name_english ?? school.name}
            required
          />
          <Field label="School name in Bangla" name="name_bangla" defaultValue={school.name_bangla} />
          <Field label="Donor ID" name="donor_id" defaultValue={school.donor_id} />
        </FormSection>

        <FormSection
          title="Location"
          description="Use the address to help place the pin, then adjust the pin manually if needed."
          className="grid gap-4 md:grid-cols-2"
          borderTop
        >
          <Field label="Address" name="address" defaultValue={school.address} full />
          <Field label="District" name="district" defaultValue={school.district} />
          {!hasMapPin ? (
            <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <MapPin className="h-4 w-4" />
              No map pin is saved yet. Drop a pin below to clear this issue.
            </div>
          ) : null}
          <MapPinPicker
            initialLatitude={school.latitude}
            initialLongitude={school.longitude}
            initialAddress={school.address}
            addressInputName="address"
          />
        </FormSection>

        <FormSection
          title="Contacts"
          description="Use one row per school contact. Leave a row blank if that contact is not known yet."
          className="divide-y divide-slate-100"
          borderTop
        >
          <ContactRow title="Principal" prefix="principal" contact={principal} />
          <ContactRow title="Lead teacher" prefix="lead_teacher" contact={leadTeacher} />
          <ContactRow title="Local liaison" prefix="local_liaison" contact={localLiaison} />
        </FormSection>

        {!isVolunteer ? (
          <FormSection
            title="School visit checklist"
            description="Backfill or correct the initial assessment checklist for legacy schools and manager-entered records."
            className="space-y-5"
            borderTop
          >
            {assessmentSections.map((section) => (
              <div key={section.title} className="rounded-md border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-950">{section.title}</h3>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  {section.fields.map((field) => (
                    <AssessmentInput key={field.key} field={field} value={assessment[field.key]} />
                  ))}
                  {section.title === "Student Population" ? (
                    <GradeCountInputs gradeCounts={gradeCounts} />
                  ) : null}
                </div>
              </div>
            ))}
          </FormSection>
        ) : null}

        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
          <button className="inline-flex items-center gap-2 rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800">
            <Save className="h-4 w-4" />
            {isVolunteer ? "Submit for approval" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

function AssessmentInput({ field, value }: { field: AssessmentField; value: unknown }) {
  const name = `assessment_${field.key}`;

  if (field.type === "boolean") {
    return (
      <label className={field.full ? "md:col-span-2" : ""}>
        <span className="text-sm font-medium text-slate-700">{field.label}</span>
        <select
          name={name}
          defaultValue={booleanInputValue(value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-700"
        >
          <option value="">No data to show</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </label>
    );
  }

  if (field.type === "textarea") {
    return (
      <label className={field.full ? "md:col-span-2" : ""}>
        <span className="text-sm font-medium text-slate-700">{field.label}</span>
        <textarea
          name={name}
          defaultValue={stringInputValue(value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-700"
        />
      </label>
    );
  }

  return (
    <label className={field.full ? "md:col-span-2" : ""}>
      <span className="text-sm font-medium text-slate-700">{field.label}</span>
      <input
        name={name}
        type={field.type === "date" || field.type === "number" ? field.type : "text"}
        min={field.type === "number" ? 0 : undefined}
        defaultValue={field.type === "date" ? dateInputValue(value) : stringInputValue(value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-700"
      />
    </label>
  );
}

function GradeCountInputs({ gradeCounts }: { gradeCounts: Map<string, number | null> }) {
  return (
    <div className="md:col-span-2">
      <div className="text-sm font-medium text-slate-700">Students by grade</div>
      <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {assessmentGradeCountFields.map((grade) => (
          <label key={grade.key}>
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{grade.label}</span>
            <input
              name={`assessment_grade_count_${grade.key}`}
              type="number"
              min={0}
              defaultValue={gradeCounts.get(grade.key) ?? ""}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-700"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function FormSection({
  title,
  description,
  className,
  borderTop,
  children
}: {
  title: string;
  description: string;
  className: string;
  borderTop?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`${borderTop ? "border-t border-slate-200" : ""} p-4`}>
      <div className="mb-4 max-w-2xl">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <div className={className}>{children}</div>
    </section>
  );
}

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {} as Record<string, unknown>;
  return value as Record<string, unknown>;
}

function stringInputValue(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function dateInputValue(value: unknown) {
  if (typeof value !== "string") return "";
  return value.slice(0, 10);
}

function booleanInputValue(value: unknown) {
  if (typeof value !== "boolean") return "";
  return value ? "true" : "false";
}

function getGradeCountMap(
  gradeCounts: Array<{ grade_label: string; student_count: number | null }> | undefined,
  assessment: Record<string, unknown>
) {
  const counts = new Map<string, number | null>();

  for (const grade of gradeCounts ?? []) {
    counts.set(grade.grade_label, grade.student_count);
  }

  if (counts.size > 0) return counts;

  const rawFormData = asRecord(assessment.raw_form_data);
  const rawGradeCounts = Array.isArray(rawFormData.grade_counts) ? rawFormData.grade_counts : [];
  for (const item of rawGradeCounts) {
    const grade = asRecord(item);
    const label = typeof grade.grade_label === "string" ? grade.grade_label : null;
    if (!label) continue;
    counts.set(label, parseNumber(grade.student_count));
  }

  return counts;
}

function parseNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function ContactRow({
  title,
  prefix,
  contact
}: {
  title: string;
  prefix: string;
  contact?: {
    name: string;
    phone: string | null;
    email: string | null;
    title: string | null;
  };
}) {
  return (
    <div className="grid gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[8rem_repeat(4,minmax(0,1fr))] md:items-start">
      <div className="pt-1 text-sm font-semibold text-slate-900">{title}</div>
      <Field label="Name" name={`${prefix}_name`} defaultValue={contact?.name} />
      <Field label="Phone" name={`${prefix}_phone`} defaultValue={contact?.phone} />
      <Field label="Email" name={`${prefix}_email`} defaultValue={contact?.email} />
      <Field label="Title" name={`${prefix}_title`} defaultValue={contact?.title} />
    </div>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-700"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
  full
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  full?: boolean;
}) {
  return (
    <label className={full ? "md:col-span-2" : ""}>
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="ml-1 text-red-600">*</span> : null}
      </span>
      <input
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-700"
      />
    </label>
  );
}
