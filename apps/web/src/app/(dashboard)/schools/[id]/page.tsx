import Link from "next/link";
import { Edit, MapPin } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { getSchool } from "@/lib/data";

export default async function SchoolDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const school = await getSchool(id);

  if (!school) {
    return <div className="rounded-md border border-slate-200 bg-white p-6 text-sm">School not found.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-emerald-700">{school.school_number}</div>
          <h1 className="text-xl font-semibold text-slate-950">{school.name}</h1>
          <p className="text-sm text-slate-500">{school.address ?? "No address"}</p>
        </div>
        <Link
          href={`/schools/${school.id}/edit`}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
        >
          <Edit className="h-4 w-4" />
          Edit
        </Link>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Stage" value={<StatusBadge value={school.pipeline_stage} />} />
        <Metric label="Outcome" value={<StatusBadge value={school.selection_outcome} />} />
        <Metric label="Agreement" value={school.agreement_approved_at ? "Approved" : "Missing"} />
        <Metric label="Pending approvals" value={String(school.pending_approvals_count ?? 0)} />
      </section>

      {school.needs_map_pin_cleanup ? (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <MapPin className="h-4 w-4" />
          This imported school needs a confirmed map pin.
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-slate-950">Contacts</h2>
          <div className="mt-3 divide-y divide-slate-100">
            {school.contacts && school.contacts.length > 0 ? (
              school.contacts.map((contact) => (
                <div key={contact.id} className="py-2 text-sm">
                  <div className="font-medium text-slate-900">{contact.name}</div>
                  <div className="text-slate-500">{contact.role.replaceAll("_", " ")} · {contact.phone ?? "No phone"}</div>
                  {contact.email ? <div className="text-slate-400">{contact.email}</div> : null}
                </div>
              ))
            ) : (
              <p className="py-2 text-sm text-slate-500">No contacts yet.</p>
            )}
          </div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-slate-950">Location</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <Info label="District" value={school.district} />
            <Info label="Donor ID" value={school.donor_id} />
            <Info label="Latitude" value={school.latitude?.toString()} />
            <Info label="Longitude" value={school.longitude?.toString()} />
          </dl>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-slate-900">{value || "Missing"}</dd>
    </div>
  );
}
