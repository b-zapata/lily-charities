"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import type { ApprovalQueueItem } from "@/lib/types";

export function ApprovalTableRows({ approvals }: { approvals: ApprovalQueueItem[] }) {
  const router = useRouter();

  return (
    <tbody className="divide-y divide-slate-100">
      {approvals.map((approval) => {
        const href = `/approvals/${approval.id}`;

        return (
          <tr
            key={approval.id}
            tabIndex={0}
            role="link"
            aria-label={`Open approval ${approval.request_type.replaceAll("_", " ")}`}
            className="cursor-pointer hover:bg-slate-50 focus:bg-red-50 focus:outline-none"
            onClick={() => router.push(href)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                router.push(href);
              }
            }}
          >
            <td className="px-3 py-2">
              <Link href={href} className="font-medium text-slate-900" onClick={(event) => event.stopPropagation()}>
                {approval.request_type.replaceAll("_", " ")}
              </Link>
            </td>
            <td className="px-3 py-2 text-slate-700">
              <div>{approval.school_number ?? "Pending number"}</div>
              <div className="text-xs text-slate-500">{approval.school_name ?? "New school"}</div>
            </td>
            <td className="px-3 py-2 text-slate-700">{approval.submitter_name ?? "Unknown"}</td>
            <td className="px-3 py-2">
              <StatusBadge value={approval.status} />
            </td>
            <td className="px-3 py-2 text-slate-700">{approval.conflict_detected ? "Yes" : "No"}</td>
          </tr>
        );
      })}
    </tbody>
  );
}
