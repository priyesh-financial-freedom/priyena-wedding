export const dynamic = "force-dynamic";

import { supabase } from "@/lib/supabase";
import GiftPlanningClient from "./GiftPlanningClient";

export default async function GiftPlanningPage() {
  const { data: wedding, error: weddingError } = await supabase
    .from("weddings")
    .select("id")
    .eq("name", "Priyena Wedding")
    .single();

  if (weddingError || !wedding) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          Unable to load Priyena Wedding.
        </div>
      </main>
    );
  }

  const [
    { data: giftTypes, error: giftTypesError },
    { data: families, error: familiesError },
    { data: plans, error: plansError },
  ] = await Promise.all([
    supabase
      .from("gift_types")
      .select(
        "id, gift_name, gift_category, estimated_unit_cost, vendor_name, notes, active",
      )
      .eq("wedding_id", wedding.id)
      .eq("active", true)
      .order("gift_name"),
    supabase
      .from("guest_families")
      .select("id, family_name, city")
      .eq("wedding_id", wedding.id)
      .order("family_name"),
    supabase
      .from("guest_gift_plan")
      .select(
        "id, guest_family_id, gift_type_id, quantity, status, notes, created_at",
      )
      .eq("wedding_id", wedding.id)
      .not("guest_family_id", "is", null)
      .order("created_at"),
  ]);

  const loadError = giftTypesError || familiesError || plansError;

  if (loadError) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          Unable to load Gift Planning: {loadError.message}
        </div>
      </main>
    );
  }

  return (
    <GiftPlanningClient
      weddingId={wedding.id}
      initialGiftTypes={giftTypes ?? []}
      initialFamilies={families ?? []}
      initialPlans={plans ?? []}
    />
  );
}
