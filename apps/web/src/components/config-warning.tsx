import { AlertCircle } from "lucide-react";
import { getConfigWarning } from "@/lib/data";

export function ConfigWarning() {
  const warning = getConfigWarning();
  if (!warning) return null;

  return (
    <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{warning}</p>
    </div>
  );
}
