import { MapPin, Plus } from "lucide-react";
import { createSchool } from "@/app/actions";
import { ConfigWarning } from "@/components/config-warning";
import { MapPinPicker } from "@/components/map-pin-picker";
import { getCurrentUser } from "@/lib/data";

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
          title="School identity"
          description="Use the official school names. The Lily school number is generated after creation."
          className="grid gap-4 md:grid-cols-2"
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

        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
          <button className="inline-flex items-center gap-2 rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800">
            <Plus className="h-4 w-4" />
            {isVolunteer ? "Submit for approval" : "Create school"}
          </button>
        </div>
      </form>
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
  required
}: {
  label: string;
  name: string;
  required?: boolean;
}) {
  return (
    <label>
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="ml-1 text-red-600">*</span> : null}
      </span>
      <input
        name={name}
        required={required}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-700"
      />
    </label>
  );
}
