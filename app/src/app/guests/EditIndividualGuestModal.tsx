"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

type Owner = {
  id: string;
  name: string;
};

type Guest = {
  id: string;
  full_name: string;
  rsvp_status: string;
  notes: string | null;
  guest_owner_id: string | null;
};

type Props = {
  guest: Guest;
  owners: Owner[];
  onClose: () => void;
  onSaved: () => void;
};

export default function EditIndividualGuestModal({
  guest,
  owners,
  onClose,
  onSaved,
}: Props) {
  const [fullName, setFullName] = useState(guest.full_name);
  const [ownerId, setOwnerId] = useState(guest.guest_owner_id ?? "");
  const [rsvpStatus, setRsvpStatus] = useState(guest.rsvp_status ?? "pending");
  const [notes, setNotes] = useState(guest.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!fullName.trim()) {
      setError("Please enter the guest name.");
      return;
    }

    setSaving(true);
    setError("");

    const { error: updateError } = await supabase
      .from("guests")
      .update({
        full_name: fullName.trim(),
        guest_owner_id: ownerId || null,
        rsvp_status: rsvpStatus,
        notes: notes.trim() || null,
      })
      .eq("id", guest.id)
      .is("guest_family_id", null);

    if (updateError) {
      console.error("Error updating individual guest:", updateError);
      setError("Could not save the guest. Please try again.");
      setSaving(false);
      return;
    }

    onSaved();
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Edit Individual Guest
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Update guest details
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-slate-400 hover:text-slate-700"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Owner
            </label>
            <select
              value={ownerId}
              onChange={(event) => setOwnerId(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            >
              <option value="">Unassigned</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              RSVP
            </label>
            <select
              value={rsvpStatus}
              onChange={(event) => setRsvpStatus(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="declined">Declined</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Optional notes"
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
