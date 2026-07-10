"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ImagePlus } from "lucide-react";
import { submitInitialAssessment } from "@/app/actions";
import { assessmentGradeCountFields } from "@/lib/assessment-fields";
import { buildSchoolAgreementIntro, schoolAgreementConditions } from "@/lib/school-agreement";
import { cn } from "@/lib/utils";

const steps = ["School Agreement", "Students", "Final Remarks", "Photos"] as const;
const gradeFields = assessmentGradeCountFields.filter((grade) => grade.key !== "total");

type InitialAssessmentWizardProps = {
  school: {
    id: string;
    schoolNumber: string;
    name: string;
  };
  principal?: {
    name: string;
    phone: string | null;
    email: string | null;
    title: string | null;
  } | null;
  today: string;
  initialAssessment?: {
    underprivilegedOrLowIncomeArea?: boolean | null;
    isGoodFitForProject?: boolean | null;
    additionalComments?: string | null;
    gradeCounts?: Record<string, number | null>;
  };
};

export function InitialAssessmentWizard({
  school,
  principal,
  today,
  initialAssessment
}: InitialAssessmentWizardProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [gradeCounts, setGradeCounts] = useState<Record<string, string>>(() => {
    const values: Record<string, string> = {};
    for (const grade of gradeFields) {
      const initialValue = initialAssessment?.gradeCounts?.[grade.key];
      values[grade.key] = typeof initialValue === "number" ? String(initialValue) : "";
    }
    return values;
  });

  const studentTotal = useMemo(
    () =>
      gradeFields.reduce((total, grade) => {
        const value = Number(gradeCounts[grade.key]);
        return Number.isFinite(value) ? total + value : total;
      }, 0),
    [gradeCounts]
  );

  const agreementIntro = buildSchoolAgreementIntro(school.name, principal?.name || "the signer");

  return (
    <form action={submitInitialAssessment} encType="multipart/form-data" className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <input type="hidden" name="school_id" value={school.id} />
      <input type="hidden" name="visit_date" value={today} />

      <div className="border-b border-slate-200 p-4">
        <div className="text-sm font-medium text-red-700">{school.schoolNumber}</div>
        <h1 className="text-xl font-semibold text-slate-950">Initial Assessment</h1>
        <p className="mt-1 text-sm text-slate-500">{school.name}</p>
      </div>

      <div className="grid border-b border-slate-200 bg-slate-50 sm:grid-cols-4">
        {steps.map((step, index) => (
          <button
            key={step}
            type="button"
            aria-current={activeStep === index ? "step" : undefined}
            onClick={() => setActiveStep(index)}
            className={cn(
              "flex items-center gap-2 border-b border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-600 sm:border-b-0 sm:border-r",
              activeStep === index && "bg-white text-red-900"
            )}
          >
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs",
                activeStep === index ? "border-red-700 bg-red-700 text-white" : "border-slate-300 bg-white"
              )}
            >
              {index + 1}
            </span>
            <span className="min-w-0 truncate">{step}</span>
          </button>
        ))}
      </div>

      <div className="p-4">
        <section className={cn("space-y-5", activeStep !== 0 && "hidden")} aria-label="School agreement">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-medium text-slate-900">{agreementIntro}</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              {schoolAgreementConditions.map((condition) => (
                <li key={condition}>{condition}</li>
              ))}
            </ol>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Principal / signer name" name="principal_name" defaultValue={principal?.name} />
            <Field label="Title" name="principal_title" defaultValue={principal?.title ?? "Principal"} />
            <Field label="Phone" name="principal_phone" type="tel" defaultValue={principal?.phone} />
            <Field label="Email" name="principal_email" type="email" defaultValue={principal?.email} />
            <Field label="Typed signature" name="typed_signature" defaultValue={principal?.name} full />
            <label className="flex gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 md:col-span-2">
              <input name="school_agreement_accepted" type="checkbox" className="mt-1 h-4 w-4 accent-red-700" />
              <span>The signer accepts the school agreement on behalf of the school.</span>
            </label>
          </div>
        </section>

        <section className={cn("space-y-5", activeStep !== 1 && "hidden")} aria-label="Students">
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              label="Underprivileged / low-income"
              name="assessment_underprivileged_or_low_income_area"
              defaultValue={booleanDefault(initialAssessment?.underprivilegedOrLowIncomeArea)}
            />
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Calculated total</div>
              <div className="mt-1 text-lg font-semibold text-slate-950">{studentTotal}</div>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-slate-700">Grade counts</div>
            <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {gradeFields.map((grade) => (
                <label key={grade.key}>
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{grade.label}</span>
                  <input
                    name={`assessment_grade_count_${grade.key}`}
                    type="number"
                    min={0}
                    value={gradeCounts[grade.key] ?? ""}
                    onChange={(event) =>
                      setGradeCounts((current) => ({
                        ...current,
                        [grade.key]: event.target.value
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-700"
                  />
                </label>
              ))}
            </div>
          </div>
        </section>

        <section className={cn("space-y-5", activeStep !== 2 && "hidden")} aria-label="Final remarks">
          <SelectField
            label="Do you recommend this school for the program?"
            name="assessment_is_good_fit_for_project"
            defaultValue={booleanDefault(initialAssessment?.isGoodFitForProject)}
          />
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Notes by the person submitting this form</span>
            <textarea
              name="assessment_additional_comments"
              rows={5}
              defaultValue={initialAssessment?.additionalComments ?? ""}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-700"
            />
          </label>
        </section>

        <section className={cn("space-y-5", activeStep !== 3 && "hidden")} aria-label="Photos">
          <label className="block rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <ImagePlus className="h-4 w-4" />
              Assessment photos
            </span>
            <input
              name="assessment_photos"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="mt-3 block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-red-700 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-red-800"
            />
          </label>
        </section>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3">
        <button
          type="button"
          onClick={() => setActiveStep((step) => Math.max(0, step - 1))}
          disabled={activeStep === 0}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        {activeStep < steps.length - 1 ? (
          <button
            type="button"
            onClick={() => setActiveStep((step) => Math.min(steps.length - 1, step + 1))}
            className="inline-flex items-center gap-2 rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800"
          >
            <Check className="h-4 w-4" />
            Submit assessment
          </button>
        )}
      </div>
    </form>
  );
}

function booleanDefault(value: boolean | null | undefined) {
  if (value === true) return "true";
  if (value === false) return "false";
  return "";
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  full
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  type?: string;
  full?: boolean;
}) {
  return (
    <label className={full ? "md:col-span-2" : ""}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-700"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue
}: {
  label: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-700"
      >
        <option value="">Choose an answer</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    </label>
  );
}
