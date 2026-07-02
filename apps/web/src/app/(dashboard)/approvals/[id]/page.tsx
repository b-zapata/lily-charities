import { reviewChangeRequest } from "@/app/actions";
import { StatusBadge } from "@/components/status-badge";
import { getChangeRequest } from "@/lib/data";

export default async function ApprovalDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const request = await getChangeRequest(id);

  if (!request) return <div className="rounded-md border bg-white p-6 text-sm">Request not found.</div>;

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-medium text-emerald-700">{request.request_type.replaceAll("_", " ")}</div>
        <h1 className="text-xl font-semibold text-slate-950">{request.school_name ?? "New school request"}</h1>
        <div className="mt-2 flex gap-2">
          <StatusBadge value={request.status} />
          {request.conflict_detected ? <StatusBadge value="needs_clarification" /> : null}
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Proposed data" value={request.proposed_data} />
        <JsonPanel title="Before data" value={request.before_data} />
      </section>

      <form action={reviewChangeRequest} className="rounded-md border border-slate-200 bg-white p-4">
        <input type="hidden" name="id" value={request.id} />
        <div className="grid gap-4 md:grid-cols-3">
          <label>
            <span className="text-sm font-medium text-slate-700">Decision</span>
            <select name="status" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="approved">Approve</option>
              <option value="partially_approved">Partially approve</option>
              <option value="needs_clarification">Needs clarification</option>
              <option value="rejected">Reject</option>
            </select>
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">Assessment outcome</span>
            <select name="selection_outcome" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="">Default</option>
              <option value="selected">Selected</option>
              <option value="future_potential">Future Potential</option>
              <option value="not_selected">Not Selected</option>
            </select>
          </label>
          <label className="md:col-span-3">
            <span className="text-sm font-medium text-slate-700">Manager note</span>
            <textarea name="review_notes" rows={4} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>
        </div>
        <button className="mt-4 rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800">
          Submit decision
        </button>
      </form>
    </div>
  );
}

function JsonPanel({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="font-semibold text-slate-950">{title}</h2>
      <pre className="mt-3 max-h-96 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">
        {JSON.stringify(value ?? {}, null, 2)}
      </pre>
    </div>
  );
}
