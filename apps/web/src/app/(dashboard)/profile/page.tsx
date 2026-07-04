import { KeyRound, Save } from "lucide-react";
import { updateOwnPassword, updateOwnProfile } from "@/app/actions";
import { ConfigWarning } from "@/components/config-warning";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentUserProfile } from "@/lib/data";

export default async function ProfilePage({
  searchParams
}: {
  searchParams?: Promise<{ updated?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const profile = await getCurrentUserProfile();

  if (!profile) {
    return (
      <div className="max-w-4xl space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-950">Profile</h1>
          <p className="text-sm text-slate-500">Manage your account details.</p>
        </div>
        <ConfigWarning />
        <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Profile details are not available.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-950">Profile</h1>
        <p className="text-sm text-slate-500">Manage your account details and password.</p>
      </div>

      <ConfigWarning />

      {params.updated ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {params.updated === "password" ? "Password updated." : "Profile updated."}
        </div>
      ) : null}

      <section className="rounded-md border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <h2 className="font-semibold text-slate-950">Account details</h2>
          <p className="mt-1 text-sm text-slate-500">These details are attached to your Lily Ops user account.</p>
        </div>
        <form action={updateOwnProfile} className="grid gap-4 p-4 md:grid-cols-2">
          <Field label="Name" name="display_name" defaultValue={profile.display_name} required />
          <Field label="Email" name="email" type="email" defaultValue={profile.email} required />
          <Field label="Phone" name="phone" defaultValue={profile.phone} />
          <label>
            <span className="text-sm font-medium text-slate-700">Preferred app language</span>
            <select
              name="preferred_app_language"
              defaultValue={profile.preferred_app_language ?? ""}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-700"
            >
              <option value="">No preference</option>
              <option value="en">English</option>
              <option value="bn">Bangla</option>
            </select>
          </label>
          <Field label="Home area" name="home_area" defaultValue={profile.home_area} />
          <label className="md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Notes</span>
            <textarea
              name="notes"
              rows={4}
              defaultValue={profile.notes ?? ""}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-700"
            />
          </label>
          <div className="md:col-span-2">
            <button className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800">
              <Save className="h-4 w-4" />
              Save profile
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-md border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <h2 className="font-semibold text-slate-950">Password</h2>
          <p className="mt-1 text-sm text-slate-500">Set a new password for your account.</p>
        </div>
        <form action={updateOwnPassword} className="grid gap-4 p-4 md:grid-cols-2">
          <Field label="New password" name="password" type="password" required />
          <Field label="Confirm password" name="password_confirmation" type="password" required />
          <div className="md:col-span-2">
            <button className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <KeyRound className="h-4 w-4" />
              Update password
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-950">Account status</h2>
        <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2">
          <Info label="Role" value={<StatusBadge value={profile.role} />} />
          <Info label="Active" value={profile.is_active ? "Yes" : "No"} />
          <Info label="Last seen" value={formatDateTime(profile.last_seen_at)} />
          <Info label="Created" value={formatDateTime(profile.created_at)} />
          <Info label="Updated" value={formatDateTime(profile.updated_at)} />
          <Info label="User ID" value={profile.id} />
        </dl>
      </section>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  type?: string;
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
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-700"
      />
    </label>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-slate-900">{value || "Missing"}</dd>
    </div>
  );
}

function formatDateTime(value: string | null) {
  if (!value) return "Missing";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}
