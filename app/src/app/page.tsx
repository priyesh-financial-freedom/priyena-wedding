export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateString}T00:00:00`));
}

function daysUntil(dateString: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const eventDate = new Date(`${dateString}T00:00:00`);
  eventDate.setHours(0, 0, 0, 0);

  return Math.ceil(
    (eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
}

export default async function HomePage() {
  const { data: wedding } = await supabase
    .from("weddings")
    .select("id, name, wedding_date")
    .eq("name", "Priyena Wedding")
    .single();

  if (!wedding) {
    return (
      <main className="min-h-screen bg-[#fffaf5] px-5 py-12">
        <div className="mx-auto max-w-4xl rounded-2xl border bg-white p-8">
          <h1 className="text-2xl font-semibold text-slate-900">
            Priyena Wedding Planner
          </h1>
          <p className="mt-2 text-slate-500">
            Wedding information could not be loaded.
          </p>
        </div>
      </main>
    );
  }

  const [
    { data: functions },
    { data: families },
    { data: directGuests },
    { data: budgetItems },
    { data: payments },
  ] = await Promise.all([
    supabase
      .from("functions")
      .select("id, name, function_date, venue, start_time, end_time")
      .eq("wedding_id", wedding.id)
      .order("function_date", { ascending: true })
      .order("start_time", { ascending: true }),

    supabase
      .from("guest_families")
      .select("id, guest_count, invited, rsvp_status")
      .eq("wedding_id", wedding.id),

    supabase
      .from("guests")
      .select("id, invited, rsvp_status")
      .eq("wedding_id", wedding.id)
      .is("guest_family_id", null),

    supabase
      .from("budget_items")
      .select("budget_amount, quoted_amount, paid_amount")
      .eq("wedding_id", wedding.id),

    supabase
      .from("budget_payments")
      .select("payment_amount, budget_item_id, category_id")
      .order("created_at", { ascending: true }),
  ]);

  const eventList = functions ?? [];
  const familyList = families ?? [];
  const individualList = directGuests ?? [];
  const budgetList = budgetItems ?? [];
  const paymentList = payments ?? [];

  const familiesInvited = familyList.filter(
    (family) => family.invited === true,
  ).length;

  const confirmedFamilyPersons = familyList
    .filter((family) => family.rsvp_status === "confirmed")
    .reduce((sum, family) => sum + Number(family.guest_count || 0), 0);

  const confirmedIndividuals = individualList.filter(
    (guest) => guest.rsvp_status === "confirmed",
  ).length;

  const confirmedGuests = confirmedFamilyPersons + confirmedIndividuals;

  const pendingFamilyPersons = familyList
    .filter(
      (family) => family.invited === true && family.rsvp_status !== "confirmed",
    )
    .reduce((sum, family) => sum + Number(family.guest_count || 0), 0);

  const pendingIndividuals = individualList.filter(
    (guest) => guest.invited === true && guest.rsvp_status !== "confirmed",
  ).length;

  const pendingRsvp = pendingFamilyPersons + pendingIndividuals;

  const totalBudget = budgetList.reduce(
    (sum, item) => sum + Number(item.budget_amount || 0),
    0,
  );

  const totalQuoted = budgetList.reduce(
    (sum, item) => sum + Number(item.quoted_amount || 0),
    0,
  );

  const totalPaid = paymentList.reduce((sum, payment) => {
    if (!payment.budget_item_id && !payment.category_id) {
      return sum;
    }

    return sum + Number(payment.payment_amount || 0);
  }, 0);

  const balanceRemaining = totalBudget - totalPaid;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fffaf5] text-slate-900">
      {/* HERO */}
      <section className="border-b border-[#ead8c5] bg-gradient-to-br from-[#fff8f0] via-[#fffaf6] to-[#f8eee7]">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
          <div className="flex flex-col items-center text-center">
            {/* GANESHA */}
            <div className="relative h-28 w-28 sm:h-32 sm:w-32">
              <Image
                src="/ganesha-logo.svg"
                alt="Lord Ganesha"
                fill
                priority
                className="object-contain drop-shadow-sm"
              />
            </div>

            <p className="mt-3 text-xs font-medium tracking-[0.22em] text-[#a66b37] sm:text-sm">
              ॥ श्री गणेशाय नमः ॥
            </p>

            {/* WEDDING TITLE */}
            <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight text-[#7f2935] sm:text-5xl lg:text-6xl">
              Priyena <span className="italic">weds</span> Khushal
            </h1>

            <p className="mt-3 font-serif text-2xl text-[#9a6635] sm:text-3xl">
              25 January 2027
            </p>

            <div className="mt-4 flex items-center gap-4 text-[#c39358]">
              <span className="h-px w-10 bg-[#d7b17a]" />
              <span>✦</span>
              <span className="h-px w-10 bg-[#d7b17a]" />
            </div>

            <p className="mt-4 max-w-xl font-serif text-base italic leading-relaxed text-slate-600 sm:text-lg">
              May Lord Ganesha remove all obstacles and bless this beautiful new
              journey together.
            </p>

            {/* COUPLE PHOTO — BELOW GANESHA AND WEDDING TITLE */}
            <div className="relative mt-7 h-[280px] w-full max-w-[360px] overflow-hidden rounded-2xl border-4 border-white shadow-lg sm:mt-8 sm:h-[340px] sm:max-w-[400px]">
              <Image
                src="/wedding-couple.jpeg"
                alt="Priyena and Khushal"
                fill
                priority
                className="object-cover object-center"
                sizes="(max-width: 640px) 90vw, 400px"
              />
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        {/* KEY DATES */}
        <section className="rounded-2xl border border-[#eadfd5] bg-white/90 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-[#7f2935]">
                Key Wedding Dates
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Your wedding journey at a glance.
              </p>
            </div>

            <Link
              href="/functions"
              className="text-sm font-semibold text-[#9a3150] hover:underline"
            >
              View All Functions →
            </Link>
          </div>

          {eventList.length === 0 ? (
            <div className="mt-5 rounded-xl bg-[#fff8f3] p-5 text-sm text-slate-500">
              No wedding functions have been added yet.
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-5">
              {eventList.map((event) => {
                const days = event.function_date
                  ? daysUntil(event.function_date)
                  : null;

                return (
                  <Link
                    key={event.id}
                    href={`/functions/${event.id}`}
                    className="rounded-xl border border-[#eee2d8] bg-[#fffaf7] p-4 transition hover:-translate-y-0.5 hover:shadow-sm"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#a66b37]">
                      {event.function_date
                        ? formatDate(event.function_date)
                        : "Date to be decided"}
                    </p>

                    <h3 className="mt-2 font-serif text-xl font-semibold text-slate-900">
                      {event.name}
                    </h3>

                    {event.start_time && (
                      <p className="mt-1 text-sm text-slate-500">
                        {event.start_time.slice(0, 5)}
                      </p>
                    )}

                    {event.venue && (
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {event.venue}
                      </p>
                    )}

                    {days !== null && (
                      <span className="mt-4 inline-block rounded-full bg-[#f9e9e5] px-3 py-1 text-xs font-medium text-[#8d3144]">
                        {days > 0
                          ? `In ${days} days`
                          : days === 0
                            ? "Today"
                            : "Completed"}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* BUDGET */}
        <section className="mt-6 rounded-2xl border border-[#eadfd5] bg-white/90 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-[#7f2935]">
                Wedding Budget
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                A quick view of the wedding finances.
              </p>
            </div>

            <Link
              href="/budget"
              className="text-sm font-semibold text-[#9a3150] hover:underline"
            >
              Manage Budget →
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl bg-[#fff8ed] p-4">
              <p className="text-xs text-slate-500">Total Budgeted</p>
              <p className="mt-2 text-xl font-bold sm:text-2xl">
                {formatCurrency(totalBudget)}
              </p>
            </div>

            <div className="rounded-xl bg-[#f7f4fb] p-4">
              <p className="text-xs text-slate-500">Total Quoted</p>
              <p className="mt-2 text-xl font-bold sm:text-2xl">
                {formatCurrency(totalQuoted)}
              </p>
            </div>

            <div className="rounded-xl bg-[#f3f8f1] p-4">
              <p className="text-xs text-slate-500">Total Paid</p>
              <p className="mt-2 text-xl font-bold sm:text-2xl">
                {formatCurrency(totalPaid)}
              </p>
            </div>

            <div className="rounded-xl bg-[#f3f6fb] p-4">
              <p className="text-xs text-slate-500">Balance Remaining</p>
              <p className="mt-2 text-xl font-bold sm:text-2xl">
                {formatCurrency(balanceRemaining)}
              </p>
            </div>
          </div>
        </section>

        {/* QUICK ACTIONS */}
        <section className="mt-6 rounded-2xl border border-[#eadfd5] bg-white/90 p-5 shadow-sm sm:p-6">
          <h2 className="font-serif text-2xl font-semibold text-[#7f2935]">
            Quick Actions
          </h2>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Link
              href="/guests"
              className="group rounded-xl border border-[#eadfd5] bg-[#fff8f7] p-5 transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <p className="text-lg font-semibold text-slate-900">
                Manage Guests
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Add, edit and track invitations and RSVPs.
              </p>
              <p className="mt-4 text-sm font-semibold text-[#9a3150]">
                Open Guests →
              </p>
            </Link>

            <Link
              href="/functions"
              className="group rounded-xl border border-[#eadfd5] bg-[#fffaf2] p-5 transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <p className="text-lg font-semibold text-slate-900">
                Plan Functions
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Manage all wedding events and their details.
              </p>
              <p className="mt-4 text-sm font-semibold text-[#a66b37]">
                Open Functions →
              </p>
            </Link>

            <Link
              href="/budget"
              className="group rounded-xl border border-[#eadfd5] bg-[#f7faf4] p-5 transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <p className="text-lg font-semibold text-slate-900">
                Manage Budget
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Track budgeted, quoted and paid expenses.
              </p>
              <p className="mt-4 text-sm font-semibold text-[#467052]">
                Open Budget →
              </p>
            </Link>
          </div>
        </section>

        {/* BLESSING */}
        <section className="mt-6 rounded-2xl border border-[#ecd9ce] bg-gradient-to-r from-[#fff5ef] to-[#fffaf7] px-5 py-8 text-center sm:px-8">
          <p className="font-serif text-lg italic text-[#8d4b52] sm:text-xl">
            “With Bappa&apos;s blessings, everything falls into place.”
          </p>

          <div className="mt-4 text-[#c39358]">✦</div>
        </section>
      </div>
    </main>
  );
}
