import { redirect } from "next/navigation";
import { createUser } from "@/app/actions";
import { ConfigWarning } from "@/components/config-warning";
import { EmptyState } from "@/components/empty-state";
import { UserTableRows } from "@/components/user-table-rows";
import { getCurrentUser, getUsers } from "@/lib/data";

export default async function UsersPage() {
  const [currentUser, users] = await Promise.all([getCurrentUser(), getUsers()]);
  if (!currentUser || !["manager", "admin"].includes(currentUser.role)) redirect("/schools");

  const canManageUsers = currentUser?.role === "manager" || currentUser?.role === "admin";
  const canManageAdmins = currentUser?.role === "admin";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-950">Users</h1>
        <p className="text-sm text-slate-500">Managers can manage volunteer and manager accounts. Admin accounts are protected.</p>
      </div>
      <ConfigWarning />
      {canManageUsers ? (
        <form action={createUser} className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-5">
          <Field label="Name" name="display_name" required />
          <Field label="Email" name="email" type="email" required />
          <Field label="Phone" name="phone" />
          <Field label="Temporary password" name="password" type="password" required />
          <label>
            <span className="text-sm font-medium text-slate-700">Role</span>
            <select name="role" defaultValue="volunteer" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="volunteer">Volunteer</option>
              <option value="manager">Manager</option>
              {canManageAdmins ? <option value="admin">Admin</option> : null}
            </select>
          </label>
          <div className="md:col-span-5">
            <button className="rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800">
              Add user
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Manager role is required to add, delete, or change user roles.
        </div>
      )}
      {users.length === 0 ? (
        <EmptyState title="No users loaded" body="Connect Supabase to manage manager and volunteer profiles." />
      ) : (
        <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Active</th>
                <th className="px-3 py-2">Role management</th>
                <th className="px-3 py-2">Account</th>
              </tr>
            </thead>
            <UserTableRows
              users={users}
              currentUserId={currentUser.id}
              canManageUsers={canManageUsers}
              canManageAdmins={canManageAdmins}
            />
          </table>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required
}: {
  label: string;
  name: string;
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
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-700"
      />
    </label>
  );
}
