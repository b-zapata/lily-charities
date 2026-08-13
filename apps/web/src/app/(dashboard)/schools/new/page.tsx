import { redirect } from "next/navigation";
import { ConfigWarning } from "@/components/config-warning";
import { InitialAssessmentWizard } from "@/components/initial-assessment-wizard";
import { getCurrentUser } from "@/lib/data";

export default async function NewSchoolPage() {
  const user = await getCurrentUser();
  if (user && !["manager", "admin"].includes(user.role)) {
    redirect("/schools");
  }

  return (
    <div className="max-w-5xl space-y-4">
      <ConfigWarning />
      <InitialAssessmentWizard
        mode="create"
        creationSubmissionId={crypto.randomUUID()}
        today={new Date().toISOString().slice(0, 10)}
      />
    </div>
  );
}
