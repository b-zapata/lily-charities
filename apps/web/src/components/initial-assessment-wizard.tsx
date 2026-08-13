"use client";

import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, ImagePlus, LoaderCircle, MapPin, Plus } from "lucide-react";
import { useFormStatus } from "react-dom";
import { createSchoolWithInitialAssessment, submitInitialAssessment } from "@/app/actions";
import { assessmentGradeCountFields } from "@/lib/assessment-fields";
import { requiredAssessmentPhotos } from "@/lib/assessment-photos";
import { buildSchoolAgreementIntro, schoolAgreementConditions } from "@/lib/school-agreement";
import { cn } from "@/lib/utils";
import { MapPinPicker } from "@/components/map-pin-picker";

const steps = ["School Leadership", "Students", "Final Remarks", "Pictures"] as const;
const gradeFields = assessmentGradeCountFields.filter((grade) => grade.key !== "total");

type InitialAssessmentWizardProps = {
  mode?: "assessment" | "create";
  school?: {
    id: string;
    schoolNumber: string;
    name: string;
  };
  creationSubmissionId?: string;
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
  mode = "assessment",
  school,
  creationSubmissionId,
  principal,
  today,
  initialAssessment
}: InitialAssessmentWizardProps) {
  const isCreating = mode === "create";
  const submittedRef = useRef(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [attemptedStep, setAttemptedStep] = useState<number | null>(null);
  const [schoolValues, setSchoolValues] = useState({
    nameEnglish: school?.name ?? "",
    nameBangla: "",
    address: "",
    district: ""
  });
  const [leadershipValues, setLeadershipValues] = useState({
    principalName: principal?.name ?? "",
    principalTitle: principal?.title ?? "Principal",
    principalPhone: principal?.phone ?? "",
    principalEmail: principal?.email ?? "",
    typedSignature: principal?.name ?? "",
    agreementAccepted: false
  });
  const [underprivilegedValue, setUnderprivilegedValue] = useState(
    booleanDefault(initialAssessment?.underprivilegedOrLowIncomeArea)
  );
  const [recommendationValue, setRecommendationValue] = useState(
    booleanDefault(initialAssessment?.isGoodFitForProject)
  );
  const [photoUploads, setPhotoUploads] = useState<Record<string, boolean>>(() => {
    const uploads: Record<string, boolean> = {};
    for (const photo of requiredAssessmentPhotos) uploads[photo.key] = false;
    return uploads;
  });
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

  const representedSchoolName = isCreating
    ? schoolValues.nameEnglish.trim() || "the school"
    : school?.name ?? "the school";
  const agreementIntro = buildSchoolAgreementIntro(
    representedSchoolName,
    leadershipValues.principalName.trim() || "the signer"
  );
  const completionErrors = getStepErrors();
  const canAdvance = completionErrors.length === 0;

  function getStepErrors() {
    if (activeStep === 0) {
      const errors = [];
      if (isCreating && !schoolValues.nameEnglish.trim()) {
        errors.push("School name in English is required.");
      }
      if (isCreating && !schoolValues.nameBangla.trim()) {
        errors.push("School name in Bangla is required.");
      }
      if (isCreating && !schoolValues.address.trim()) errors.push("Address is required.");
      if (!leadershipValues.principalName.trim()) errors.push("Principal / signer name is required.");
      if (!leadershipValues.principalPhone.trim()) errors.push("Phone is required.");
      if (!leadershipValues.typedSignature.trim()) errors.push("Typed signature is required.");
      if (!leadershipValues.agreementAccepted) errors.push("The school agreement must be accepted.");
      return errors;
    }

    if (activeStep === 1) {
      const errors = [];
      if (!underprivilegedValue) errors.push("Underprivileged / low-income answer is required.");
      const missingGrade = gradeFields.find((grade) => gradeCounts[grade.key].trim() === "");
      if (missingGrade) errors.push("All grade counts are required.");
      const invalidGrade = gradeFields.find((grade) => {
        const value = Number(gradeCounts[grade.key]);
        return !Number.isInteger(value) || value < 0;
      });
      if (invalidGrade) errors.push("Grade counts must be whole numbers zero or greater.");
      return errors;
    }

    if (activeStep === 2) {
      return recommendationValue ? [] : ["Recommendation is required."];
    }

    const missingPhoto = requiredAssessmentPhotos.find((photo) => !photoUploads[photo.key]);
    return missingPhoto ? ["All required pictures must be uploaded."] : [];
  }

  function goToStep(targetStep: number) {
    if (targetStep <= activeStep) {
      setActiveStep(targetStep);
      setAttemptedStep(null);
      return;
    }

    if (!canAdvance) {
      setAttemptedStep(activeStep);
      return;
    }

    setActiveStep(Math.min(activeStep + 1, steps.length - 1));
    setAttemptedStep(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!canAdvance || submittedRef.current) {
      event.preventDefault();
      setAttemptedStep(activeStep);
      return;
    }

    submittedRef.current = true;
    setSubmitted(true);
  }

  if (!isCreating && !school) return null;

  return (
    <form
      action={isCreating ? createSchoolWithInitialAssessment : submitInitialAssessment}
      encType="multipart/form-data"
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-md border border-slate-200 bg-white"
    >
      {isCreating ? (
        <input type="hidden" name="creation_submission_id" value={creationSubmissionId} />
      ) : (
        <input type="hidden" name="school_id" value={school?.id} />
      )}
      <input type="hidden" name="visit_date" value={today} />

      <div className="border-b border-slate-200 p-4">
        {!isCreating ? <div className="text-sm font-medium text-red-700">{school?.schoolNumber}</div> : null}
        <h1 className="text-xl font-semibold text-slate-950">
          {isCreating ? "Create School" : "Initial Assessment"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {isCreating
            ? "Create the school record and complete its initial assessment in one submission."
            : school?.name}
        </p>
      </div>

      <div className="grid border-b border-slate-200 bg-slate-50 sm:grid-cols-4">
        {steps.map((step, index) => (
          <button
            key={step}
            type="button"
            aria-current={activeStep === index ? "step" : undefined}
            onClick={() => goToStep(index)}
            className={cn(
              "flex items-center gap-2 border-b border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-600 sm:border-b-0 sm:border-r",
              index < activeStep && "bg-red-700 text-white hover:bg-red-800",
              activeStep === index && "bg-white text-red-900",
              index > activeStep && "hover:bg-white"
            )}
          >
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs",
                index < activeStep && "border-white bg-white text-red-700",
                activeStep === index && "border-red-700 bg-red-700 text-white",
                index > activeStep && "border-slate-300 bg-white text-slate-600"
              )}
            >
              {index + 1}
            </span>
            <span className="min-w-0 truncate">{step}</span>
          </button>
        ))}
      </div>

      <div className="p-4">
        {attemptedStep === activeStep && completionErrors.length > 0 ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            {completionErrors[0]}
          </div>
        ) : null}

        <section className={cn("space-y-5", activeStep !== 0 && "hidden")} aria-label={steps[0]}>
          {isCreating ? (
            <>
              <div>
                <h2 className="text-base font-semibold text-slate-950">School information</h2>
                <p className="mt-1 text-sm text-slate-500">
                  The school number is generated automatically when the completed assessment is submitted.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="School name in English"
                  name="name_english"
                  value={schoolValues.nameEnglish}
                  onChange={(value) => setSchoolValues((current) => ({ ...current, nameEnglish: value }))}
                  required
                />
                <Field
                  label="School name in Bangla"
                  name="name_bangla"
                  value={schoolValues.nameBangla}
                  onChange={(value) => setSchoolValues((current) => ({ ...current, nameBangla: value }))}
                  required
                />
                <AddressField
                  value={schoolValues.address}
                  onChange={(value) => setSchoolValues((current) => ({ ...current, address: value }))}
                />
                <Field
                  label="District"
                  name="district"
                  value={schoolValues.district}
                  onChange={(value) => setSchoolValues((current) => ({ ...current, district: value }))}
                />
                <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  <MapPin className="h-4 w-4 shrink-0 text-amber-700" />
                  Schools created without a pin will be flagged for map-pin cleanup.
                </div>
                <MapPinPicker addressInputName="address" showMapAddressButton={false} />
              </div>
              <div className="border-t border-slate-200" />
            </>
          ) : null}

          <div>
            <h2 className="text-base font-semibold text-slate-950">School agreement</h2>
            <p className="mt-1 text-sm text-slate-500">
              Record the principal or authorized signer next to the agreement they are accepting.
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-medium text-slate-900">{agreementIntro}</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              {schoolAgreementConditions.map((condition) => (
                <li key={condition}>{condition}</li>
              ))}
            </ol>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Principal / signer name"
              name="principal_name"
              value={leadershipValues.principalName}
              onChange={(value) => setLeadershipValues((current) => ({ ...current, principalName: value }))}
              required
            />
            <Field
              label="Title"
              name="principal_title"
              value={leadershipValues.principalTitle}
              onChange={(value) => setLeadershipValues((current) => ({ ...current, principalTitle: value }))}
            />
            <Field
              label="Phone"
              name="principal_phone"
              type="tel"
              value={leadershipValues.principalPhone}
              onChange={(value) => setLeadershipValues((current) => ({ ...current, principalPhone: value }))}
              required
            />
            <Field
              label="Email"
              name="principal_email"
              type="email"
              value={leadershipValues.principalEmail}
              onChange={(value) => setLeadershipValues((current) => ({ ...current, principalEmail: value }))}
            />
            <Field
              label="Typed signature"
              name="typed_signature"
              value={leadershipValues.typedSignature}
              onChange={(value) => setLeadershipValues((current) => ({ ...current, typedSignature: value }))}
              full
              required
            />
            <label className="flex gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 md:col-span-2">
              <input
                name="school_agreement_accepted"
                type="checkbox"
                checked={leadershipValues.agreementAccepted}
                onChange={(event) =>
                  setLeadershipValues((current) => ({
                    ...current,
                    agreementAccepted: event.target.checked
                  }))
                }
                className="mt-1 h-4 w-4 accent-red-700"
              />
              <span>The signer accepts the school agreement on behalf of the school.</span>
            </label>
          </div>
        </section>

        <section className={cn("space-y-5", activeStep !== 1 && "hidden")} aria-label="Students">
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              label="Underprivileged / low-income"
              name="assessment_underprivileged_or_low_income_area"
              value={underprivilegedValue}
              onChange={setUnderprivilegedValue}
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
                    required
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
            value={recommendationValue}
            onChange={setRecommendationValue}
          />
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Final comments</span>
            <textarea
              name="assessment_additional_comments"
              rows={5}
              defaultValue={initialAssessment?.additionalComments ?? ""}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-700"
            />
          </label>
        </section>

        <section className={cn("space-y-5", activeStep !== 3 && "hidden")} aria-label="Pictures">
          {requiredAssessmentPhotos.map((photo) => (
            <label key={photo.key} className="block rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <ImagePlus className="h-4 w-4" />
                {photo.label}
                <span className="text-red-600">*</span>
              </span>
              <span className="mt-1 block text-sm text-slate-500">{photo.description}</span>
              <input
                name={`assessment_photo_${photo.key}`}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
                onChange={(event) =>
                  setPhotoUploads((current) => ({
                    ...current,
                    [photo.key]: Boolean(event.target.files && event.target.files.length > 0)
                  }))
                }
                className="mt-3 block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-red-700 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-red-800"
              />
            </label>
          ))}
        </section>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3">
        <button
          type="button"
          onClick={() => {
            setActiveStep((step) => Math.max(0, step - 1));
            setAttemptedStep(null);
          }}
          disabled={activeStep === 0 || submitted}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        {activeStep < steps.length - 1 ? (
          <button
            type="button"
            onClick={() => goToStep(activeStep + 1)}
            disabled={submitted}
            className="inline-flex items-center gap-2 rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-wait disabled:bg-red-400"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <WizardSubmitButton isCreating={isCreating} submitted={submitted} />
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

function WizardSubmitButton({
  isCreating,
  submitted
}: {
  isCreating: boolean;
  submitted: boolean;
}) {
  const { pending } = useFormStatus();
  const disabled = pending || submitted;

  return (
    <button
      type="submit"
      disabled={disabled}
      className="inline-flex min-w-44 items-center justify-center gap-2 rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-wait disabled:bg-red-400"
    >
      {disabled ? (
        <LoaderCircle className="h-4 w-4 animate-spin" />
      ) : isCreating ? (
        <Plus className="h-4 w-4" />
      ) : (
        <Check className="h-4 w-4" />
      )}
      {disabled
        ? isCreating
          ? "Creating school..."
          : "Submitting..."
        : isCreating
          ? "Create school and submit assessment"
          : "Submit assessment"}
    </button>
  );
}

function AddressField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="md:col-span-2">
      <span className="text-sm font-medium text-slate-700">
        Address<span className="ml-1 text-red-600">*</span>
      </span>
      <div className="mt-1 flex flex-col gap-2 sm:flex-row">
        <input
          name="address"
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-700"
        />
        <button
          type="button"
          data-map-address-button="address"
          className="inline-flex items-center justify-center rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Map address
        </button>
      </div>
    </label>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  full,
  required
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  full?: boolean;
  required?: boolean;
}) {
  return (
    <label className={full ? "md:col-span-2" : ""}>
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="ml-1 text-red-600">*</span> : null}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-700"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">
        {label}
        <span className="ml-1 text-red-600">*</span>
      </span>
      <select
        name={name}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-700"
      >
        <option value="">Choose an answer</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    </label>
  );
}
