"use client";

import { LoaderCircle, Plus } from "lucide-react";
import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";

export function SchoolCreationForm({
  action,
  isVolunteer,
  children
}: {
  action: (formData: FormData) => void | Promise<void>;
  isVolunteer: boolean;
  children: React.ReactNode;
}) {
  const submittedRef = useRef(false);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (submittedRef.current) {
      event.preventDefault();
      return;
    }

    submittedRef.current = true;
    setSubmitted(true);
  }

  return (
    <form
      action={action}
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-md border border-slate-200 bg-white"
    >
      {children}
      <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
        <SchoolCreationSubmitButton isVolunteer={isVolunteer} submitted={submitted} />
      </div>
    </form>
  );
}

function SchoolCreationSubmitButton({
  isVolunteer,
  submitted
}: {
  isVolunteer: boolean;
  submitted: boolean;
}) {
  const { pending } = useFormStatus();
  const disabled = submitted || pending;

  return (
    <button
      type="submit"
      disabled={disabled}
      className="inline-flex min-w-36 items-center justify-center gap-2 rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-wait disabled:bg-red-400"
    >
      {disabled ? (
        <LoaderCircle className="h-4 w-4 animate-spin" />
      ) : (
        <Plus className="h-4 w-4" />
      )}
      {disabled
        ? isVolunteer
          ? "Submitting..."
          : "Creating..."
        : isVolunteer
          ? "Submit for approval"
          : "Create school"}
    </button>
  );
}
