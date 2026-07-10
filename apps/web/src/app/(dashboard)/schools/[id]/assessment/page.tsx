import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { InitialAssessmentWizard } from "@/components/initial-assessment-wizard";
import { getCurrentUser, getSchool } from "@/lib/data";

export default async function InitialAssessmentPage({
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

  const principal = school.contacts?.find((contact) => contact.role === "principal") ?? null;
  const assessment = asRecord(school.assessment);
  const gradeCounts = getGradeCountMap(school.assessment_grade_counts, assessment);

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/schools/${school.id}`}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          School details
        </Link>
      </div>

      <InitialAssessmentWizard
        school={{
          id: school.id,
          schoolNumber: school.school_number,
          name: school.name_english ?? school.name
        }}
        principal={principal}
        today={new Date().toISOString().slice(0, 10)}
        initialAssessment={{
          underprivilegedOrLowIncomeArea: booleanValue(assessment.underprivileged_or_low_income_area),
          isGoodFitForProject: booleanValue(assessment.is_good_fit_for_project),
          additionalComments: stringValue(assessment.additional_comments),
          gradeCounts
        }}
      />
    </div>
  );
}

function getGradeCountMap(
  gradeCounts: Array<{ grade_label: string; student_count: number | null }> | undefined,
  assessment: Record<string, unknown>
) {
  const counts: Record<string, number | null> = {};

  for (const grade of gradeCounts ?? []) {
    counts[grade.grade_label] = grade.student_count;
  }

  if (Object.keys(counts).length > 0) return counts;

  const rawFormData = asRecord(assessment.raw_form_data);
  const rawGradeCounts = Array.isArray(rawFormData.grade_counts) ? rawFormData.grade_counts : [];
  for (const item of rawGradeCounts) {
    const grade = asRecord(item);
    const label = stringValue(grade.grade_label);
    if (!label) continue;
    counts[label] = parseNumber(grade.student_count);
  }

  return counts;
}

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {} as Record<string, unknown>;
  return value as Record<string, unknown>;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function booleanValue(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function parseNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
