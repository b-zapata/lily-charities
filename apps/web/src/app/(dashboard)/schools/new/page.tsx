import { MapPin, Plus, Save } from "lucide-react";
import { createSchool } from "@/app/actions";
import { ConfigWarning } from "@/components/config-warning";
import { MapPinPicker } from "@/components/map-pin-picker";
import { assessmentGradeCountFields, assessmentSections } from "@/lib/assessment-fields";
import { getCurrentUser } from "@/lib/data";
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

export default async function NewSchoolPage() {
  const user = await getCurrentUser();
  const isVolunteer = user?.role === "volunteer";

  return (
    <div className="max-w-5xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-950">New School</h1>
        <p className="text-sm text-slate-500">
          {isVolunteer
            ? "Submit a proposed school for manager approval."
            : "Create an official school record. Lily school number is generated automatically."}
        </p>
      </div>
      <ConfigWarning />

      <form action={createSchool} className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <FormSection
          title="Lifecycle"
          description="New schools usually begin as identified, but managers can choose a later status when needed."
          className="grid gap-4 md:grid-cols-2"
        >
          <SelectField label="Status" name="pipeline_stage" defaultValue="identified" options={pipelineOptions} />
        </FormSection>

        <FormSection
          title="School identity"
          description="Use the official school names. The Lily school number is generated after creation."
          className="grid gap-4 md:grid-cols-2"
          borderTop
        >
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 md:col-span-2">
            <div className="font-medium text-slate-800">School number</div>
            <div>Generated automatically after this school is created.</div>
          </div>
          <Field label="School name in English" name="name_english" required />
          <Field label="School name in Bangla" name="name_bangla" required />
        </FormSection>

        <FormSection
          title="Location"
          description="Address is required. A map pin is helpful, but it can be added later if the exact location is not known yet."
          className="grid gap-4 md:grid-cols-2"
          borderTop
        >
          <AddressField label="Address" name="address" required />
          <Field label="District" name="district" />
          <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            <MapPin className="h-4 w-4 text-amber-700" />
            Schools created without a pin will be flagged as missing a map pin.
          </div>
          <MapPinPicker addressInputName="address" showMapAddressButton={false} />
        </FormSection>

        <FormSection
          title="Contacts"
          description="Principal details are required for school creation. Other contacts can be added now or later."
          className="divide-y divide-slate-100"
          borderTop
        >
          <ContactRow
            title="Principal"
            prefix="principal"
            requiredFields={["name", "phone", "email"]}
          />
          <ContactRow title="Lead teacher" prefix="lead_teacher" />
          <ContactRow title="Local liaison" prefix="local_liaison" />
        </FormSection>

        {!isVolunteer ? (
          <FormSection
            title="School visit checklist"
            description="Optional at school creation. Managers can backfill this now or complete it later from the edit page."
            className="space-y-5"
            borderTop
          >
            {assessmentSections.map((section) => (
              <div key={section.title} className="rounded-md border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-950">{section.title}</h3>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  {section.fields.map((field) => (
                    <AssessmentInput key={field.key} field={field} />
                  ))}
                  {section.title === "Student Population" ? <GradeCountInputs /> : null}
                </div>
              </div>
            ))}
          </FormSection>
        ) : null}

        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
          <button className="inline-flex items-center gap-2 rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800">
            {isVolunteer ? <Plus className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {isVolunteer ? "Submit for approval" : "Create school"}
          </button>
        </div>
      </form>
    </div>
  );
}

function AssessmentInput({ field }: { field: AssessmentField }) {
  const name = `assessment_${field.key}`;

  if (field.type === "boolean") {
    return (
      <label className={field.full ? "md:col-span-2" : ""}>
        <span className="text-sm font-medium text-slate-700">{field.label}</span>
        <select
          name={name}
          defaultValue=""
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
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-700"
      />
    </label>
  );
}

function GradeCountInputs() {
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

function ContactRow({
  title,
  prefix,
  requiredFields = []
}: {
  title: string;
  prefix: string;
  requiredFields?: Array<"name" | "phone" | "email" | "title">;
}) {
  return (
    <div className="grid gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[8rem_repeat(4,minmax(0,1fr))] md:items-start">
      <div className="pt-1 text-sm font-semibold text-slate-900">{title}</div>
      <Field label="Name" name={`${prefix}_name`} required={requiredFields.includes("name")} />
      <Field label="Phone" name={`${prefix}_phone`} type="tel" required={requiredFields.includes("phone")} />
      <Field label="Email" name={`${prefix}_email`} type="email" required={requiredFields.includes("email")} />
      <Field label="Title" name={`${prefix}_title`} required={requiredFields.includes("title")} />
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

function AddressField({
  label,
  name,
  required
}: {
  label: string;
  name: string;
  required?: boolean;
}) {
  return (
    <label className="md:col-span-2">
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="ml-1 text-red-600">*</span> : null}
      </span>
      <div className="mt-1 flex flex-col gap-2 sm:flex-row">
        <input
          name={name}
          required={required}
          className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-700"
        />
        <button
          type="button"
          data-map-address-button={name}
          className="inline-flex items-center justify-center rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Map address
        </button>
      </div>
    </label>
  );
}

function Field({
  label,
  name,
  required,
  type = "text"
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label>
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="ml-1 text-red-600">*</span> : null}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-700"
      />
    </label>
  );
}
