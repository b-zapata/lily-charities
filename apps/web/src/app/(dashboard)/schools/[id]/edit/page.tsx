import { updateSchool } from "@/app/actions";
import { getSchool } from "@/lib/data";

export default async function EditSchoolPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const school = await getSchool(id);
  if (!school) return <div className="rounded-md border bg-white p-6 text-sm">School not found.</div>;

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-950">Edit {school.school_number}</h1>
        <p className="text-sm text-slate-500">Manager edits update the official record directly.</p>
      </div>
      <form action={updateSchool} className="grid gap-4 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-2">
        <input type="hidden" name="id" value={school.id} />
        <Field label="School number" name="school_number" defaultValue={school.school_number} required />
        <Field label="School name" name="name" defaultValue={school.name} required />
        <Field label="English name" name="name_english" defaultValue={school.name_english} />
        <Field label="Bangla name" name="name_bangla" defaultValue={school.name_bangla} />
        <Field label="Address" name="address" defaultValue={school.address} full />
        <Field label="District" name="district" defaultValue={school.district} />
        <Field label="Donor ID" name="donor_id" defaultValue={school.donor_id} />
        <Field label="Latitude" name="latitude" defaultValue={school.latitude?.toString()} />
        <Field label="Longitude" name="longitude" defaultValue={school.longitude?.toString()} />
        <label>
          <span className="text-sm font-medium text-slate-700">Pipeline stage</span>
          <select name="pipeline_stage" defaultValue={school.pipeline_stage} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="identified">Identified</option>
            <option value="assessed">Assessed</option>
            <option value="selected">Selected</option>
            <option value="setup_in_progress">Setup in progress</option>
            <option value="training">Training</option>
            <option value="operational">Operational</option>
          </select>
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">Selection outcome</span>
          <select name="selection_outcome" defaultValue={school.selection_outcome} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="pending">Pending</option>
            <option value="selected">Selected</option>
            <option value="future_potential">Future Potential</option>
            <option value="not_selected">Not Selected</option>
          </select>
        </label>
        <label className="flex items-center gap-2 md:col-span-2">
          <input name="needs_map_pin_cleanup" type="checkbox" defaultChecked={school.needs_map_pin_cleanup} />
          <span className="text-sm text-slate-700">Needs map pin cleanup</span>
        </label>
        <div className="md:col-span-2">
          <button className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800">
            Save changes
          </button>
        </div>
      </form>
    </div>
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
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-700"
      />
    </label>
  );
}
