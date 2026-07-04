import { createSchool } from "@/app/actions";
import { ConfigWarning } from "@/components/config-warning";
import { MapPinPicker } from "@/components/map-pin-picker";
import { getCurrentUser } from "@/lib/data";

export default async function NewSchoolPage() {
  const user = await getCurrentUser();
  const isVolunteer = user?.role === "volunteer";

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-950">New School</h1>
        <p className="text-sm text-slate-500">
          {isVolunteer
            ? "Submit a proposed school for manager approval."
            : "Managers can create official schools directly."}
        </p>
      </div>
      <ConfigWarning />
      <form action={createSchool} className="grid gap-4 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-2">
        <Field label="School number" name="school_number" placeholder="Auto-generated if blank" />
        <Field label="School name in English" name="name_english" required />
        <Field label="School name in Bangla" name="name_bangla" />
        <Field label="Address" name="address" full />
        <Field label="District" name="district" />
        <Field label="Donor ID" name="donor_id" />
        <MapPinPicker required addressInputName="address" />
        <div className="md:col-span-2">
          <button className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800">
            {isVolunteer ? "Submit for approval" : "Create school"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  required,
  placeholder,
  full
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
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
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-700"
      />
    </label>
  );
}
