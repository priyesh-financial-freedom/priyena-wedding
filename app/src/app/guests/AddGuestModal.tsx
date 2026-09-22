"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Owner = {
  id: string;
  name: string;
};

type Props = {
  owners: Owner[];
  weddingId: string | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function AddGuestModal({
  owners,
  weddingId,
  onClose,
  onSaved,
}: Props) {
  const router = useRouter();

  const [mode, setMode] = useState<"choice" | "family" | "individual">(
    "choice",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [familyName, setFamilyName] = useState("");
  const [guestCount, setGuestCount] = useState("1");
  const [ownerId, setOwnerId] = useState(owners[0]?.id ?? "");
  const [rsvpStatus, setRsvpStatus] = useState("pending");
  const [notes, setNotes] = useState("");

  const [individualName, setIndividualName] = useState("");

  function resetAndClose() {
    setError("");
    setMode("choice");
    setFamilyName("");
    setGuestCount("1");
    setOwnerId(owners[0]?.id ?? "");
    setRsvpStatus("pending");
    setNotes("");
    setIndividualName("");
    onClose();
  }

  async function addFamily(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!weddingId) {
      setError("Wedding could not be identified.");
      return;
    }

    if (!familyName.trim()) {
      setError("Family name is required.");
      return;
    }

    if (!ownerId) {
      setError("Please select an owner.");
      return;
    }

    const count = Number(guestCount);

    if (!Number.isInteger(count) || count < 1) {
      setError("Number of persons must be at least 1.");
      return;
    }

    setSaving(true);

    const { error: insertError } = await supabase
      .from("guest_families")
      .insert({
        wedding_id: weddingId,
        guest_owner_id: ownerId,
        family_name: familyName.trim(),
        invited: true,
        rsvp_status: rsvpStatus,
        notes: notes.trim() || null,
        guest_count: count,
      });

    if (insertError) {
      console.error(insertError);
      setError(insertError.message);
      setSaving(false);
      return;
    }

    onSaved();
    router.refresh();
    setSaving(false);
    resetAndClose();
  }

  async function addIndividual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!weddingId) {
      setError("Wedding could not be identified.");
      return;
    }

    if (!individualName.trim()) {
      setError("Guest name is required.");
      return;
    }

    if (!ownerId) {
      setError("Please select an owner.");
      return;
    }

    setSaving(true);

    const { error: insertError } = await supabase.from("guests").insert({
      wedding_id: weddingId,
      guest_family_id: null,
      guest_owner_id: ownerId,
      full_name: individualName.trim(),
      invited: true,
      rsvp_status: rsvpStatus,
      notes: notes.trim() || null,
      age_group: "adult",
      attendance_status: "pending",
    });

    if (insertError) {
      console.error(insertError);
      setError(insertError.message);
      setSaving(false);
      return;
    }

    onSaved();
    router.refresh();
    setSaving(false);
    resetAndClose();
  }

  function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {children}
      </label>
    );
  }

  function inputClass() {
    return "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100";
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          resetAndClose();
        }
      }}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {mode === "choice"
                ? "Add Guest"
                : mode === "family"
                  ? "Add Family"
                  : "Add Individual Guest"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {mode === "choice"
                ? "Choose the type of guest you want to add."
                : mode === "family"
                  ? "Add a family invitation using the family name and number of persons."
                  : "Add one guest directly without creating a family group."}
            </p>
          </div>

          <button
            type="button"
            onClick={resetAndClose}
            className="rounded-lg px-3 py-2 text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ×
          </button>
        </div>

        {mode === "choice" && (
          <div className="grid gap-4 p-6 md:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setError("");
                setMode("family");
              }}
              className="rounded-xl border border-slate-200 p-6 text-left transition hover:border-slate-400 hover:bg-slate-50"
            >
              <div className="text-lg font-semibold text-slate-900">Family</div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Add a family invitation using the family name and total number
                of persons.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setError("");
                setMode("individual");
              }}
              className="rounded-xl border border-slate-200 p-6 text-left transition hover:border-slate-400 hover:bg-slate-50"
            >
              <div className="text-lg font-semibold text-slate-900">
                Individual Guest
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Add one guest directly without creating a family group.
              </p>
            </button>
          </div>
        )}

        {mode !== "choice" && (
          <form
            onSubmit={mode === "family" ? addFamily : addIndividual}
            className="space-y-5 p-6"
          >
            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {mode === "family" ? (
              <>
                <div>
                  <FieldLabel>Family Name *</FieldLabel>
                  <input
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    className={inputClass()}
                    placeholder="e.g. Sharma Family"
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <FieldLabel>Number of Persons *</FieldLabel>
                    <input
                      type="number"
                      min="1"
                      value={guestCount}
                      onChange={(e) => setGuestCount(e.target.value)}
                      className={inputClass()}
                      required
                    />
                  </div>

                  <div>
                    <FieldLabel>Owner *</FieldLabel>
                    <select
                      value={ownerId}
                      onChange={(e) => setOwnerId(e.target.value)}
                      className={inputClass()}
                      required
                    >
                      <option value="">Select owner</option>
                      {owners.map((owner) => (
                        <option key={owner.id} value={owner.id}>
                          {owner.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <FieldLabel>Full Name *</FieldLabel>
                  <input
                    value={individualName}
                    onChange={(e) => setIndividualName(e.target.value)}
                    className={inputClass()}
                    placeholder="e.g. Rahul Mehta"
                    required
                  />
                </div>

                <div>
                  <FieldLabel>Owner *</FieldLabel>
                  <select
                    value={ownerId}
                    onChange={(e) => setOwnerId(e.target.value)}
                    className={inputClass()}
                    required
                  >
                    <option value="">Select owner</option>
                    {owners.map((owner) => (
                      <option key={owner.id} value={owner.id}>
                        {owner.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div>
              <FieldLabel>RSVP</FieldLabel>
              <select
                value={rsvpStatus}
                onChange={(e) => setRsvpStatus(e.target.value)}
                className={inputClass()}
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="declined">Declined</option>
              </select>
            </div>

            <div>
              <FieldLabel>Notes</FieldLabel>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className={inputClass()}
                placeholder="Optional notes"
              />
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setMode("choice");
                }}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                ← Back
              </button>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={resetAndClose}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : mode === "family"
                      ? "Add Family"
                      : "Add Guest"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
