"use client";

import DateInput from "@/components/DateInput";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type FunctionData = {
  id: string;
  name: string;
  function_date: string | null;
  venue: string | null;
  start_time: string | null;
  end_time: string | null;
  sequence_number: number | null;
};

export default function FunctionActions({
  functionData,
}: {
  functionData: FunctionData;
}) {
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(functionData.name);
  const [functionDate, setFunctionDate] = useState(
    functionData.function_date ?? ""
  );
  const [venue, setVenue] = useState(functionData.venue ?? "");
  const [startTime, setStartTime] = useState(
    functionData.start_time?.slice(0, 5) ?? ""
  );
  const [endTime, setEndTime] = useState(
    functionData.end_time?.slice(0, 5) ?? ""
  );
  const [sequenceNumber, setSequenceNumber] = useState(
    functionData.sequence_number?.toString() ?? ""
  );

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setError("");

    if (!name.trim()) {
      setError("Function name is required.");
      return;
    }

    setSaving(true);

    const { error: updateError } = await supabase
      .from("functions")
      .update({
        name: name.trim(),
        function_date: functionDate || null,
        venue: venue.trim() || null,
        start_time: startTime || null,
        end_time: endTime || null,
        sequence_number: sequenceNumber
          ? Number(sequenceNumber)
          : null,
      })
      .eq("id", functionData.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setEditing(false);

    router.refresh();
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${functionData.name}"?\n\nThis will also remove attendance records for this function. This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setDeleting(true);

    const { error: deleteError } = await supabase
      .from("functions")
      .delete()
      .eq("id", functionData.id);

    if (deleteError) {
      setError(deleteError.message);
      setDeleting(false);
      return;
    }

    router.push("/functions");
    router.refresh();
  }

  if (editing) {
    return (
      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-lg font-semibold text-slate-900">
          Edit Function
        </h2>

        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">
              Function Name *
            </label>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-slate-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Date
            </label>

            <DateInput
              value={functionDate}
              onChange={(e) => setFunctionDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Venue
            </label>

            <input
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="Venue"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Start Time
              </label>

              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                End Time
              </label>

              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Sequence
            </label>

            <input
              type="number"
              min="1"
              value={sequenceNumber}
              onChange={(e) => setSequenceNumber(e.target.value)}
              placeholder="1"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setError("");
                setEditing(false);
              }}
              disabled={saving}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => {
          setError("");
          setEditing(true);
        }}
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        Edit Function
      </button>

      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {deleting ? "Deleting..." : "Delete Function"}
      </button>

      {error && (
        <div className="w-full rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
