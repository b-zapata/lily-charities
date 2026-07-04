import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { getCurrentUser, getPendingApprovalCount } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (isSupabaseConfigured() && !user) {
    redirect("/login");
  }
  if (isSupabaseConfigured() && user && !user.is_active) {
    redirect("/login?error=inactive");
  }

  const pendingApprovalCount =
    user && ["manager", "admin"].includes(user.role) ? await getPendingApprovalCount() : 0;

  return (
    <DashboardShell
      displayName={user?.display_name}
      role={user?.role}
      pendingApprovalCount={pendingApprovalCount}
    >
      {children}
    </DashboardShell>
  );
}
