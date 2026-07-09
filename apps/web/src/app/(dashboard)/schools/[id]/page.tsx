import Link from "next/link";
import { CalendarClock, Edit, ImageIcon, MapPin } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { assessmentGradeCountFields, assessmentSections } from "@/lib/assessment-fields";
import { getSchool, getSchoolPhotos, getSchoolTimeline } from "@/lib/data";
import type { AssessmentField } from "@/lib/assessment-fields";
import type { SchoolDetail, SchoolPhotoPage, SchoolTimelineEvent } from "@/lib/types";

export default async function SchoolDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ photoPage?: string; photoPageSize?: string; submitted?: string }>;
}) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const school = await getSchool(id);

  if (!school) {
    return <div className="rounded-md border border-slate-200 bg-white p-6 text-sm">School not found.</div>;
  }

  const [timeline, photos] = await Promise.all([
    getSchoolTimeline(school),
    getSchoolPhotos(school.id, {
      page: query.photoPage,
      pageSize: query.photoPageSize
    })
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-emerald-700">{school.school_number}</div>
          <h1 className="text-xl font-semibold text-slate-950">{school.name_english ?? school.name}</h1>
          {school.name_bangla ? <p className="text-sm text-slate-700">{school.name_bangla}</p> : null}
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

      <section className="grid gap-3 md:grid-cols-3">
        <Metric label="Status" value={<StatusBadge value={school.pipeline_stage} />} />
        <Metric label="Agreement" value={school.agreement_approved_at ? "Approved" : "Missing"} />
        <Metric label="Pending approvals" value={String(school.pending_approvals_count ?? 0)} />
      </section>

      {query.submitted === "edit" ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          School edit proposal submitted for manager approval.
        </div>
      ) : null}

      {school.needs_map_pin_cleanup || school.latitude === null || school.longitude === null ? (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <MapPin className="h-4 w-4" />
          This school does not have a confirmed map pin yet.
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
                  <div className="text-slate-500">{contact.role.replaceAll("_", " ")} - {contact.phone ?? "No phone"}</div>
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

      <SchoolVisitFindings school={school} />

      <PhotoSection photos={photos} />

      <TimelineSection timeline={timeline} />
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

function Info({
  label,
  value,
  emptyText = "Missing",
  className
}: {
  label: string;
  value: string | null | undefined;
  emptyText?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-slate-900">{value || emptyText}</dd>
    </div>
  );
}

function SchoolVisitFindings({ school }: { school: SchoolDetail }) {
  const assessment = asRecord(school.assessment);
  const gradeCounts = getGradeCounts(school);

  return (
    <section className="grid gap-4 lg:grid-cols-2" aria-label="School visit checklist data">
      {assessmentSections.map((section) => (
        <VisitCard key={section.title} title={section.title}>
          {section.fields.map((field) => (
            <Info
              key={field.key}
              label={field.label}
              value={formatAssessmentValue(assessment[field.key], field)}
              emptyText="No data to show"
              className={field.full ? "sm:col-span-2" : undefined}
            />
          ))}
          {section.title === "Student Population" ? <GradeCountsTable gradeCounts={gradeCounts} /> : null}
        </VisitCard>
      ))}
    </section>
  );
}

function VisitCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="font-semibold text-slate-950">{title}</h2>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function GradeCountsTable({ gradeCounts }: { gradeCounts: Array<{ grade_label: string; student_count: number | null }> }) {
  const gradeCountMap = new Map(gradeCounts.map((grade) => [grade.grade_label, grade.student_count]));

  return (
    <div className="sm:col-span-2">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Students by grade</div>
      <div className="mt-2 overflow-hidden rounded-md border border-slate-200">
        <table className="w-full text-left text-xs">
          <tbody className="divide-y divide-slate-100">
            {assessmentGradeCountFields.map((grade) => (
              <tr key={grade.key}>
                <th className="bg-slate-50 px-2 py-1.5 font-medium text-slate-700">{grade.label}</th>
                <td className="px-2 py-1.5 text-slate-900">
                  {gradeCountMap.get(grade.key) ?? "No data to show"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PhotoSection({ photos }: { photos: SchoolPhotoPage }) {
  const firstRecord = photos.total === 0 ? 0 : (photos.page - 1) * photos.pageSize + 1;
  const lastRecord = Math.min(photos.total, photos.page * photos.pageSize);

  return (
    <section id="photos" className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-slate-500" />
          <h2 className="font-semibold text-slate-950">Photos</h2>
        </div>
        {photos.total > 0 ? (
          <div className="text-sm text-slate-500">
            Showing {firstRecord}-{lastRecord} of {photos.total}
          </div>
        ) : null}
      </div>
      {photos.photos.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No photos yet.</p>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {photos.photos.map((photo) => (
            <figure key={photo.id} className="overflow-hidden rounded-md border border-slate-200 bg-slate-50">
              {photo.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo.image_url}
                  alt={photo.caption ?? photo.photo_type.replaceAll("_", " ")}
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center text-sm text-slate-400">
                  Image unavailable
                </div>
              )}
              <figcaption className="space-y-1 p-3 text-xs text-slate-600">
                <div className="font-medium text-slate-900">{photo.photo_type.replaceAll("_", " ")}</div>
                {photo.caption ? <div>{photo.caption}</div> : null}
                <div>{photo.approval_status.replaceAll("_", " ")}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      {photos.totalPages > 1 ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3 text-sm">
          <span className="text-slate-500">Page {photos.page} of {photos.totalPages}</span>
          <div className="flex items-center gap-2">
            <PhotoPageLink page={photos.page - 1} disabled={photos.page <= 1}>Previous</PhotoPageLink>
            <PhotoPageLink page={photos.page + 1} disabled={photos.page >= photos.totalPages}>Next</PhotoPageLink>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PhotoPageLink({
  page,
  disabled,
  children
}: {
  page: number;
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
      href={`?photoPage=${page}#photos`}
      className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
    >
      {children}
    </Link>
  );
}

function TimelineSection({ timeline }: { timeline: SchoolTimelineEvent[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-slate-500" />
        <h2 className="font-semibold text-slate-950">History</h2>
      </div>
      {timeline.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No history yet.</p>
      ) : (
        <ol className="mt-4 space-y-4">
          {timeline.map((event) => (
            <li key={event.id} className="grid gap-1 border-l-2 border-emerald-200 pl-3 text-sm">
              <div className="font-medium text-slate-950">{event.label}</div>
              <div className="text-slate-500">
                {formatDateTime(event.occurred_at)}
                {event.actor_name ? ` by ${event.actor_name}` : ""}
              </div>
              {event.description ? <div className="text-slate-600">{event.description}</div> : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatDateValue(value: unknown) {
  const date = stringValue(value);
  if (!date) return null;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(date));
}

function formatBoolean(value: unknown) {
  if (typeof value !== "boolean") return null;
  return value ? "Yes" : "No";
}

function formatAssessmentValue(value: unknown, field: AssessmentField) {
  if (field.type === "boolean") return formatBoolean(value);
  if (field.type === "date") return formatDateValue(value);
  if (field.type === "number") return numberValue(value);
  return stringValue(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? value.trim() : null;
  }
  return null;
}

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {} as Record<string, unknown>;
  return value as Record<string, unknown>;
}

function getGradeCounts(school: SchoolDetail) {
  if (school.assessment_grade_counts && school.assessment_grade_counts.length > 0) {
    return school.assessment_grade_counts;
  }

  const assessment = asRecord(school.assessment);
  const rawFormData = asRecord(assessment.raw_form_data);
  const rawGradeCounts = Array.isArray(rawFormData.grade_counts) ? rawFormData.grade_counts : [];

  return rawGradeCounts.flatMap((item) => {
    const grade = asRecord(item);
    const gradeLabel = stringValue(grade.grade_label);
    if (!gradeLabel) return [];
    return [{
      grade_label: gradeLabel,
      student_count: parseNumber(grade.student_count)
    }];
  });
}

function parseNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
