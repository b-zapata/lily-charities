import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  identified: "bg-slate-100 text-slate-700",
  assessed: "bg-sky-100 text-sky-800",
  selected: "bg-emerald-100 text-emerald-800",
  setup_in_progress: "bg-indigo-100 text-indigo-800",
  training: "bg-violet-100 text-violet-800",
  operational: "bg-teal-100 text-teal-800",
  pending: "bg-slate-100 text-slate-700",
  future_potential: "bg-amber-100 text-amber-800",
  not_selected: "bg-rose-100 text-rose-800",
  pending_review: "bg-amber-100 text-amber-800",
  needs_clarification: "bg-orange-100 text-orange-800",
  approved: "bg-emerald-100 text-emerald-800",
  partially_approved: "bg-blue-100 text-blue-800",
  rejected: "bg-rose-100 text-rose-800"
};

export function StatusBadge({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-slate-400">Missing</span>;
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium",
        tones[value] ?? "bg-slate-100 text-slate-700"
      )}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}
