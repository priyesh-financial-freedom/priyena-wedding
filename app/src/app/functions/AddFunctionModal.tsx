"use client";

import DateInput from "@/components/DateInput";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AddFunctionModal() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [functionDate, setFunctionDate] = useState("");
  const [venue, setVenue] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [sequenceNumber, setSequenceNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setError("");

    if (!name.trim()) {
      setError("Function name is required.");
      return;
    }

    setSaving(true);

    const { data: wedding, error: weddingError } = await supabase
      .from("weddings")
      .select("id")
      .eq("name", "Priyena Wedding")
      .limit(1)
      .single();

    if (weddingError || !wedding) {
      setError(weddingError?.message || "Priyena Wedding could not be found.");
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("functions").insert({
      wedding_id: wedding.id,
      name: name.trim(),
      function_date: functionDate || null,
      venue: venue.trim() || null,
      start_time: startTime || null,
      end_time: endTime || null,
      sequence_number: sequenceNumber ? Number(sequenceNumber) : null,
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setName("");
    setFunctionDate("");
    setVenue("");
    setStartTime("");
    setEndTime("");
    setSequenceNumber("");
    setSaving(false);
    setOpen(false);

    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
      >
        + Add Function
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Add Function</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add a wedding function to Priyena Wedding.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-2xl leading-none text-slate-400 hover:text-slate-700"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Function Name *
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mehendi"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Date
                </label>
                <DateInput
                  value={functionDate}
                  onChange={(e) => setFunctionDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
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
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
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
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
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
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
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
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
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
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Function"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
