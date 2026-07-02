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
        <div className="grid gap-3 md:grid-cols-4">
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option>Schools</option>
            <option>Assessments</option>
            <option>Agreements</option>
            <option>Approval history</option>
          </select>
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option>All stages</option>
            <option>Assessed</option>
            <option>Selected</option>
            <option>Operational</option>
          </select>
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option>All outcomes</option>
            <option>Selected</option>
            <option>Future Potential</option>
            <option>Not Selected</option>
          </select>
          <button className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white">
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-500">
          The backend export view is ready. The download action will be wired once Supabase is connected.
        </p>
      </section>
    </div>
  );
}
