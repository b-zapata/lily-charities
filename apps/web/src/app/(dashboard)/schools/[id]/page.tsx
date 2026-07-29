import Image from "next/image";
import Link from "next/link";
import { CalendarClock, ClipboardCheck, Edit, ExternalLink, ImageIcon, MapPin } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { assessmentGradeCountFields, assessmentSections } from "@/lib/assessment-fields";
import { requiredAssessmentPhotos } from "@/lib/assessment-photos";
import { getCurrentUser, getSchool, getSchoolPhotos, getSchoolTimeline } from "@/lib/data";
import {
  canSubmitInitialAssessment,
  initialAssessmentStageMessage
} from "@/lib/initial-assessment";
import type { AssessmentField } from "@/lib/assessment-fields";
import type { SchoolDetail, SchoolPhoto, SchoolPhotoPage, SchoolTimelineEvent } from "@/lib/types";

const schoolTabs = [
  { id: "overview", label: "Overview" },
  { id: "history", label: "History" },
  { id: "photos", label: "Photos" }
] as const;

type SchoolTab = (typeof schoolTabs)[number]["id"];

const assessmentPhotoDetails = new Map<string, { label: string; description: string }>(
  requiredAssessmentPhotos.map((photo) => [
    photo.photoType,
    { label: photo.label, description: photo.description }
  ])
);

const assessmentPhotoOrder = new Map<string, number>(
  requiredAssessmentPhotos.map((photo, index) => [photo.photoType, index])
);

export default async function SchoolDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    tab?: string;
    photoPage?: string;
    photoPageSize?: string;
    assessment?: string;
    submitted?: string;
  }>;
}) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const activeTab = getSchoolTab(query.tab);
  const [school, user] = await Promise.all([getSchool(id), getCurrentUser()]);

  if (!school) {
    return <div className="rounded-md border border-slate-200 bg-white p-6 text-sm">School not found.</div>;
  }

  const canManage = Boolean(user && ["manager", "admin"].includes(user.role));
  const canSubmitAssessment = canManage && canSubmitInitialAssessment(school.pipeline_stage);
  const timeline = activeTab === "history" ? await getSchoolTimeline(school) : [];
  const photos = activeTab === "photos"
    ? await getSchoolPhotos(school.id, {
      page: query.photoPage,
      pageSize: query.photoPageSize
    })
    : emptyPhotoPage();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-red-700">{school.school_number}</div>
          <h1 className="text-xl font-semibold text-slate-950">{school.name_english ?? school.name}</h1>
          {school.name_bangla ? <p className="text-sm text-slate-700">{school.name_bangla}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {canSubmitAssessment ? (
            <Link
              href={`/schools/${school.id}/assessment`}
              className="inline-flex items-center gap-2 rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800"
            >
              <ClipboardCheck className="h-4 w-4" />
              Initial assessment
            </Link>
          ) : canManage ? (
            <button
              type="button"
              disabled
              title={initialAssessmentStageMessage}
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-md bg-slate-200 px-3 py-2 text-sm font-medium text-slate-500"
            >
              <ClipboardCheck className="h-4 w-4" />
              Initial assessment
            </button>
          ) : null}
          <Link
            href={`/schools/${school.id}/edit`}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Link>
        </div>
      </div>

      {query.submitted === "edit" ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          School edit proposal submitted for manager approval.
        </div>
      ) : null}

      {query.submitted === "assessment" ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          Initial assessment saved.
        </div>
      ) : null}

      {query.assessment === "unavailable" ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {initialAssessmentStageMessage}
        </div>
      ) : null}

      <nav aria-label="School details" className="border-b border-slate-200">
        <div className="flex gap-6 overflow-x-auto">
          {schoolTabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <Link
                key={tab.id}
                id={`${tab.id}-tab`}
                href={`/schools/${school.id}?tab=${tab.id}`}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "border-b-2 px-1 py-3 text-sm font-medium",
                  isActive
                    ? "border-red-700 text-red-700"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900"
                ].join(" ")}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div
        id={`${activeTab}-panel`}
        aria-labelledby={`${activeTab}-tab`}
        role="region"
        className="pt-1"
      >
        {activeTab === "overview" ? <OverviewTab school={school} /> : null}
        {activeTab === "history" ? <TimelineSection timeline={timeline} /> : null}
        {activeTab === "photos" ? <PhotoSection photos={photos} schoolId={school.id} /> : null}
      </div>
    </div>
  );
}

function OverviewTab({ school }: { school: SchoolDetail }) {
  return (
    <section className="space-y-4" aria-label="School overview">
      <div className="grid gap-4 lg:grid-cols-2">
        <StatusSummary school={school} />
        <AgreementSummary school={school} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ContactsSummary school={school} />
        <LocationSummary school={school} />
      </div>

      <SchoolVisitFindings school={school} />
    </section>
  );
}

function StatusSummary({ school }: { school: SchoolDetail }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="font-semibold text-slate-950">Status</h2>
      <div className="mt-3">
        <StatusBadge value={school.pipeline_stage} />
      </div>
      <dl className="mt-4 border-t border-slate-100 pt-3 text-sm">
        <Info
          label="Library ID"
          value={school.library_id}
          emptyText="Assigned when the school becomes operational"
        />
      </dl>
      {school.pending_approvals_count > 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          {school.pending_approvals_count} pending approval{school.pending_approvals_count === 1 ? "" : "s"}
        </p>
      ) : null}
    </section>
  );
}

function AgreementSummary({ school }: { school: SchoolDetail }) {
  const agreement = school.agreement;

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-slate-950">School Agreement</h2>
        <StatusBadge value={agreement?.approved_at ? "approved" : agreement ? "pending" : null} />
      </div>
      {agreement ? (
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <Info label="Signed by" value={agreement.signatory_name} />
          <Info label="Title" value={agreement.signatory_title} />
          <Info label="Phone" value={agreement.signatory_phone} />
          <Info label="Agreement date" value={formatDateValue(agreement.agreement_date)} />
        </dl>
      ) : (
        <p className="mt-3 text-sm text-slate-500">No school agreement has been recorded.</p>
      )}
    </section>
  );
}

function ContactsSummary({ school }: { school: SchoolDetail }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="font-semibold text-slate-950">Contacts</h2>
      <div className="mt-3 divide-y divide-slate-100">
        {school.contacts && school.contacts.length > 0 ? (
          school.contacts.map((contact) => (
            <div key={contact.id} className="py-2 text-sm">
              <div className="font-medium text-slate-900">{contact.name}</div>
              <div className="text-slate-500">
                {contact.role.replaceAll("_", " ")} - {contact.phone ?? "No phone"}
              </div>
              {contact.email ? <div className="text-slate-400">{contact.email}</div> : null}
            </div>
          ))
        ) : (
          <p className="py-2 text-sm text-slate-500">No contacts yet.</p>
        )}
      </div>
    </section>
  );
}

function LocationSummary({ school }: { school: SchoolDetail }) {
  const hasMapPin =
    !school.needs_map_pin_cleanup && school.latitude !== null && school.longitude !== null;
  const mapsQuery = hasMapPin
    ? `${school.latitude},${school.longitude}`
    : school.address;
  const mapsUrl = mapsQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`
    : null;

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="font-semibold text-slate-950">Location</h2>
      <dl className="mt-3 text-sm">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Address</dt>
          <dd className="mt-1 text-slate-900">
            {mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-start gap-1.5 text-red-700 hover:text-red-800 hover:underline"
              >
                <span>{school.address}</span>
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="sr-only">Open address in Google Maps</span>
              </a>
            ) : (
              "Missing"
            )}
          </dd>
        </div>
      </dl>
      <div
        className={[
          "mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 text-sm font-medium",
          hasMapPin ? "text-emerald-700" : "text-amber-700"
        ].join(" ")}
      >
        {hasMapPin && mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 hover:text-emerald-800 hover:underline"
          >
            <MapPin className="h-4 w-4" />
            <span>Map pin created</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">Open map pin in Google Maps</span>
          </a>
        ) : (
          <>
            <MapPin className="h-4 w-4" />
            <span>Map pin not created</span>
          </>
        )}
      </div>
    </section>
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
    <section className="grid gap-4 lg:grid-cols-2" aria-label="Initial assessment data">
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

function PhotoSection({ photos, schoolId }: { photos: SchoolPhotoPage; schoolId: string }) {
  const firstRecord = photos.total === 0 ? 0 : (photos.page - 1) * photos.pageSize + 1;
  const lastRecord = Math.min(photos.total, photos.page * photos.pageSize);
  const photoGroups = groupPhotosByType(photos.photos);

  return (
    <section id="photos" className="space-y-6">
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

      {photoGroups.length === 0 ? (
        <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-500">
          No photos yet.
        </div>
      ) : (
        photoGroups.map((group) => (
          <section key={group.type} aria-labelledby={`photo-type-${group.type}`}>
            <div className="border-b border-slate-200 pb-3">
              <h3 id={`photo-type-${group.type}`} className="font-medium text-slate-950">
                {group.label}
              </h3>
              {group.description ? (
                <p className="mt-1 max-w-3xl text-sm text-slate-500">{group.description}</p>
              ) : null}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {group.photos.map((photo) => (
                <PhotoCard key={photo.id} photo={photo} groupLabel={group.label} />
              ))}
            </div>
          </section>
        ))
      )}

      {photos.totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3 text-sm">
          <span className="text-slate-500">Page {photos.page} of {photos.totalPages}</span>
          <div className="flex items-center gap-2">
            <PhotoPageLink schoolId={schoolId} page={photos.page - 1} disabled={photos.page <= 1}>
              Previous
            </PhotoPageLink>
            <PhotoPageLink schoolId={schoolId} page={photos.page + 1} disabled={photos.page >= photos.totalPages}>
              Next
            </PhotoPageLink>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PhotoCard({ photo, groupLabel }: { photo: SchoolPhoto; groupLabel: string }) {
  return (
    <figure className="overflow-hidden rounded-md border border-slate-200 bg-white">
      {photo.image_url ? (
        <div className="relative aspect-[4/3] w-full bg-slate-50">
          <Image
            src={photo.image_url}
            alt={photo.caption ?? `${groupLabel} photo`}
            fill
            unoptimized
            sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center bg-slate-50 text-sm text-slate-400">
          Image unavailable
        </div>
      )}
      <figcaption className="space-y-2 p-3 text-xs text-slate-600">
        {photo.caption ? <div className="text-sm text-slate-900">{photo.caption}</div> : null}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <StatusBadge value={photo.approval_status} />
          <span>{formatDateValue(photo.created_at)}</span>
        </div>
        {photo.uploaded_by_name ? <div>Uploaded by {photo.uploaded_by_name}</div> : null}
      </figcaption>
    </figure>
  );
}

function PhotoPageLink({
  schoolId,
  page,
  disabled,
  children
}: {
  schoolId: string;
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
      href={`/schools/${schoolId}?tab=photos&photoPage=${page}#photos`}
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
            <li key={event.id} className="grid gap-1 border-l-2 border-red-200 pl-3 text-sm">
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

function groupPhotosByType(photos: SchoolPhoto[]) {
  const grouped = new Map<string, SchoolPhoto[]>();

  for (const photo of photos) {
    const group = grouped.get(photo.photo_type);
    if (group) {
      group.push(photo);
    } else {
      grouped.set(photo.photo_type, [photo]);
    }
  }

  return [...grouped.entries()]
    .sort(([leftType], [rightType]) => {
      const leftOrder = assessmentPhotoOrder.get(leftType) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = assessmentPhotoOrder.get(rightType) ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return humanize(leftType).localeCompare(humanize(rightType));
    })
    .map(([type, groupedPhotos]) => {
      const details = assessmentPhotoDetails.get(type);
      return {
        type,
        label: details?.label ?? humanize(type),
        description: details?.description ?? null,
        photos: groupedPhotos
      };
    });
}

function getSchoolTab(value: string | undefined): SchoolTab {
  return schoolTabs.some((tab) => tab.id === value) ? value as SchoolTab : "overview";
}

function emptyPhotoPage(): SchoolPhotoPage {
  return {
    photos: [],
    total: 0,
    page: 1,
    pageSize: 12,
    totalPages: 1
  };
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
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
