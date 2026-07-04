"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { deactivateUser, deleteUser, reactivateUser, updateUserProfile } from "@/app/actions";
import { StatusBadge } from "@/components/status-badge";

type UserRow = {
  id: string;
  display_name: string;
  email: string;
  phone: string | null;
  role: "volunteer" | "manager" | "admin";
  is_active: boolean;
};

export function UserTableRows({
  users,
  currentUserId,
  canManageUsers,
  canManageAdmins
}: {
  users: UserRow[];
  currentUserId?: string;
  canManageUsers: boolean;
  canManageAdmins: boolean;
}) {
  const router = useRouter();

  return (
    <tbody className="divide-y divide-slate-100">
      {users.map((user) => {
        const href = `/users/${user.id}`;
        const isCurrentUser = user.id === currentUserId;
        const isAdminUser = user.role === "admin";
        const canEditUser = canManageUsers && !isCurrentUser && (!isAdminUser || canManageAdmins);
        const isClickable = canManageAdmins;

        return (
          <tr
            key={user.id}
            tabIndex={isClickable ? 0 : undefined}
            role={isClickable ? "link" : undefined}
            aria-label={isClickable ? `Open ${user.display_name}` : undefined}
            className={isClickable ? "cursor-pointer hover:bg-slate-50 focus:bg-emerald-50 focus:outline-none" : undefined}
            onClick={isClickable ? (event) => {
              if (isInteractiveTarget(event.target)) return;
              router.push(href);
            } : undefined}
            onKeyDown={isClickable ? (event) => {
              if (isInteractiveTarget(event.target)) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                router.push(href);
              }
            } : undefined}
          >
            <td className="px-3 py-2 font-medium text-slate-900">
              {isClickable ? (
                <Link href={href} className="text-emerald-800 hover:underline" onClick={(event) => event.stopPropagation()}>
                  {user.display_name}
                </Link>
              ) : (
                user.display_name
              )}
            </td>
            <td className="px-3 py-2 text-slate-600">{user.email}</td>
            <td className="px-3 py-2"><StatusBadge value={user.role} /></td>
            <td className="px-3 py-2">{user.is_active ? "Yes" : "No"}</td>
            <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
              {canEditUser ? (
                <form action={updateUserProfile} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="user_id" value={user.id} />
                  <input type="hidden" name="display_name" value={user.display_name} />
                  <input type="hidden" name="phone" value={user.phone ?? ""} />
                  <select name="role" defaultValue={user.role} className="rounded-md border border-slate-300 px-2 py-1 text-xs">
                    <option value="volunteer">Volunteer</option>
                    <option value="manager">Manager</option>
                    {canManageAdmins ? <option value="admin">Admin</option> : null}
                  </select>
                  <label className="inline-flex items-center gap-1 text-xs text-slate-600">
                    <input name="is_active" type="checkbox" defaultChecked={user.is_active} />
                    Active
                  </label>
                  <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50">
                    Save
                  </button>
                </form>
              ) : (
                <span className="text-xs text-slate-400">
                  {isCurrentUser ? "Current user" : isAdminUser ? "Admin protected" : "Manager only"}
                </span>
              )}
            </td>
            <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
              {canEditUser ? (
                <div className="flex flex-wrap gap-2">
                  <form action={user.is_active ? deactivateUser : reactivateUser}>
                    <input type="hidden" name="user_id" value={user.id} />
                    <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50">
                      {user.is_active ? "Deactivate" : "Reactivate"}
                    </button>
                  </form>
                  <form action={deleteUser}>
                    <input type="hidden" name="user_id" value={user.id} />
                    <button className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50">
                      Delete
                    </button>
                  </form>
                </div>
              ) : (
                <span className="text-xs text-slate-400">
                  {isCurrentUser ? "Current user" : isAdminUser ? "Admin protected" : "Manager only"}
                </span>
              )}
            </td>
          </tr>
        );
      })}
    </tbody>
  );
}

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest("a,button,input,select,textarea,label,form"));
}
