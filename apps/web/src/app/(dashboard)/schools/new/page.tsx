import { createSchool } from "@/app/actions";
import { ConfigWarning } from "@/components/config-warning";

export default function NewSchoolPage() {
  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-950">New School</h1>
        <p className="text-sm text-slate-500">Managers can create official schools directly.</p>
      </div>
      <ConfigWarning />
      <form action={createSchool} className="grid gap-4 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-2">
        <Field label="School number" name="school_number" placeholder="Auto-generated if blank" />
        <Field label="School name" name="name" required />
        <Field label="English name" name="name_english" />
        <Field label="Bangla name" name="name_bangla" />
        <Field label="Address" name="address" full />
        <Field label="District" name="district" />
        <Field label="Donor ID" name="donor_id" />
        <Field label="Latitude" name="latitude" required />
        <Field label="Longitude" name="longitude" required />
        <div className="md:col-span-2">
          <button className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800">
            Create school
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
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-700"
      />
    </label>
  );
}
