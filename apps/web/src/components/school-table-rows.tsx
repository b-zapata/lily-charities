"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import type { SchoolSummary } from "@/lib/types";

export function SchoolTableRows({ schools }: { schools: SchoolSummary[] }) {
  const router = useRouter();

  return (
    <tbody className="divide-y divide-slate-100">
      {schools.map((school) => {
        const href = `/schools/${school.id}`;
        const needsMapPin = school.needs_map_pin_cleanup || school.latitude === null || school.longitude === null;

        return (
          <tr
            key={school.id}
            tabIndex={0}
            role="link"
            aria-label={`Open ${school.school_number} ${school.name}`}
            className="cursor-pointer hover:bg-slate-50 focus:bg-red-50 focus:outline-none"
            onClick={() => router.push(href)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                router.push(href);
              }
            }}
          >
            <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">
              <Link href={href} onClick={(event) => event.stopPropagation()}>
                {school.school_number}
              </Link>
            </td>
            <td className="px-3 py-2">
              <Link href={href} className="font-medium text-slate-900" onClick={(event) => event.stopPropagation()}>
                {school.name_english ?? school.name}
              </Link>
              <div className="max-w-md truncate text-xs text-slate-500">{school.address}</div>
            </td>
            <td className="px-3 py-2 text-slate-600">
              <div>{school.principal_name ?? "Missing"}</div>
              <div className="text-xs text-slate-400">{school.principal_phone}</div>
            </td>
            <td className="px-3 py-2"><StatusBadge value={school.pipeline_stage} /></td>
            <td className="px-3 py-2">
              {needsMapPin ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                  <MapPin className="h-3 w-3" />
                  Missing pin
                </span>
              ) : (
                <span className="text-xs text-slate-400">None</span>
              )}
            </td>
          </tr>
        );
      })}
    </tbody>
  );
}
