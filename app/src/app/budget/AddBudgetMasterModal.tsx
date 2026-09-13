"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type MasterType = "event" | "category";

type Props = {
  type: MasterType;
};

export default function AddBudgetMasterModal({ type }: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEvent = type === "event";

  function closeModal() {
    setOpen(false);
    setName("");
    setError("");
  }

  async function handleSave() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError(
        isEvent
          ? "Please enter an event name."
          : "Please enter a category name."
      );
      return;
    }

    setSaving(true);
    setError("");

    const { data: wedding, error: weddingError } = await supabase
      .from("weddings")
      .select("id")
      .eq("name", "Priyena Wedding")
      .single();

    if (weddingError || !wedding) {
      setError("Priyena Wedding could not be found.");
      setSaving(false);
      return;
    }

    const table = isEvent ? "wedding_events" : "budget_categories";

    const { data: existingRows, error: orderError } = await supabase
      .from(table)
      .select("display_order")
      .eq("wedding_id", wedding.id)
      .order("display_order", { ascending: false })
      .limit(1);

    if (orderError) {
      setError(orderError.message);
      setSaving(false);
      return;
    }

    const nextOrder =
      existingRows && existingRows.length > 0
        ? Number(existingRows[0].display_order) + 1
        : 1;

    const { error: insertError } = await supabase.from(table).insert({
      wedding_id: wedding.id,
      name: trimmedName,
      display_order: nextOrder,
      active: true,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        setError(
          isEvent
            ? "An event with this name already exists."
            : "A category with this name already exists."
        );
      } else {
        setError(insertError.message);
      }

      setSaving(false);
      return;
    }

    closeModal();
    setSaving(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        + Add {isEvent ? "Event" : "Category"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Add {isEvent ? "Event" : "Budget Category"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {isEvent
                    ? "Add another wedding event to your budget."
                    : "Add another budget category when needed."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="text-2xl leading-none text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-6">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  {isEvent ? "Event Name" : "Category Name"} *
                </span>

                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSave();
                    }
                  }}
                  placeholder={
                    isEvent
                      ? "e.g. Mehendi"
                      : "e.g. Jewellery"
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                />
              </label>

              {error && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t px-6 py-5">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : `Save ${isEvent ? "Event" : "Category"}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
