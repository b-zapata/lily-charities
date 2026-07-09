"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ClipboardCheck,
  Download,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  School,
  UserCircle,
  Users,
  X
} from "lucide-react";
import { signOut } from "@/app/actions";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/schools", label: "Schools", icon: School, managerOnly: false },
  { href: "/approvals", label: "Approvals", icon: ClipboardCheck, managerOnly: true },
  { href: "/exports", label: "Exports", icon: Download, managerOnly: true },
  { href: "/users", label: "Users", icon: Users, managerOnly: true },
  { href: "/profile", label: "Profile", icon: UserCircle, managerOnly: false }
];

export function DashboardShell({
  children,
  displayName,
  role,
  pendingApprovalCount = 0
}: {
  children: React.ReactNode;
  displayName?: string | null;
  role?: string | null;
  pendingApprovalCount?: number;
}) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-slate-100">
      {isMobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 border-r border-slate-200 bg-white transition-all duration-200",
          isCollapsed ? "lg:w-20" : "lg:w-64",
          isMobileOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-red-700 text-white">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className={cn("min-w-0 flex-1", isCollapsed && "lg:hidden")}>
            <div className="truncate text-sm font-semibold text-slate-950">Lily Charities</div>
            <div className="truncate text-xs text-slate-500">Operations</div>
          </div>
          <button
            type="button"
            aria-label="Close navigation"
            title="Close navigation"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={() => setIsMobileOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={isCollapsed ? "Expand navigation" : "Collapse navigation"}
            title={isCollapsed ? "Expand navigation" : "Collapse navigation"}
            className="hidden h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 lg:inline-flex"
            onClick={() => setIsCollapsed((current) => !current)}
          >
            {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        <nav className="space-y-1 px-3 py-4">
          {navItems.filter((item) => !item.managerOnly || role === "manager" || role === "admin").map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const badge =
              item.href === "/approvals" && pendingApprovalCount > 0
                ? pendingApprovalCount > 99
                  ? "99+"
                  : String(pendingApprovalCount)
                : null;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100",
                  isCollapsed && "lg:justify-center lg:px-2",
                  isActive && "bg-red-50 text-red-900"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className={cn("min-w-0 flex-1 truncate", isCollapsed && "lg:hidden")}>
                  {item.label}
                </span>
                {badge ? (
                  <span
                    aria-label={`${badge} pending approvals`}
                    className={cn(
                      "inline-flex min-w-5 items-center justify-center rounded-full bg-red-700 px-1.5 py-0.5 text-xs font-semibold leading-none text-white",
                      isCollapsed && "lg:hidden"
                    )}
                  >
                    {badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className={cn("transition-all duration-200", isCollapsed ? "lg:pl-20" : "lg:pl-64")}>
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation"
              title="Open navigation"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 lg:hidden"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="truncate text-sm text-slate-500">
              {displayName ? (
                <span>
                  Signed in as <span className="font-medium text-slate-900">{displayName}</span>
                </span>
              ) : (
                <span>Not connected</span>
              )}
            </div>
          </div>

          <form action={signOut}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </form>
        </header>
        <main className="px-4 py-6 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
