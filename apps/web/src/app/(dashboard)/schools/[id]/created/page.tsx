import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckCircle2, School } from "lucide-react";
import { getCurrentUser, getSchool } from "@/lib/data";

export default async function SchoolCreatedPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [school, user] = await Promise.all([getSchool(id), getCurrentUser()]);

  if (!school) {
    return <div className="rounded-md border border-slate-200 bg-white p-6 text-sm">School not found.</div>;
  }
  if (!user || !["manager", "admin"].includes(user.role)) {
    redirect(`/schools/${school.id}`);
  }

  return (
    <div className="max-w-2xl">
      <section className="rounded-md border border-slate-200 bg-white p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-700">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-red-700">{school.school_number}</div>
            <h1 className="text-xl font-semibold text-slate-950">School successfully created.</h1>
            <p className="mt-1 text-sm text-slate-500">
              Do you want to fill out the initial assessment now?
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
          <div className="flex items-center gap-2 font-medium text-slate-900">
            <School className="h-4 w-4 text-slate-500" />
            {school.name_english ?? school.name}
          </div>
          <div className="mt-1 text-slate-500">{school.address ?? "No address"}</div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={`/schools/${school.id}/assessment`}
            className="inline-flex items-center gap-2 rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800"
          >
            Fill out assessment
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={`/schools/${school.id}`}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            View school details
          </Link>
        </div>
      </section>
    </div>
  );
}
