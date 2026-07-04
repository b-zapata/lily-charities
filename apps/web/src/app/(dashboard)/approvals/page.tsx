import Link from "next/link";
import { redirect } from "next/navigation";
import { ConfigWarning } from "@/components/config-warning";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { getApprovalQueue, getCurrentUser } from "@/lib/data";

export default async function ApprovalsPage() {
  const user = await getCurrentUser();
  if (!user || !["manager", "admin"].includes(user.role)) redirect("/schools");

  const approvals = await getApprovalQueue();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-950">Approval Queue</h1>
        <p className="text-sm text-slate-500">Volunteer submissions waiting for manager review.</p>
      </div>
      <ConfigWarning />
      {approvals.length === 0 ? (
        <EmptyState title="No pending approvals" body="Pending volunteer submissions will appear here." />
      ) : (
        <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">School</th>
                <th className="px-3 py-2">Submitted by</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Conflict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {approvals.map((approval) => (
                <tr key={approval.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <Link href={`/approvals/${approval.id}`} className="font-medium text-slate-900">
                      {approval.request_type.replaceAll("_", " ")}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    <div>{approval.school_number ?? "Pending number"}</div>
                    <div className="text-xs text-slate-500">{approval.school_name ?? "New school"}</div>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{approval.submitter_name ?? "Unknown"}</td>
                  <td className="px-3 py-2"><StatusBadge value={approval.status} /></td>
                  <td className="px-3 py-2 text-slate-700">{approval.conflict_detected ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
