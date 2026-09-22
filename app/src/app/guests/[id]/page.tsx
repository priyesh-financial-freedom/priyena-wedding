import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import GuestFamilyActions from "./GuestFamilyActions";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function GuestFamilyPage({ params }: PageProps) {
  const { id } = await params;

  const [familyResult, ownersResult] = await Promise.all([
    supabase.from("guest_families").select("*").eq("id", id).single(),

    supabase
      .from("family_members")
      .select("id, name")
      .eq("active", true)
      .order("display_order", { ascending: true }),
  ]);

  if (familyResult.error || !familyResult.data) {
    notFound();
  }

  const family = familyResult.data;

  const owner =
    ownersResult.data?.find((member) => member.id === family.guest_owner_id) ??
    null;

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-4xl">
        {/* Back */}
        <Link
          href="/guests"
          className="mb-6 inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Back to Guest Directory
        </Link>

        {/* Header */}
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold text-slate-900">
                  {family.family_name}
                </h1>
              </div>
            </div>

            <div
              className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold ${
                family.rsvp_status === "confirmed"
                  ? "bg-green-100 text-green-700"
                  : family.rsvp_status === "declined"
                    ? "bg-red-100 text-red-700"
                    : "bg-amber-100 text-amber-700"
              }`}
            >
              {family.rsvp_status === "confirmed"
                ? "Confirmed"
                : family.rsvp_status === "declined"
                  ? "Declined"
                  : "Pending RSVP"}
            </div>
          </div>
        </div>

        {/* Family summary */}
        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm md:p-8">
          <h2 className="mb-5 text-lg font-semibold text-slate-900">
            Family Details
          </h2>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-sm text-slate-500">Number of Persons</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {family.guest_count}{" "}
                {family.guest_count === 1 ? "person" : "persons"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Owner</p>
              <p className="mt-1 font-medium text-slate-900">
                {owner?.name || "Unassigned"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">RSVP</p>
              <p className="mt-1 font-medium capitalize text-slate-900">
                {family.rsvp_status}
              </p>
            </div>
          </div>
        </section>

        {/* Notes */}
        {family.notes && (
          <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm md:p-8">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Notes</h2>

            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {family.notes}
            </p>
          </section>
        )}

        {/* Actions */}
        <GuestFamilyActions
          family={{
            id: family.id,
            family_name: family.family_name,
            guest_count: family.guest_count,
            guest_owner_id: family.guest_owner_id,
            rsvp_status: family.rsvp_status,
            notes: family.notes,
          }}
          owners={ownersResult.data ?? []}
        />
      </div>
    </main>
  );
}
