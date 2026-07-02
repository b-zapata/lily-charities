import Link from "next/link";
import { MapPin, Plus, Search } from "lucide-react";
import { ConfigWarning } from "@/components/config-warning";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { getSchools } from "@/lib/data";

export default async function SchoolsPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string; stage?: string; outcome?: string; cleanup?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const schools = await getSchools(params);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-950">Schools</h1>
          <p className="text-sm text-slate-500">Official school database and lifecycle status.</p>
        </div>
        <Link
          href="/schools/new"
          className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800"
        >
          <Plus className="h-4 w-4" />
          New School
        </Link>
      </div>

      <ConfigWarning />

      <form className="grid gap-3 rounded-md border border-slate-200 bg-white p-3 md:grid-cols-[1fr_160px_160px_160px_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            name="q"
            defaultValue={params.q}
            placeholder="Search number, name, contact, address"
            className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-700"
          />
        </label>
        <select name="stage" defaultValue={params.stage ?? ""} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="">Any stage</option>
          <option value="identified">Identified</option>
          <option value="assessed">Assessed</option>
          <option value="selected">Selected</option>
          <option value="setup_in_progress">Setup</option>
          <option value="training">Training</option>
          <option value="operational">Operational</option>
        </select>
        <select name="outcome" defaultValue={params.outcome ?? ""} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="">Any outcome</option>
          <option value="pending">Pending</option>
          <option value="selected">Selected</option>
          <option value="future_potential">Future Potential</option>
          <option value="not_selected">Not Selected</option>
        </select>
        <select name="cleanup" defaultValue={params.cleanup ?? ""} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="">Any pin status</option>
          <option value="true">Needs map pin</option>
        </select>
        <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">
          Filter
        </button>
      </form>

      {schools.length === 0 ? (
        <EmptyState title="No schools found" body="Connect Supabase or adjust filters to view school records." />
      ) : (
        <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">No.</th>
                <th className="px-3 py-2">School</th>
                <th className="px-3 py-2">Contact</th>
                <th className="px-3 py-2">Stage</th>
                <th className="px-3 py-2">Outcome</th>
                <th className="px-3 py-2">Issues</th>
                <th className="px-3 py-2">Pending</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schools.map((school) => (
                <tr key={school.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">
                    <Link href={`/schools/${school.id}`}>{school.school_number}</Link>
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/schools/${school.id}`} className="font-medium text-slate-900">
                      {school.name}
                    </Link>
                    <div className="max-w-md truncate text-xs text-slate-500">{school.address}</div>
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    <div>{school.principal_name ?? "Missing"}</div>
                    <div className="text-xs text-slate-400">{school.principal_phone}</div>
                  </td>
                  <td className="px-3 py-2"><StatusBadge value={school.pipeline_stage} /></td>
                  <td className="px-3 py-2"><StatusBadge value={school.selection_outcome} /></td>
                  <td className="px-3 py-2">
                    {school.needs_map_pin_cleanup ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                        <MapPin className="h-3 w-3" />
                        Pin cleanup
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">None</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{school.pending_approvals_count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
