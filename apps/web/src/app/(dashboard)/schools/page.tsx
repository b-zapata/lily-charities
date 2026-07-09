import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { ConfigWarning } from "@/components/config-warning";
import { EmptyState } from "@/components/empty-state";
import { SchoolTableRows } from "@/components/school-table-rows";
import { getSchools } from "@/lib/data";

export default async function SchoolsPage({
  searchParams
}: {
  searchParams?: Promise<{
    q?: string;
    stage?: string;
    cleanup?: string;
    page?: string;
    pageSize?: string;
    submitted?: string;
  }>;
}) {
  const params = (await searchParams) ?? {};
  const { schools, total, page, pageSize, totalPages } = await getSchools(params);
  const firstRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRecord = Math.min(total, page * pageSize);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-950">Schools</h1>
          <p className="text-sm text-slate-500">Official school database and lifecycle status.</p>
        </div>
        <Link
          href="/schools/new"
          className="inline-flex items-center gap-2 rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800"
        >
          <Plus className="h-4 w-4" />
          New School
        </Link>
      </div>

      <ConfigWarning />
      {params.submitted === "new_school" ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          New school proposal submitted for manager approval.
        </div>
      ) : null}

      <form className="grid gap-3 rounded-md border border-slate-200 bg-white p-3 md:grid-cols-[1fr_180px_160px_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            name="q"
            defaultValue={params.q}
            placeholder="Search number, name, contact, address"
            className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-red-700"
          />
        </label>
        <select name="stage" defaultValue={params.stage ?? ""} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="">Any status</option>
          <option value="identified">Identified</option>
          <option value="assessed">Assessed</option>
          <option value="selected">Selected</option>
          <option value="not_selected">Not Selected</option>
          <option value="setup_in_progress">Setup</option>
          <option value="training">Training</option>
          <option value="operational">Operational</option>
        </select>
        <select name="cleanup" defaultValue={params.cleanup ?? ""} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="">Any pin status</option>
          <option value="true">Needs map pin</option>
        </select>
        <input type="hidden" name="pageSize" value={pageSize} />
        <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">
          Filter
        </button>
      </form>

      {schools.length === 0 ? (
        <EmptyState title="No schools found" body="Connect Supabase or adjust filters to view school records." />
      ) : (
        <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-3 py-2 text-sm text-slate-600">
            <span>
              Showing {firstRecord}-{lastRecord} of {total} schools
            </span>
            <form className="flex items-center gap-2">
              <input type="hidden" name="q" value={params.q ?? ""} />
              <input type="hidden" name="stage" value={params.stage ?? ""} />
              <input type="hidden" name="cleanup" value={params.cleanup ?? ""} />
              <label className="text-xs font-medium text-slate-500" htmlFor="pageSize">
                Rows
              </label>
              <select
                id="pageSize"
                name="pageSize"
                defaultValue={pageSize}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs"
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50">
                Apply
              </button>
            </form>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">No.</th>
                <th className="px-3 py-2">School</th>
                <th className="px-3 py-2">Contact</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Issues</th>
              </tr>
            </thead>
            <SchoolTableRows schools={schools} />
          </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-3 py-3 text-sm">
            <span className="text-slate-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <PaginationLink
                href={buildSchoolsHref(params, 1, pageSize)}
                disabled={page <= 1}
              >
                First
              </PaginationLink>
              <PaginationLink
                href={buildSchoolsHref(params, page - 1, pageSize)}
                disabled={page <= 1}
              >
                Previous
              </PaginationLink>
              <PaginationLink
                href={buildSchoolsHref(params, page + 1, pageSize)}
                disabled={page >= totalPages}
              >
                Next
              </PaginationLink>
              <PaginationLink
                href={buildSchoolsHref(params, totalPages, pageSize)}
                disabled={page >= totalPages}
              >
                Last
              </PaginationLink>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function buildSchoolsHref(
  params: {
    q?: string;
    stage?: string;
    cleanup?: string;
    pageSize?: string;
  },
  page: number,
  pageSize: number
) {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set("q", params.q);
  if (params.stage) searchParams.set("stage", params.stage);
  if (params.cleanup) searchParams.set("cleanup", params.cleanup);
  if (page > 1) searchParams.set("page", String(page));
  if (pageSize !== 25) searchParams.set("pageSize", String(pageSize));

  const query = searchParams.toString();
  return query ? `/schools?${query}` : "/schools";
}

function PaginationLink({
  href,
  disabled,
  children
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="rounded-md border border-slate-200 px-3 py-1.5 text-slate-300">
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
    >
      {children}
    </Link>
  );
}
