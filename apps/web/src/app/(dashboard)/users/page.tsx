import { ConfigWarning } from "@/components/config-warning";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { getUsers } from "@/lib/data";

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-950">Users</h1>
        <p className="text-sm text-slate-500">Basic manager and volunteer profile administration.</p>
      </div>
      <ConfigWarning />
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-3 py-2 font-medium text-slate-900">{user.display_name}</td>
                  <td className="px-3 py-2 text-slate-600">{user.email}</td>
                  <td className="px-3 py-2"><StatusBadge value={user.role} /></td>
                  <td className="px-3 py-2">{user.is_active ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
