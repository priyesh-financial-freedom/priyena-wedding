"use client";

import DateInput from "@/components/DateInput";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function NewHotelPage() {
  const router = useRouter();

  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [hotelName, setHotelName] = useState("");
  const [location, setLocation] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadWedding() {
      const { data, error: weddingError } = await supabase
        .from("weddings")
        .select("id")
        .eq("name", "Priyena Wedding")
        .limit(1)
        .maybeSingle();

      if (weddingError) {
        console.error("Error loading wedding:", weddingError);
        setError("Could not load wedding details.");
        return;
      }

      setWeddingId(data?.id ?? null);
    }

    loadWedding();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hotelName.trim()) {
      setError("Please enter the hotel name.");
      return;
    }

    if (!weddingId) {
      setError("Wedding details could not be found.");
      return;
    }

    if (checkInDate && checkOutDate && checkOutDate < checkInDate) {
      setError("Check-out date cannot be before check-in date.");
      return;
    }

    setSaving(true);
    setError("");

    const { error: insertError } = await supabase
      .from("accommodation_hotels")
      .insert({
        wedding_id: weddingId,
        hotel_name: hotelName.trim(),
        location: location.trim() || null,
        contact_person: contactPerson.trim() || null,
        contact_phone: contactPhone.trim() || null,
        check_in_date: checkInDate || null,
        check_out_date: checkOutDate || null,
        notes: notes.trim() || null,
      });

    if (insertError) {
      console.error("Error adding hotel:", insertError);
      setError("Could not save the hotel. Please try again.");
      setSaving(false);
      return;
    }

    router.push("/accommodation");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#fffaf5] p-6 md:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.push("/accommodation")}
            className="mb-4 text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            ← Back to Accommodation
          </button>

          <h1 className="text-3xl font-bold text-slate-900">Add Hotel</h1>
          <p className="mt-1 text-sm text-slate-500">
            Add a hotel for wedding accommodation.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl bg-white p-6 shadow-sm md:p-8"
        >
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Hotel Name *
              </label>
              <input
                type="text"
                value={hotelName}
                onChange={(event) => setHotelName(event.target.value)}
                placeholder="e.g. Taj Lands End"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                autoFocus
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="e.g. Bandra, Mumbai"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(event) => setContactPerson(event.target.value)}
                  placeholder="e.g. Mr. Sharma"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(event) => setContactPhone(event.target.value)}
                  placeholder="Phone number"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Check-in Date
                </label>
                <DateInput
                  value={checkInDate}
                  onChange={(event) => setCheckInDate(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Check-out Date
                </label>
                <DateInput
                  value={checkOutDate}
                  onChange={(event) => setCheckOutDate(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                placeholder="Optional notes"
                className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>
          </div>

          {error && (
            <p className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="mt-8 flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={() => router.push("/accommodation")}
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
              {saving ? "Saving..." : "Save Hotel"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
