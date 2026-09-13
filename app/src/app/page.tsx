import { supabase } from "@/lib/supabase";

export default async function HomePage() {
  const [
    familiesResult,
    confirmedResult,
    pendingResult,
    functionsResult,
  ] = await Promise.all([
    supabase
      .from("guest_families")
      .select("*", { count: "exact", head: true }),

    supabase
      .from("guest_families")
      .select("*", { count: "exact", head: true })
      .eq("rsvp_status", "confirmed"),

    supabase
      .from("guest_families")
      .select("*", { count: "exact", head: true })
      .eq("rsvp_status", "pending"),

    supabase
      .from("functions")
      .select("*", { count: "exact", head: true }),
  ]);

  if (familiesResult.error) {
    console.error("Families query failed:", familiesResult.error);
  }

  if (confirmedResult.error) {
    console.error("Confirmed query failed:", confirmedResult.error);
  }

  if (pendingResult.error) {
    console.error("Pending RSVP query failed:", pendingResult.error);
  }

  if (functionsResult.error) {
    console.error("Functions query failed:", functionsResult.error);
  }

  const familiesInvited = familiesResult.count ?? 0;
  const confirmed = confirmedResult.count ?? 0;
  const pending = pendingResult.count ?? 0;
  const functions = functionsResult.count ?? 0;

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-4xl font-bold">
          Priyena Wedding Planner
        </h1>

        <p className="mt-2 text-slate-600">
          Wedding Date: 25 January 2027
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl bg-white p-6 shadow">
            <div className="text-sm text-slate-500">
              Families Invited
            </div>
            <div className="text-3xl font-bold">
              {familiesInvited}
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow">
            <div className="text-sm text-slate-500">
              Confirmed
            </div>
            <div className="text-3xl font-bold">
              {confirmed}
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow">
            <div className="text-sm text-slate-500">
              Pending RSVP
            </div>
            <div className="text-3xl font-bold">
              {pending}
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow">
            <div className="text-sm text-slate-500">
              Functions
            </div>
            <div className="text-3xl font-bold">
              {functions}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
