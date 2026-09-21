"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Props = {
  event: {
    id: string;
    name: string;
  };
};

export default function BudgetEventActions({ event }: Props) {
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(event.name);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  function closeEditor() {
    setEditing(false);
    setName(event.name);
    setError("");
  }

  async function handleSave() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Please enter a event name.");
      return;
    }

    if (trimmedName === event.name) {
      closeEditor();
      return;
    }

    setSaving(true);
    setError("");

    const { error: updateError } = await supabase
      .from("wedding_events")
      .update({ name: trimmedName })
      .eq("id", event.id);

    if (updateError) {
      if (updateError.code === "23505") {
        setError("A event with this name already exists.");
      } else {
        setError(updateError.message);
      }

      setSaving(false);
      return;
    }

    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${event.name}"? This is allowed only when no budget items are linked to the event.`,
    );

    if (!confirmed) return;

    setDeleting(true);

    const { count, error: countError } = await supabase
      .from("budget_items")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id);

    if (countError) {
      window.alert(
        `Unable to check linked budget items: ${countError.message}`,
      );
      setDeleting(false);
      return;
    }

    if ((count ?? 0) > 0) {
      window.alert(
        `Cannot delete "${event.name}". ${count} ${
          count === 1 ? "budget item is" : "budget items are"
        } linked to this event. Move or delete those items first.`,
      );
      setDeleting(false);
      return;
    }

    const { error: deleteError } = await supabase
      .from("wedding_events")
      .update({ active: false })
      .eq("id", event.id);

    if (deleteError) {
      window.alert(`Unable to delete event: ${deleteError.message}`);
      setDeleting(false);
      return;
    }

    setDeleting(false);
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
          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Edit Budget Event
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Rename this event throughout the wedding budget.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditor}
                className="text-2xl leading-none text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-6">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Event Name *
                </span>

                <input
                  autoFocus
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void handleSave();
                    }
                  }}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
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
                onClick={closeEditor}
                className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
