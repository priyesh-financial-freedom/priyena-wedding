import { supabase } from "@/lib/supabase";
import AddBudgetItemModal from "./AddBudgetItemModal";
import AddBudgetMasterModal from "./AddBudgetMasterModal";
import BudgetItemActions from "./BudgetItemActions";
import SourceOfFunds from "./SourceOfFunds";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

type BudgetItem = {
  id: string;
  event_id: string;
  category_id: string;
  description: string;
  budget_amount: number;
  quoted_amount: number;
  paid_amount: number;
  vendor_name: string | null;
  notes: string | null;
};

export default async function BudgetPage() {
  const { data: wedding, error: weddingError } = await supabase
    .from("weddings")
    .select("id, name")
    .eq("name", "Priyena Wedding")
    .single();

  if (weddingError || !wedding) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-10">
        <div className="rounded-2xl border bg-white p-6 text-red-600">
          Unable to load wedding budget.
        </div>
      </main>
    );
  }

  const [
    { data: budgetItems },
    { data: events },
    { data: categories },
  ] = await Promise.all([
    supabase
      .from("budget_items")
      .select(
        "id, event_id, category_id, description, budget_amount, quoted_amount, paid_amount, vendor_name, notes"
      )
      .eq("wedding_id", wedding.id)
      .order("created_at", { ascending: true }),

    supabase
      .from("wedding_events")
      .select("id, name, display_order")
      .eq("wedding_id", wedding.id)
      .eq("active", true)
      .order("display_order", { ascending: true }),

    supabase
      .from("budget_categories")
      .select("id, name, display_order")
      .eq("wedding_id", wedding.id)
      .eq("active", true)
      .order("display_order", { ascending: true }),
  ]);

  const items = (budgetItems ?? []) as BudgetItem[];

  const eventOptions = (events ?? []).map((event) => ({
    id: event.id,
    name: event.name,
  }));

  const categoryOptions = (categories ?? []).map((category) => ({
    id: category.id,
    name: category.name,
  }));

  const eventMap = new Map(
    (events ?? []).map((event) => [event.id, event.name])
  );

  const categoryMap = new Map(
    (categories ?? []).map((category) => [category.id, category.name])
  );

  const totalBudget = items.reduce(
    (sum, item) => sum + Number(item.budget_amount || 0),
    0
  );

  const totalQuoted = items.reduce(
    (sum, item) => sum + Number(item.quoted_amount || 0),
    0
  );

  const totalPaid = items.reduce(
    (sum, item) => sum + Number(item.paid_amount || 0),
    0
  );

  const totalBalance = totalBudget - totalPaid;

  const eventSummary = eventOptions.map((event) => {
    const matching = items.filter((item) => item.event_id === event.id);

    const budget = matching.reduce(
      (sum, item) => sum + Number(item.budget_amount || 0),
      0
    );

    const quoted = matching.reduce(
      (sum, item) => sum + Number(item.quoted_amount || 0),
      0
    );

    const paid = matching.reduce(
      (sum, item) => sum + Number(item.paid_amount || 0),
      0
    );

    return {
      ...event,
      budget,
      quoted,
      paid,
      balance: budget - paid,
    };
  }).filter(
    (event) =>
      event.budget !== 0 ||
      event.quoted !== 0 ||
      event.paid !== 0
  );

  const categorySummary = categoryOptions.map((category) => {
    const matching = items.filter(
      (item) => item.category_id === category.id
    );

    const budget = matching.reduce(
      (sum, item) => sum + Number(item.budget_amount || 0),
      0
    );

    const quoted = matching.reduce(
      (sum, item) => sum + Number(item.quoted_amount || 0),
      0
    );

    const paid = matching.reduce(
      (sum, item) => sum + Number(item.paid_amount || 0),
      0
    );

    return {
      ...category,
      budget,
      quoted,
      paid,
      balance: budget - paid,
    };
  }).filter(
    (category) =>
      category.budget !== 0 ||
      category.quoted !== 0 ||
      category.paid !== 0
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Wedding Budget
          </h1>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Plan, track and control the cost of Priyena&apos;s wedding.
          </p>
        </div>

        <AddBudgetItemModal
          events={eventOptions}
          categories={categoryOptions}
        />
      </div>

      {/* KPI CARDS */}
      <section className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-xs font-medium text-slate-500 sm:text-sm">
            Total Budgeted
          </p>
          <p className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
            {formatCurrency(totalBudget)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-xs font-medium text-slate-500 sm:text-sm">
            Total Quoted
          </p>
          <p className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
            {formatCurrency(totalQuoted)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-xs font-medium text-slate-500 sm:text-sm">
            Total Paid
          </p>
          <p className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
            {formatCurrency(totalPaid)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-xs font-medium text-slate-500 sm:text-sm">
            Balance Remaining
          </p>
          <p className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
            {formatCurrency(totalBalance)}
          </p>
        </div>
      </section>

      {/* BUDGET BY EVENT */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
              Budget by Event
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Add an event whenever your wedding plan requires one.
            </p>
          </div>

          <AddBudgetMasterModal type="event" />
        </div>

        {/* MOBILE */}
        <div className="divide-y md:hidden">
          {eventSummary.map((event) => (
            <div key={event.id} className="p-5">
              <p className="font-semibold text-slate-900">{event.name}</p>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Budgeted</p>
                  <p className="mt-1 font-semibold">
                    {formatCurrency(event.budget)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Quoted</p>
                  <p className="mt-1 font-semibold">
                    {formatCurrency(event.quoted)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Paid</p>
                  <p className="mt-1 font-semibold">
                    {formatCurrency(event.paid)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Balance</p>
                  <p className="mt-1 font-semibold">
                    {formatCurrency(event.balance)}
                  </p>
                </div>
              </div>
            </div>
          ))}

          <div className="bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-900">Total</p>
            <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Budgeted</span>
                <p className="font-semibold">
                  {formatCurrency(totalBudget)}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Quoted</span>
                <p className="font-semibold">
                  {formatCurrency(totalQuoted)}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Paid</span>
                <p className="font-semibold">{formatCurrency(totalPaid)}</p>
              </div>
              <div>
                <span className="text-slate-500">Balance</span>
                <p className="font-semibold">
                  {formatCurrency(totalBalance)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* DESKTOP */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-6 py-3 font-medium">Event</th>
                <th className="px-6 py-3 text-right font-medium">Budgeted</th>
                <th className="px-6 py-3 text-right font-medium">Quoted</th>
                <th className="px-6 py-3 text-right font-medium">Paid</th>
                <th className="px-6 py-3 text-right font-medium">Balance</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {eventSummary.map((event) => (
                <tr key={event.id}>
                  <td className="px-6 py-4 font-medium">{event.name}</td>
                  <td className="px-6 py-4 text-right">
                    {formatCurrency(event.budget)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {formatCurrency(event.quoted)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {formatCurrency(event.paid)}
                  </td>
                  <td className="px-6 py-4 text-right font-medium">
                    {formatCurrency(event.balance)}
                  </td>
                </tr>
              ))}
            </tbody>

            <tfoot className="bg-slate-50 font-semibold">
              <tr>
                <td className="px-6 py-4">Total</td>
                <td className="px-6 py-4 text-right">
                  {formatCurrency(totalBudget)}
                </td>
                <td className="px-6 py-4 text-right">
                  {formatCurrency(totalQuoted)}
                </td>
                <td className="px-6 py-4 text-right">
                  {formatCurrency(totalPaid)}
                </td>
                <td className="px-6 py-4 text-right">
                  {formatCurrency(totalBalance)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* BUDGET BY CATEGORY */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
              Budget by Category
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Keep categories broad and add your own when needed.
            </p>
          </div>

          <AddBudgetMasterModal type="category" />
        </div>

        {/* MOBILE */}
        <div className="divide-y md:hidden">
          {categorySummary.map((category) => (
            <div key={category.id} className="p-5">
              <p className="font-semibold text-slate-900">{category.name}</p>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Budgeted</p>
                  <p className="mt-1 font-semibold">
                    {formatCurrency(category.budget)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Quoted</p>
                  <p className="mt-1 font-semibold">
                    {formatCurrency(category.quoted)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Paid</p>
                  <p className="mt-1 font-semibold">
                    {formatCurrency(category.paid)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Balance</p>
                  <p className="mt-1 font-semibold">
                    {formatCurrency(category.balance)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* DESKTOP */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-6 py-3 font-medium">Category</th>
                <th className="px-6 py-3 text-right font-medium">Budgeted</th>
                <th className="px-6 py-3 text-right font-medium">Quoted</th>
                <th className="px-6 py-3 text-right font-medium">Paid</th>
                <th className="px-6 py-3 text-right font-medium">Balance</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {categorySummary.map((category) => (
                <tr key={category.id}>
                  <td className="px-6 py-4 font-medium">{category.name}</td>
                  <td className="px-6 py-4 text-right">
                    {formatCurrency(category.budget)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {formatCurrency(category.quoted)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {formatCurrency(category.paid)}
                  </td>
                  <td className="px-6 py-4 text-right font-medium">
                    {formatCurrency(category.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* BUDGET ITEMS */}
      <SourceOfFunds />

<section className="mt-6 overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
        <div className="border-b px-5 py-5 sm:px-6">
          <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
            Budget Items
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {items.length} {items.length === 1 ? "budget item" : "budget items"}{" "}
            entered.
          </p>
        </div>

        {/* MOBILE CARDS */}
        <div className="divide-y md:hidden">
          {items.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">
              No budget items have been added yet.
            </div>
          ) : (
            items.map((item) => {
              const balance =
                Number(item.budget_amount || 0) -
                Number(item.paid_amount || 0);

              return (
                <div key={item.id} className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="break-words font-semibold text-slate-900">
                        {item.description}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        {eventMap.get(item.event_id) ?? "—"} ·{" "}
                        {categoryMap.get(item.category_id) ?? "—"}
                      </p>

                      {item.vendor_name && (
                        <p className="mt-1 text-sm text-slate-500">
                          Vendor: {item.vendor_name}
                        </p>
                      )}
                    </div>

                    <BudgetItemActions
                      item={item}
                      events={eventOptions}
                      categories={categoryOptions}
                    />
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4">
                    <div>
                      <p className="text-xs text-slate-500">Budgeted</p>
                      <p className="mt-1 font-semibold">
                        {formatCurrency(Number(item.budget_amount || 0))}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Quoted</p>
                      <p className="mt-1 font-semibold">
                        {formatCurrency(Number(item.quoted_amount || 0))}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Paid</p>
                      <p className="mt-1 font-semibold">
                        {formatCurrency(Number(item.paid_amount || 0))}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Balance</p>
                      <p className="mt-1 font-semibold">
                        {formatCurrency(balance)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-6 py-3 font-medium">Description</th>
                <th className="px-6 py-3 font-medium">Event</th>
                <th className="px-6 py-3 font-medium">Category</th>
                <th className="px-6 py-3 text-right font-medium">Budgeted</th>
                <th className="px-6 py-3 text-right font-medium">Quoted</th>
                <th className="px-6 py-3 text-right font-medium">Paid</th>
                <th className="px-6 py-3 text-right font-medium">Balance</th>
                <th className="px-6 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {items.map((item) => {
                const balance =
                  Number(item.budget_amount || 0) -
                  Number(item.paid_amount || 0);

                return (
                  <tr key={item.id}>
                    <td className="max-w-xs px-6 py-4 font-medium">
                      <div className="break-words">{item.description}</div>
                      {item.vendor_name && (
                        <div className="mt-1 text-xs text-slate-500">
                          {item.vendor_name}
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {eventMap.get(item.event_id) ?? "—"}
                    </td>

                    <td className="px-6 py-4">
                      {categoryMap.get(item.category_id) ?? "—"}
                    </td>

                    <td className="px-6 py-4 text-right">
                      {formatCurrency(Number(item.budget_amount || 0))}
                    </td>

                    <td className="px-6 py-4 text-right">
                      {formatCurrency(Number(item.quoted_amount || 0))}
                    </td>

                    <td className="px-6 py-4 text-right">
                      {formatCurrency(Number(item.paid_amount || 0))}
                    </td>

                    <td className="px-6 py-4 text-right font-medium">
                      {formatCurrency(balance)}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <BudgetItemActions
                        item={item}
                        events={eventOptions}
                        categories={categoryOptions}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-6 text-center">
        <a
          href="/"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          Back to Dashboard
        </a>
      </div>
    </main>
  );
}
