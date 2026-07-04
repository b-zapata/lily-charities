import Link from "next/link";
import { ArrowLeft, KeyRound, Save } from "lucide-react";
import { redirect } from "next/navigation";
import { updateAdminUserPassword, updateAdminUserProfile } from "@/app/actions";
import { ConfigWarning } from "@/components/config-warning";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentUser, getUserProfileById } from "@/lib/data";

export default async function UserProfilePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ updated?: string }>;
}) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const currentUser = await getCurrentUser();

  if (currentUser?.role !== "admin") {
    redirect("/schools");
  }

  const profile = await getUserProfileById(id);
  if (!profile) {
    return (
      <div className="max-w-4xl space-y-4">
        <Header title="User not found" />
        <ConfigWarning />
        <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600">
          No profile exists for this user.
        </div>
      </div>
    );
  }

  const isCurrentAdmin = profile.id === currentUser.id;

  return (
    <div className="max-w-4xl space-y-4">
      <Header title={profile.display_name} subtitle={profile.email} />

      <ConfigWarning />

      {query.updated ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {query.updated === "password" ? "Password updated." : "User profile updated."}
        </div>
      ) : null}

      <section className="rounded-md border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <h2 className="font-semibold text-slate-950">Account details</h2>
          <p className="mt-1 text-sm text-slate-500">Admins can edit profile details, role, and account status.</p>
        </div>
        <form action={updateAdminUserProfile} className="grid gap-4 p-4 md:grid-cols-2">
          <input type="hidden" name="user_id" value={profile.id} />
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
          <label>
            <span className="text-sm font-medium text-slate-700">Role</span>
            <select
              name="role"
              defaultValue={profile.role}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-700"
            >
              <option value="volunteer">Volunteer</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label className="inline-flex items-center gap-2 md:col-span-2">
            <input name="is_active" type="checkbox" defaultChecked={profile.is_active} />
            <span className="text-sm font-medium text-slate-700">Active account</span>
          </label>
          {isCurrentAdmin ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 md:col-span-2">
              Your own admin account must stay active and admin.
            </div>
          ) : null}
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
              Save user
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-md border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <h2 className="font-semibold text-slate-950">Password</h2>
          <p className="mt-1 text-sm text-slate-500">Set a new password for this user.</p>
        </div>
        <form action={updateAdminUserPassword} className="grid gap-4 p-4 md:grid-cols-2">
          <input type="hidden" name="user_id" value={profile.id} />
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

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-slate-950">{title}</h1>
        <p className="text-sm text-slate-500">{subtitle ?? "Admin user profile"}</p>
      </div>
      <Link
        href="/users"
        className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>
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
