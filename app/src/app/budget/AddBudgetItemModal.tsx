"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type MasterOption = {
  id: string;
  name: string;
};

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

type Props = {
  events: MasterOption[];
  categories: MasterOption[];
  item?: BudgetItem | null;
  onClose?: () => void;
};

export default function AddBudgetItemModal({
  events,
  categories,
  item = null,
  onClose,
}: Props) {
  const router = useRouter();
  const isEditing = Boolean(item);

  const [isOpen, setIsOpen] = useState(Boolean(item));

  const [eventId, setEventId] = useState(
    item?.event_id ?? events[0]?.id ?? ""
  );

  const [categoryId, setCategoryId] = useState(
    item?.category_id ?? categories[0]?.id ?? ""
  );

  const [description, setDescription] = useState(
    item?.description ?? ""
  );

  const [budgetAmount, setBudgetAmount] = useState(
    item?.budget_amount != null ? String(item.budget_amount) : ""
  );

  const [quotedAmount, setQuotedAmount] = useState(
    item?.quoted_amount != null ? String(item.quoted_amount) : ""
  );

  const [paidAmount, setPaidAmount] = useState(
    item?.paid_amount != null ? String(item.paid_amount) : ""
  );

  const [vendorName, setVendorName] = useState(
    item?.vendor_name ?? ""
  );

  const [notes, setNotes] = useState(item?.notes ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!item) return;

    setIsOpen(true);
    setEventId(item.event_id);
    setCategoryId(item.category_id);
    setDescription(item.description);
    setBudgetAmount(String(item.budget_amount ?? ""));
    setQuotedAmount(String(item.quoted_amount ?? ""));
    setPaidAmount(String(item.paid_amount ?? ""));
    setVendorName(item.vendor_name ?? "");
    setNotes(item.notes ?? "");
  }, [item]);

  function closeModal() {
    if (saving) return;

    setIsOpen(false);
    setError("");

    if (onClose) {
      onClose();
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");

    if (
      !eventId ||
      !categoryId ||
      !description.trim() ||
      budgetAmount === ""
    ) {
      setError("Please complete all required fields.");
      return;
    }

    const budget = Number(budgetAmount);
    const quoted = Number(quotedAmount || 0);
    const paid = Number(paidAmount || 0);

    if (
      !Number.isFinite(budget) ||
      !Number.isFinite(quoted) ||
      !Number.isFinite(paid)
    ) {
      setError("Please enter valid amounts.");
      return;
    }

    if (budget < 0 || quoted < 0 || paid < 0) {
      setError("Amounts cannot be negative.");
      return;
    }

    setSaving(true);

    try {
      const { data: wedding, error: weddingError } = await supabase
        .from("weddings")
        .select("id")
        .eq("name", "Priyena Wedding")
        .single();

      if (weddingError || !wedding) {
        throw new Error("Priyena Wedding could not be found.");
      }

      if (isEditing && item) {
        const { error: updateError } = await supabase
          .from("budget_items")
          .update({
            event_id: eventId,
            category_id: categoryId,
            description: description.trim(),
            budget_amount: budget,
            quoted_amount: quoted,
            paid_amount: paid,
            vendor_name: vendorName.trim() || null,
            notes: notes.trim() || null,
          })
          .eq("id", item.id);

        if (updateError) {
          throw updateError;
        }
      } else {
        const { error: insertError } = await supabase
          .from("budget_items")
          .insert({
            wedding_id: wedding.id,
            event_id: eventId,
            category_id: categoryId,
            description: description.trim(),
            budget_amount: budget,
            quoted_amount: quoted,
            paid_amount: paid,

            // Keep legacy database fields temporarily.
            // The UI no longer uses these fields.
            committed_amount: 0,
            forecast_amount: budget,

            vendor_name: vendorName.trim() || null,
            notes: notes.trim() || null,
          });

        if (insertError) {
          throw insertError;
        }
      }

      router.refresh();
      closeModal();
    } catch (err: any) {
      setError(err?.message || "Unable to save budget item.");
    } finally {
      setSaving(false);
    }
  }

  /*
   * ADD MODE
   *
   * The modal should NOT be open automatically.
   * Show the normal Add Budget Item button instead.
   */
  if (!isEditing && !isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 sm:w-auto"
      >
        + Add Budget Item
      </button>
    );
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="budget-item-title"
    >
      <div
        className="
          flex
          h-[100dvh]
          w-full
          flex-col
          bg-white
          shadow-2xl
          sm:h-auto
          sm:max-h-[calc(100dvh-2rem)]
          sm:max-w-3xl
          sm:rounded-2xl
        "
      >
        {/* HEADER */}
        <div className="flex shrink-0 items-start justify-between border-b px-5 py-5 sm:px-7 sm:py-6">
          <div className="min-w-0 pr-4">
            <h2
              id="budget-item-title"
              className="text-2xl font-semibold text-slate-900"
            >
              {isEditing ? "Edit Budget Item" : "Add Budget Item"}
            </h2>

            <p className="mt-1 text-sm text-slate-500 sm:text-base">
              {isEditing
                ? "Update the budget, quote or payment details."
                : "Add a lump-sum package or an individual expense."}
            </p>
          </div>

          <button
            type="button"
            onClick={closeModal}
            disabled={saving}
            aria-label="Close"
            className="shrink-0 rounded-lg px-2 text-3xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {/* SCROLLABLE FORM AREA */}
        <form
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          <div className="space-y-6 px-5 py-6 sm:px-7 sm:py-7">

            {/* EVENT + CATEGORY */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-800">
                  Event *
                </label>

                <select
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-300"
                >
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-800">
                  Budget Category *
                </label>

                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-300"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* DESCRIPTION */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-800">
                Expense / Package Description *
              </label>

              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Complete wedding decor package"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-300"
              />
            </div>

            {/* AMOUNTS */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-800">
                  Budgeted Amount *
                </label>

                <div className="flex overflow-hidden rounded-xl border border-slate-300 focus-within:border-slate-500">
                  <span className="flex items-center px-4 text-slate-500">
                    ₹
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                    className="min-w-0 flex-1 border-0 px-2 py-3 text-base outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-800">
                  Quoted Amount
                </label>

                <div className="flex overflow-hidden rounded-xl border border-slate-300 focus-within:border-slate-500">
                  <span className="flex items-center px-4 text-slate-500">
                    ₹
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={quotedAmount}
                    onChange={(e) => setQuotedAmount(e.target.value)}
                    className="min-w-0 flex-1 border-0 px-2 py-3 text-base outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-800">
                  Paid Amount
                </label>

                <div className="flex overflow-hidden rounded-xl border border-slate-300 focus-within:border-slate-500">
                  <span className="flex items-center px-4 text-slate-500">
                    ₹
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="min-w-0 flex-1 border-0 px-2 py-3 text-base outline-none"
                  />
                </div>
              </div>
            </div>

            {/* VENDOR + NOTES */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-800">
                  Vendor
                </label>

                <input
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="Vendor name"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-300"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-800">
                  Notes
                </label>

                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-300"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="sticky bottom-0 border-t bg-white px-5 py-4 sm:px-7">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="w-full rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 sm:w-auto"
              >
                {saving
                  ? "Saving..."
                  : isEditing
                    ? "Save Changes"
                    : "Add Budget Item"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
