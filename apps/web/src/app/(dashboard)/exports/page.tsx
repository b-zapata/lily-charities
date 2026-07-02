import { Download } from "lucide-react";
import { ConfigWarning } from "@/components/config-warning";

export default function ExportsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-950">Exports</h1>
        <p className="text-sm text-slate-500">CSV/Excel export entry point for manager workflows.</p>
      </div>
      <ConfigWarning />
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <form action="/api/exports/schools" method="get" className="grid gap-3 md:grid-cols-4">
          <select name="type" className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="schools">Schools</option>
          </select>
          <select name="stage" className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">All stages</option>
            <option value="identified">Identified</option>
            <option value="assessed">Assessed</option>
            <option value="selected">Selected</option>
            <option value="setup_in_progress">Setup in progress</option>
            <option value="training">Training</option>
            <option value="operational">Operational</option>
          </select>
          <select name="outcome" className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">All outcomes</option>
            <option value="pending">Pending</option>
            <option value="selected">Selected</option>
            <option value="future_potential">Future Potential</option>
            <option value="not_selected">Not Selected</option>
          </select>
          <button className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white">
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </form>
        <p className="mt-3 text-sm text-slate-500">
          Exports use the manager-only school export view and create an export audit row when Supabase is connected.
        </p>
      </section>
    </div>
  );
}
