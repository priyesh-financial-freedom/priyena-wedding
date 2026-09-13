"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import AddBudgetItemModal from "./AddBudgetItemModal";

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
  item: BudgetItem;
  events: MasterOption[];
  categories: MasterOption[];
};

export default function BudgetItemActions({
  item,
  events,
  categories,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${item.description}" from the budget? This cannot be undone.`
    );

    if (!confirmed) return;

    setDeleting(true);

    const { error } = await supabase
      .from("budget_items")
      .delete()
      .eq("id", item.id);

    if (error) {
      window.alert(`Unable to delete budget item: ${error.message}`);
      setDeleting(false);
      return;
    }

    router.refresh();
  }

  return (
    <>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Edit
        </button>

        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>

      {editing && (
        <AddBudgetItemModal
          events={events}
          categories={categories}
          item={item}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}
