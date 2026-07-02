import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, ClipboardCheck, Download, LogOut, School, Users } from "lucide-react";
import { signOut } from "@/app/actions";
import { getCurrentUser } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/server";

const navItems = [
  { href: "/schools", label: "Schools", icon: School },
  { href: "/approvals", label: "Approvals", icon: ClipboardCheck },
  { href: "/exports", label: "Exports", icon: Download },
  { href: "/users", label: "Users", icon: Users }
];

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (isSupabaseConfigured() && !user) {
    redirect("/login");
  }
  if (isSupabaseConfigured() && user && !["manager", "admin"].includes(user.role)) {
    redirect("/login?error=manager_only");
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-700 text-white">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-950">Lily Charities</div>
            <div className="text-xs text-slate-500">Operations</div>
          </div>
        </div>
        <nav className="space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
          <div className="text-sm text-slate-500">
            {user ? (
              <span>
                Signed in as <span className="font-medium text-slate-900">{user.display_name}</span>
              </span>
            ) : (
              <span>Not connected</span>
            )}
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </header>
        <main className="px-4 py-6 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
