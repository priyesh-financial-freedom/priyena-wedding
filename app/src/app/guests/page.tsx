"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import AddGuestModal from "./AddGuestModal";

type Family = {
  id: string;
  family_name: string;
  invited: boolean;
  rsvp_status: string;
  notes: string | null;
  guest_count: number;
  guest_owner_id: string;
  wedding_id: string;
};

type IndividualGuest = {
  id: string;
  full_name: string;
  invited: boolean;
  rsvp_status: string;
  notes: string | null;
  guest_owner_id: string | null;
  wedding_id: string;
  guest_family_id: string | null;
};

type FamilyMember = {
  id: string;
  name: string;
};

export default function GuestsPage() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [individualGuests, setIndividualGuests] = useState<IndividualGuest[]>(
    []
  );
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [refreshGuests, setRefreshGuests] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddGuest, setShowAddGuest] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const [weddingResult, familiesResult, membersResult, individualsResult] =
        await Promise.all([
          supabase
            .from("weddings")
            .select("id")
            .eq("name", "Priyena Wedding")
            .limit(1)
            .maybeSingle(),

          supabase
            .from("guest_families")
            .select("*")
            .order("created_at", { ascending: true }),

          supabase
            .from("family_members")
            .select("id, name")
            .eq("active", true)
            .order("display_order", { ascending: true }),

          supabase
            .from("guests")
            .select("*")
            .is("guest_family_id", null)
            .order("created_at", { ascending: true }),
        ]);

      if (weddingResult.error) {
        console.error("Error loading wedding:", weddingResult.error);
      }

      setWeddingId(weddingResult.data?.id ?? null);

      if (familiesResult.error) {
        console.error("Error loading families:", familiesResult.error);
      }

      if (membersResult.error) {
        console.error("Error loading family members:", membersResult.error);
      }

      if (individualsResult.error) {
        console.error(
          "Error loading individual guests:",
          individualsResult.error
        );
      }

      setFamilies(familiesResult.data ?? []);
      setFamilyMembers(membersResult.data ?? []);
      setIndividualGuests(individualsResult.data ?? []);
      setLoading(false);
    }

    loadData();
  }, [refreshGuests]);

  const ownerMap = useMemo(() => {
    const map = new Map<string, string>();

    familyMembers.forEach((member) => {
      map.set(member.id, member.name);
    });

    return map;
  }, [familyMembers]);

  const filteredFamilies = useMemo(() => {
    const query = search.trim().toLowerCase();

    return families.filter((family) => {
      const ownerName = ownerMap.get(family.guest_owner_id) ?? "";

      const matchesSearch =
        !query ||
        family.family_name.toLowerCase().includes(query) ||
        ownerName.toLowerCase().includes(query);

      let matchesFilter = true;

      if (filter === "pending") {
        matchesFilter = family.rsvp_status === "pending";
      }

      if (filter === "priyesh") {
        matchesFilter = ownerName === "Priyesh";
      }

      if (filter === "shobhana") {
        matchesFilter = ownerName === "Shobhana";
      }

      if (filter === "priyena") {
        matchesFilter = ownerName === "Priyena";
      }

      if (filter === "shobhit") {
        matchesFilter = ownerName === "Shobhit";
      }

      return matchesSearch && matchesFilter;
    });
  }, [families, ownerMap, search, filter]);

  const filteredIndividuals = useMemo(() => {
    const query = search.trim().toLowerCase();

    return individualGuests.filter((guest) => {
      const ownerName = guest.guest_owner_id
        ? ownerMap.get(guest.guest_owner_id) ?? ""
        : "";

      const matchesSearch =
        !query ||
        guest.full_name.toLowerCase().includes(query) ||
        ownerName.toLowerCase().includes(query);

      let matchesFilter = true;

      if (filter === "pending") {
        matchesFilter = guest.rsvp_status === "pending";
      }

      if (filter === "priyesh") {
        matchesFilter = ownerName === "Priyesh";
      }

      if (filter === "shobhana") {
        matchesFilter = ownerName === "Shobhana";
      }

      if (filter === "priyena") {
        matchesFilter = ownerName === "Priyena";
      }

      if (filter === "shobhit") {
        matchesFilter = ownerName === "Shobhit";
      }

      return matchesSearch && matchesFilter;
    });
  }, [individualGuests, ownerMap, search, filter]);

  const totalPersons = useMemo(
    () =>
      filteredFamilies.reduce(
        (total, family) => total + (family.guest_count ?? 0),
        0
      ) + filteredIndividuals.length,
    [filteredFamilies, filteredIndividuals]
  );

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Guest Directory
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage family invitations and individual guests
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddGuest(true)}
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <span className="mr-2 text-lg leading-none">+</span>
            Add Guest
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Family Invitations</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {families.length}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Individual Invitations</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {individualGuests.length}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Persons</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {totalPersons}
            </p>
          </div>

        </div>

        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
          <div className="mb-4">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search family, guest or owner..."
              className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              ["all", "All"],
              ["priyesh", "Priyesh"],
              ["shobhana", "Shobhana"],
              ["priyena", "Priyena"],
              ["shobhit", "Shobhit"],
              ["pending", "Pending RSVP"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  filter === value
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            Loading guests...
          </div>
        ) : (
          <div className="space-y-8">
            {filteredFamilies.length > 0 && (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Family Invitations
                  </h2>
                  <span className="text-sm text-slate-500">
                    {filteredFamilies.length} families
                  </span>
                </div>

                <div className="space-y-4">
                  {filteredFamilies.map((family) => {
                    const ownerName =
                      ownerMap.get(family.guest_owner_id) ?? "Unassigned";

                    return (
                      <Link
                        key={family.id}
                        href={`/guests/${family.id}`}
                        className="block rounded-xl bg-white p-5 shadow-sm transition hover:shadow-md"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-semibold text-slate-900">
                                {family.family_name}
                              </h3>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                              <span>
                                <strong className="font-semibold text-slate-700">
                                  {family.guest_count}
                                </strong>{" "}
                                {family.guest_count === 1
                                  ? "person"
                                  : "persons"}
                              </span>

                              <span>
                                Owner:{" "}
                                <strong className="font-medium text-slate-700">
                                  {ownerName}
                                </strong>
                              </span>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-3">
                            <span
                              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                                family.rsvp_status === "confirmed"
                                  ? "bg-green-100 text-green-700"
                                  : family.rsvp_status === "declined"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {family.rsvp_status === "confirmed"
                                ? "Confirmed"
                                : family.rsvp_status === "declined"
                                  ? "Declined"
                                  : "Pending"}
                            </span>

                            <span className="text-slate-400">→</span>
                          </div>
                        </div>

                        {family.notes && (
                          <div className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-500">
                            {family.notes}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {filteredIndividuals.length > 0 && (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Direct Guests
                  </h2>
                  <span className="text-sm text-slate-500">
                    {filteredIndividuals.length} guests
                  </span>
                </div>

                <div className="space-y-4">
                  {filteredIndividuals.map((guest) => {
                    const ownerName = guest.guest_owner_id
                      ? ownerMap.get(guest.guest_owner_id) ?? "Unassigned"
                      : "Unassigned";

                    return (
                      <div
                        key={guest.id}
                        className="rounded-xl bg-white p-5 shadow-sm"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-semibold text-slate-900">
                                {guest.full_name}
                              </h3>

                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                Individual
                              </span>

                            </div>

                            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                              <span>
                                Owner:{" "}
                                <strong className="font-medium text-slate-700">
                                  {ownerName}
                                </strong>
                              </span>

                              <span>1 person</span>
                            </div>
                          </div>

                          <span
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                              guest.rsvp_status === "confirmed"
                                ? "bg-green-100 text-green-700"
                                : guest.rsvp_status === "declined"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {guest.rsvp_status === "confirmed"
                              ? "Confirmed"
                              : guest.rsvp_status === "declined"
                                ? "Declined"
                                : "Pending"}
                          </span>
                        </div>

                        {guest.notes && (
                          <div className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-500">
                            {guest.notes}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {filteredFamilies.length === 0 &&
              filteredIndividuals.length === 0 && (
                <div className="rounded-xl bg-white p-10 text-center shadow-sm">
                  <p className="font-medium text-slate-700">
                    No guests found
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Try changing your search or filter.
                  </p>
                </div>
              )}
          </div>
        )}
      </div>

      {showAddGuest && (
        <AddGuestModal
          owners={familyMembers}
          weddingId={weddingId}
          onClose={() => setShowAddGuest(false)}
          onSaved={() => setRefreshGuests((value) => value + 1)}
        />
      )}
    </main>
  );
}
