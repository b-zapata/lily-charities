"use client";

import { useState } from "react";
import { reviewChangeRequest } from "@/app/actions";

type ApprovalDecisionFormProps = {
  requestId: string;
  requestType: string;
};

export function ApprovalDecisionForm({ requestId, requestType }: ApprovalDecisionFormProps) {
  const isAssessment = requestType === "assessment_submission";
  const [status, setStatus] = useState(isAssessment ? "selected" : "approved");
  const isDenyingChanges = !isAssessment && status === "rejected";

  return (
    <form action={reviewChangeRequest} className="mt-4 space-y-4">
      <input type="hidden" name="id" value={requestId} />
      {isAssessment ? (
        <>
          <input type="hidden" name="status" value="approved" />
          <fieldset>
            <legend className="text-sm font-medium text-slate-700">Initial assessment decision</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <DecisionOption
                checked={status === "selected"}
                name="pipeline_stage"
                value="selected"
                title="Selected"
                description="Move the school forward as selected."
                onChange={() => setStatus("selected")}
              />
              <DecisionOption
                checked={status === "not_selected"}
                name="pipeline_stage"
                value="not_selected"
                title="Not selected"
                description="Keep the assessment, but mark the school as not selected."
                onChange={() => setStatus("not_selected")}
              />
            </div>
          </fieldset>
        </>
      ) : (
        <fieldset>
          <legend className="text-sm font-medium text-slate-700">Approval decision</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <DecisionOption
              checked={status === "approved"}
              name="status"
              value="approved"
              title="Approve changes"
              description="Apply the proposed changes to the official record."
              onChange={() => setStatus("approved")}
            />
            <DecisionOption
              checked={status === "rejected"}
              name="status"
              value="rejected"
              title="Deny changes"
              description="Do not apply the changes and send feedback."
              onChange={() => setStatus("rejected")}
            />
          </div>
        </fieldset>
      )}

      <label className="block">
        <span className="text-sm font-medium text-slate-700">
          Feedback {isDenyingChanges ? <span className="text-rose-600">*</span> : null}
        </span>
        <textarea
          name="review_notes"
          rows={4}
          required={isDenyingChanges}
          placeholder={isDenyingChanges ? "Tell the volunteer what needs to change." : "Optional note for the volunteer or internal record."}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-100"
        />
      </label>

      <button className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800">
        Submit decision
      </button>
    </form>
  );
}

function DecisionOption({
  checked,
  name,
  value,
  title,
  description,
  onChange
}: {
  checked: boolean;
  name: string;
  value: string;
  title: string;
  description: string;
  onChange: () => void;
}) {
  return (
    <label className={`cursor-pointer rounded-md border p-3 ${checked ? "border-red-600 bg-red-50" : "border-slate-200 bg-white"}`}>
      <div className="flex items-start gap-3">
        <input
          type="radio"
          name={name}
          value={value}
          checked={checked}
          onChange={onChange}
          className="mt-1 h-4 w-4 border-slate-300 text-red-700 focus:ring-red-600"
        />
        <div>
          <div className="font-medium text-slate-950">{title}</div>
          <div className="mt-1 text-sm text-slate-500">{description}</div>
        </div>
      </div>
    </label>
  );
}
