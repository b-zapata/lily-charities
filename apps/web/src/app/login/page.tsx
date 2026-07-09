import { BookOpen } from "lucide-react";
import { redirect } from "next/navigation";
import { signIn } from "@/app/actions";
import { ConfigWarning } from "@/components/config-warning";
import { getCurrentUser } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params?.error;
  const user = await getCurrentUser();
  if (isSupabaseConfigured() && user) {
    redirect("/schools");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <section className="w-full max-w-sm rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-red-700 text-white">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-950">Lily Operations</h1>
            <p className="text-sm text-slate-500">Operations dashboard</p>
          </div>
        </div>

        <ConfigWarning />

        {error ? (
          <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error === "config"
              ? "Supabase is not configured."
              : error === "manager_only"
                ? "You do not have access to that dashboard page."
                : error === "inactive"
                  ? "This account is inactive. Contact an administrator."
                  : decodeURIComponent(error)}
          </div>
        ) : null}

        <form action={signIn} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-700"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              name="password"
              type="password"
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-700"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800"
          >
            Sign in
          </button>
        </form>
      </section>
    </main>
  );
}
