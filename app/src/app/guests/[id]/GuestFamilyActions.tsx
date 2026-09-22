"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Owner = {
  id: string;
  name: string;
};

type Family = {
  id: string;
  family_name: string;
  guest_count: number;
  guest_owner_id: string;
  rsvp_status: string;
  notes: string | null;
};

type Props = {
  family: Family;
  owners: Owner[];
};

export default function GuestFamilyActions({ family, owners }: Props) {
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [familyName, setFamilyName] = useState(family.family_name);
  const [guestCount, setGuestCount] = useState(String(family.guest_count ?? 1));
  const [ownerId, setOwnerId] = useState(family.guest_owner_id);
  const [rsvpStatus, setRsvpStatus] = useState(family.rsvp_status);
  const [notes, setNotes] = useState(family.notes ?? "");

  function inputClass() {
    return "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100";
  }

  function labelClass() {
    return "mb-1.5 block text-sm font-medium text-slate-700";
  }

  async function saveFamily(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const count = Number(guestCount);

    if (!familyName.trim()) {
      setError("Family name is required.");
      return;
    }

    if (!Number.isInteger(count) || count < 1) {
      setError("Number of persons must be at least 1.");
      return;
    }

    if (!ownerId) {
      setError("Please select an owner.");
      return;
    }

    setSaving(true);

    const { error: updateError } = await supabase
      .from("guest_families")
      .update({
        family_name: familyName.trim(),
        guest_count: count,
        guest_owner_id: ownerId,
        rsvp_status: rsvpStatus,
        notes: notes.trim() || null,
      })
      .eq("id", family.id);

    if (updateError) {
      console.error(updateError);
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setEditing(false);
    setSaving(false);
    router.refresh();
  }

  async function updateRsvp(status: string) {
    setError("");

    const { error: updateError } = await supabase
      .from("guest_families")
      .update({ rsvp_status: status })
      .eq("id", family.id);

    if (updateError) {
      console.error(updateError);
      setError(updateError.message);
      return;
    }

    router.refresh();
  }

  async function deleteFamily() {
    const confirmed = window.confirm(
      `Delete ${family.family_name}?\n\nThis will permanently delete this family invitation and any guest records associated with it.`,
    );

    if (!confirmed) {
      return;
    }

    setError("");

    const { error: deleteError } = await supabase
      .from("guest_families")
      .delete()
      .eq("id", family.id);

    if (deleteError) {
      console.error(deleteError);
      setError(deleteError.message);
      return;
    }

    router.push("/guests");
    router.refresh();
  }

  if (editing) {
    return (
      <section className="rounded-2xl bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Edit Family</h2>
          <p className="mt-1 text-sm text-slate-500">
            Update the family invitation details.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={saveFamily} className="space-y-5">
          <div>
            <label className={labelClass()}>Family Name *</label>
            <input
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              className={inputClass()}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass()}>Number of Persons *</label>
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
              <label className={labelClass()}>Owner *</label>
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

          <div>
            <label className={labelClass()}>RSVP</label>
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
            <label className={labelClass()}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className={inputClass()}
            />
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError("");
              }}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
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
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm md:p-8">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Family Actions</h2>
        <p className="mt-1 text-sm text-slate-500">
          Manage this family invitation.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-6">
        <p className="mb-2 text-sm font-medium text-slate-700">Change RSVP</p>

        <div className="flex flex-wrap gap-2">
          {[
            ["pending", "Pending"],
            ["confirmed", "Confirmed"],
            ["declined", "Declined"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => updateRsvp(value)}
              className={`rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                family.rsvp_status === value
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-6">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Edit Family
        </button>

        <button
          type="button"
          onClick={deleteFamily}
          className="rounded-lg border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
        >
          Delete Family
        </button>
      </div>
    </section>
  );
}
