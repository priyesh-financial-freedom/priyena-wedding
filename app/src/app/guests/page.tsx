"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import AddGuestModal from "./AddGuestModal";
import EditIndividualGuestModal from "./EditIndividualGuestModal";

type Family = {
  id: string;
  family_name: string;
  invited: boolean;
  rsvp_status: string;
  relationship_category: string;
  notes: string | null;
  guest_count: number;
  guest_owner_id: string;
  wedding_id: string;
  room_required: boolean;
};

type IndividualGuest = {
  id: string;
  full_name: string;
  invited: boolean;
  rsvp_status: string;
  relationship_category: string;
  notes: string | null;
  guest_owner_id: string | null;
  wedding_id: string;
  guest_family_id: string | null;
  room_required: boolean;
};

type FamilyMember = {
  id: string;
  name: string;
};

type SharedRoomOccupant = {
  type: "family" | "guest";
  id: string;
  personsAllocated: number;
};

type SharedRoomGroup = {
  key: string;
  hotelName: string;
  roomNumber: string;
  roomType: string;
  occupants: SharedRoomOccupant[];
};

export default function GuestsPage() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [individualGuests, setIndividualGuests] = useState<IndividualGuest[]>(
    [],
  );
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [allocatedFamilyIds, setAllocatedFamilyIds] = useState<Set<string>>(new Set());
  const [allocatedGuestIds, setAllocatedGuestIds] = useState<Set<string>>(new Set());
  const [sharedRoomGroups, setSharedRoomGroups] = useState<SharedRoomGroup[]>([]);
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [refreshGuests, setRefreshGuests] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [editingIndividual, setEditingIndividual] =
    useState<IndividualGuest | null>(null);
  const [openIndividualMenu, setOpenIndividualMenu] = useState<string | null>(
    null,
  );

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setSharedRoomGroups([]);

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
          individualsResult.error,
        );
      }

      setFamilies(familiesResult.data ?? []);
      setFamilyMembers(membersResult.data ?? []);
      setIndividualGuests(individualsResult.data ?? []);

      // Read active room occupants from the same accommodation records used by the Accommodation module.
      const { data: activeAllocations, error: allocationsError } = await supabase
        .from("accommodation_allocations")
        .select("id, hotel_id, guest_family_id, guest_id")
        .eq("wedding_id", weddingResult.data?.id ?? "")
        .neq("status", "cancelled");

      if (allocationsError) console.error("Error loading accommodation allocations:", allocationsError);
      const allocationIds = (activeAllocations ?? []).map((allocation) => allocation.id);
      let familyIds = new Set<string>();
      let guestIds = new Set<string>();

      if (allocationIds.length > 0) {
        const { data: rooms, error: roomsError } = await supabase
          .from("accommodation_allocation_rooms")
          .select("id, allocation_id, room_number, room_type_id, persons_allocated")
          .in("allocation_id", allocationIds);
        if (roomsError) console.error("Error loading allocated rooms:", roomsError);

        const roomIds = (rooms ?? []).map((room) => room.id);
        let occupants: Array<{
          allocation_room_id: string;
          guest_family_id: string | null;
          guest_id: string | null;
          persons_allocated: number;
        }> = [];

        if (roomIds.length > 0) {
          const { data: occupantRows, error: occupantsError } = await supabase
            .from("accommodation_room_occupants")
            .select("allocation_room_id, guest_family_id, guest_id, persons_allocated")
            .in("allocation_room_id", roomIds);
          if (occupantsError) {
            console.error("Error loading room occupants:", occupantsError);
          } else {
            occupants = occupantRows ?? [];
          }
        }

        const hotelIds = [...new Set((activeAllocations ?? []).map((allocation) => allocation.hotel_id))];
        const roomTypeIds = [...new Set((rooms ?? []).map((room) => room.room_type_id))];
        const [hotelsResult, roomTypesResult] = await Promise.all([
          hotelIds.length
            ? supabase.from("accommodation_hotels").select("id, hotel_name").in("id", hotelIds)
            : Promise.resolve({ data: [], error: null }),
          roomTypeIds.length
            ? supabase.from("accommodation_room_types").select("id, room_type").in("id", roomTypeIds)
            : Promise.resolve({ data: [], error: null }),
        ]);
        if (hotelsResult.error) console.error("Error loading hotel names:", hotelsResult.error);
        if (roomTypesResult.error) console.error("Error loading room types:", roomTypesResult.error);

        const hotelNames = new Map((hotelsResult.data ?? []).map((hotel) => [hotel.id, hotel.hotel_name]));
        const roomTypeNames = new Map((roomTypesResult.data ?? []).map((roomType) => [roomType.id, roomType.room_type]));
        const allocationById = new Map((activeAllocations ?? []).map((allocation) => [allocation.id, allocation]));
        const occupantsByRoom = new Map<string, SharedRoomOccupant[]>();

        (rooms ?? []).forEach((room) => {
          const allocation = allocationById.get(room.allocation_id);
          if (!allocation) return;
          const roomKey = room.room_number
            ? `${allocation.hotel_id}:${room.room_number}`
            : `${allocation.hotel_id}:unmarked:${room.id}`;
          const roomOccupants = occupants.filter((occupant) => occupant.allocation_room_id === room.id);
          const uniqueOccupants = new Map<string, SharedRoomOccupant>();

          roomOccupants.forEach((occupant) => {
            if (occupant.guest_family_id) {
              familyIds.add(occupant.guest_family_id);
              uniqueOccupants.set(`family:${occupant.guest_family_id}`, {
                type: "family",
                id: occupant.guest_family_id,
                personsAllocated: Number(occupant.persons_allocated || 1),
              });
            }
            if (occupant.guest_id) {
              guestIds.add(occupant.guest_id);
              uniqueOccupants.set(`guest:${occupant.guest_id}`, {
                type: "guest",
                id: occupant.guest_id,
                personsAllocated: Number(occupant.persons_allocated || 1),
              });
            }
          });

          // Older allocations may only have the primary guest on the allocation row.
          if (allocation.guest_family_id) {
            familyIds.add(allocation.guest_family_id);
            if (!uniqueOccupants.has(`family:${allocation.guest_family_id}`)) {
              uniqueOccupants.set(`family:${allocation.guest_family_id}`, {
                type: "family",
                id: allocation.guest_family_id,
                personsAllocated: Number(room.persons_allocated || 1),
              });
            }
          }
          if (allocation.guest_id) {
            guestIds.add(allocation.guest_id);
            if (!uniqueOccupants.has(`guest:${allocation.guest_id}`)) {
              uniqueOccupants.set(`guest:${allocation.guest_id}`, {
                type: "guest",
                id: allocation.guest_id,
                personsAllocated: Number(room.persons_allocated || 1),
              });
            }
          }

          const current = occupantsByRoom.get(roomKey) ?? [];
          const merged = new Map(current.map((occupant) => [`${occupant.type}:${occupant.id}`, occupant]));
          uniqueOccupants.forEach((occupant, key) => merged.set(key, occupant));
          occupantsByRoom.set(roomKey, [...merged.values()]);
        });

        const groups: SharedRoomGroup[] = [];
        (rooms ?? []).forEach((room) => {
          const allocation = allocationById.get(room.allocation_id);
          if (!allocation) return;
          const roomKey = room.room_number
            ? `${allocation.hotel_id}:${room.room_number}`
            : `${allocation.hotel_id}:unmarked:${room.id}`;
          const groupOccupants = occupantsByRoom.get(roomKey) ?? [];
          if (groupOccupants.length < 2 || groups.some((group) => group.key === roomKey)) return;
          groups.push({
            key: roomKey,
            hotelName: hotelNames.get(allocation.hotel_id) ?? "Hotel",
            roomNumber: room.room_number ?? "Number not set",
            roomType: roomTypeNames.get(room.room_type_id) ?? "Room",
            occupants: groupOccupants,
          });
        });
        setSharedRoomGroups(groups);
      }

      setAllocatedFamilyIds(familyIds);
      setAllocatedGuestIds(guestIds);
      setLoading(false);
    }

    loadData();
  }, [refreshGuests]);

  async function updateRoomRequirement(type: "family" | "guest", id: string, roomRequired: boolean, openAllocation = false) {
    const table = type === "family" ? "guest_families" : "guests";
    const { error } = await supabase.from(table).update({ room_required: roomRequired }).eq("id", id);
    if (error) {
      console.error("Error updating room requirement:", error);
      window.alert("Could not update accommodation requirement. Please try again.");
      return;
    }
    if (openAllocation && roomRequired) {
      window.location.assign(`/accommodation/allocations?guestType=${type}&guestId=${encodeURIComponent(id)}&returnTo=guests`);
      return;
    }
    setRefreshGuests((value) => value + 1);
  }

  async function deleteIndividualGuest(guest: IndividualGuest) {
    const confirmed = window.confirm(
      `Delete ${guest.full_name}?\n\nThis will permanently remove this individual guest.`,
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("guests")
      .delete()
      .eq("id", guest.id)
      .is("guest_family_id", null);

    if (error) {
      console.error("Error deleting individual guest:", error);
      window.alert("Could not delete the guest. Please try again.");
      return;
    }

    setOpenIndividualMenu(null);
    setRefreshGuests((value) => value + 1);
  }

  const ownerMap = useMemo(() => {
    const map = new Map<string, string>();

    familyMembers.forEach((member) => {
      map.set(member.id, member.name);
    });

    return map;
  }, [familyMembers]);

  const filteredFamilies = useMemo(() => {
    const query = search.trim().toLowerCase();

    return families
      .filter((family) => {
        const ownerName = ownerMap.get(family.guest_owner_id) ?? "";

        const matchesSearch =
          !query ||
          family.family_name.toLowerCase().includes(query) ||
          ownerName.toLowerCase().includes(query);

        let matchesFilter = true;

        if (filter === "pending") {
          matchesFilter = family.rsvp_status === "pending";
        }

        if (["Family", "Friends", "Relatives", "Business Acquaintances", "Others"].includes(filter)) {
          matchesFilter = (family.relationship_category ?? "Others") === filter;
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
      })
      .sort(
        (a, b) =>
          Number(b.rsvp_status === "confirmed") -
          Number(a.rsvp_status === "confirmed"),
      );
  }, [families, ownerMap, search, filter]);

  const filteredIndividuals = useMemo(() => {
    const query = search.trim().toLowerCase();

    return individualGuests
      .filter((guest) => {
        const ownerName = guest.guest_owner_id
          ? (ownerMap.get(guest.guest_owner_id) ?? "")
          : "";

        const matchesSearch =
          !query ||
          guest.full_name.toLowerCase().includes(query) ||
          ownerName.toLowerCase().includes(query);

        let matchesFilter = true;

        if (filter === "pending") {
          matchesFilter = guest.rsvp_status === "pending";
        }

        if (["Family", "Friends", "Relatives", "Business Acquaintances", "Others"].includes(filter)) {
          matchesFilter = (guest.relationship_category ?? "Others") === filter;
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
      })
      .sort(
        (a, b) =>
          Number(b.rsvp_status === "confirmed") -
          Number(a.rsvp_status === "confirmed"),
      );
  }, [individualGuests, ownerMap, search, filter]);

  const visibleSharedRoomGroups = useMemo(() => {
    const matchingFamilyIds = new Set(filteredFamilies.map((family) => family.id));
    const matchingGuestIds = new Set(filteredIndividuals.map((guest) => guest.id));
    return sharedRoomGroups.filter((group) =>
      group.occupants.some((occupant) =>
        occupant.type === "family"
          ? matchingFamilyIds.has(occupant.id)
          : matchingGuestIds.has(occupant.id),
      ),
    );
  }, [sharedRoomGroups, filteredFamilies, filteredIndividuals]);

  const sharedFamilyIds = useMemo(
    () => new Set(visibleSharedRoomGroups.flatMap((group) =>
      group.occupants.filter((occupant) => occupant.type === "family").map((occupant) => occupant.id),
    )),
    [visibleSharedRoomGroups],
  );

  const sharedGuestIds = useMemo(
    () => new Set(visibleSharedRoomGroups.flatMap((group) =>
      group.occupants.filter((occupant) => occupant.type === "guest").map((occupant) => occupant.id),
    )),
    [visibleSharedRoomGroups],
  );

  const visibleFamilies = filteredFamilies.filter((family) => !sharedFamilyIds.has(family.id));
  const visibleIndividuals = filteredIndividuals.filter((guest) => !sharedGuestIds.has(guest.id));

  function sharedOccupantDetails(occupant: SharedRoomOccupant) {
    if (occupant.type === "family") {
      const family = families.find((item) => item.id === occupant.id);
      return family ? {
        name: family.family_name,
        kind: "Family",
        owner: ownerMap.get(family.guest_owner_id) ?? "Unassigned",
        category: family.relationship_category ?? "Others",
        rsvp: family.rsvp_status,
        href: `/guests/${family.id}`,
      } : null;
    }
    const guest = individualGuests.find((item) => item.id === occupant.id);
    return guest ? {
      name: guest.full_name,
      kind: "Individual",
      owner: guest.guest_owner_id ? ownerMap.get(guest.guest_owner_id) ?? "Unassigned" : "Unassigned",
      category: guest.relationship_category ?? "Others",
      rsvp: guest.rsvp_status,
      href: null,
    } : null;
  }

  const guestSummary = useMemo(() => {
    const countPeople = (status: string) =>
      families
        .filter((family) => family.rsvp_status === status)
        .reduce((total, family) => total + (family.guest_count ?? 0), 0) +
      individualGuests.filter((guest) => guest.rsvp_status === status).length;

    return {
      total: families.reduce((total, family) => total + (family.guest_count ?? 0), 0) + individualGuests.length,
      confirmed: countPeople("confirmed"),
      pending: countPeople("pending"),
      declined: countPeople("declined"),
    };
  }, [families, individualGuests]);

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

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Total Guests</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{guestSummary.total}</p>
            <p className="mt-1 text-xs text-slate-400">All invited persons</p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm text-green-700">Confirmed</p>
            <p className="mt-1 text-2xl font-bold text-green-700">{guestSummary.confirmed}</p>
            <p className="mt-1 text-xs text-slate-400">Persons confirmed</p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm text-amber-700">Pending</p>
            <p className="mt-1 text-2xl font-bold text-amber-700">{guestSummary.pending}</p>
            <p className="mt-1 text-xs text-slate-400">Awaiting response</p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm text-red-700">Declined</p>
            <p className="mt-1 text-2xl font-bold text-red-700">{guestSummary.declined}</p>
            <p className="mt-1 text-xs text-slate-400">Persons declined</p>
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
              ["Family", "Family"],
              ["Friends", "Friends"],
              ["Relatives", "Relatives"],
              ["Business Acquaintances", "Business"],
              ["Others", "Others"],
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
            {visibleSharedRoomGroups.length > 0 && (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Shared Rooms</h2>
                  <span className="text-sm text-slate-500">
                    {visibleSharedRoomGroups.length} rooms · {visibleSharedRoomGroups.reduce((total, group) => total + group.occupants.length, 0)} guest entries
                  </span>
                </div>
                <div className="space-y-4">
                  {visibleSharedRoomGroups.map((group) => (
                    <div key={group.key} className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">Room {group.roomNumber}</h3>
                          <p className="mt-1 text-sm text-slate-500">{group.hotelName} · {group.roomType}</p>
                        </div>
                        <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                          {group.occupants.length} families / guests sharing
                        </span>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {group.occupants.map((occupant) => {
                          const details = sharedOccupantDetails(occupant);
                          if (!details) return null;
                          const content = (
                            <div className="rounded-lg bg-slate-50 p-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-semibold text-slate-900">{details.name}</span>
                                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${details.rsvp === "confirmed" ? "bg-green-100 text-green-700" : details.rsvp === "declined" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                                  {details.rsvp === "confirmed" ? "Confirmed" : details.rsvp === "declined" ? "Declined" : "Pending"}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-slate-500">{details.kind} · {occupant.personsAllocated} {occupant.personsAllocated === 1 ? "person" : "persons"}</p>
                              <p className="mt-1 text-xs text-slate-500">Owner: {details.owner} · Category: {details.category}</p>
                              {occupant.type === "guest" && (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    const guest = individualGuests.find((item) => item.id === occupant.id);
                                    if (guest) setEditingIndividual(guest);
                                  }}
                                  className="mt-2 text-xs font-semibold text-blue-700 underline underline-offset-2"
                                >
                                  Edit guest
                                </button>
                              )}
                            </div>
                          );
                          return details.href ? <Link key={`${occupant.type}:${occupant.id}`} href={details.href} className="block">{content}</Link> : <div key={`${occupant.type}:${occupant.id}`}>{content}</div>;
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {visibleFamilies.length > 0 && (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Family Invitations
                  </h2>
                  <span className="text-sm text-slate-500">
                    {visibleFamilies.length} families
                  </span>
                </div>

                <div className="space-y-4">
                  {visibleFamilies.map((family) => {
                    const ownerName =
                      ownerMap.get(family.guest_owner_id) ?? "Unassigned";

                    return (
                      <div key={family.id} className="rounded-xl bg-white shadow-sm transition hover:shadow-md">
                      <Link
                        href={`/guests/${family.id}`}
                        className="block p-5"
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
                              <span>Category: <strong className="font-medium text-slate-700">{family.relationship_category ?? "Others"}</strong></span>
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
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
                        <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${allocatedFamilyIds.has(family.id) ? "bg-green-100 text-green-700" : family.room_required ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                          {allocatedFamilyIds.has(family.id) ? "Room Allocated" : family.room_required ? "Room Not Allocated" : "Room Not Required"}
                        </span>
                        {family.room_required && !allocatedFamilyIds.has(family.id) && (
                          <Link href={`/accommodation/allocations?guestType=family&guestId=${encodeURIComponent(family.id)}&returnTo=guests`} className="text-xs font-semibold text-blue-700 underline underline-offset-2">Allocate Room</Link>
                        )}
                        {!allocatedFamilyIds.has(family.id) && (
                          <button type="button" onClick={() => updateRoomRequirement("family", family.id, !family.room_required, !family.room_required)} className="text-xs font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900">
                            {family.room_required ? "Mark Room Not Required" : "Mark Room Required"}
                          </button>
                        )}
                      </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {visibleIndividuals.length > 0 && (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Direct Guests
                  </h2>
                  <span className="text-sm text-slate-500">
                    {visibleIndividuals.length} guests
                  </span>
                </div>

                <div className="space-y-4">
                  {visibleIndividuals.map((guest) => {
                    const ownerName = guest.guest_owner_id
                      ? (ownerMap.get(guest.guest_owner_id) ?? "Unassigned")
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

                              <span>Category: <strong className="font-medium text-slate-700">{guest.relationship_category ?? "Others"}</strong></span>

                              <span>1 person</span>
                            </div>
                          </div>

                          <div className="relative flex items-center gap-3">
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

                            <button
                              type="button"
                              onClick={() =>
                                setOpenIndividualMenu(
                                  openIndividualMenu === guest.id
                                    ? null
                                    : guest.id,
                                )
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-lg font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                              aria-label={`Actions for ${guest.full_name}`}
                            >
                              ⋮
                            </button>

                            {openIndividualMenu === guest.id && (
                              <div className="absolute right-0 top-11 z-20 w-36 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingIndividual(guest);
                                    setOpenIndividualMenu(null);
                                  }}
                                  className="block w-full px-4 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                                >
                                  Edit Guest
                                </button>

                                <button
                                  type="button"
                                  onClick={() => deleteIndividualGuest(guest)}
                                  className="block w-full px-4 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                                >
                                  Delete Guest
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {guest.notes && (
                          <div className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-500">
                            {guest.notes}
                          </div>
                        )}
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                          <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${allocatedGuestIds.has(guest.id) ? "bg-green-100 text-green-700" : guest.room_required ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                            {allocatedGuestIds.has(guest.id) ? "Room Allocated" : guest.room_required ? "Room Not Allocated" : "Room Not Required"}
                          </span>
                          {guest.room_required && !allocatedGuestIds.has(guest.id) && (
                            <Link href={`/accommodation/allocations?guestType=guest&guestId=${encodeURIComponent(guest.id)}&returnTo=guests`} className="text-xs font-semibold text-blue-700 underline underline-offset-2">Allocate Room</Link>
                          )}
                          {!allocatedGuestIds.has(guest.id) && (
                            <button type="button" onClick={() => updateRoomRequirement("guest", guest.id, !guest.room_required, !guest.room_required)} className="text-xs font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900">
                              {guest.room_required ? "Mark Room Not Required" : "Mark Room Required"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {visibleSharedRoomGroups.length === 0 &&
              visibleFamilies.length === 0 &&
              visibleIndividuals.length === 0 && (
                <div className="rounded-xl bg-white p-10 text-center shadow-sm">
                  <p className="font-medium text-slate-700">No guests found</p>
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

      {editingIndividual && (
        <EditIndividualGuestModal
          guest={editingIndividual}
          owners={familyMembers}
          onClose={() => setEditingIndividual(null)}
          onSaved={() => setRefreshGuests((value) => value + 1)}
        />
      )}
    </main>
  );
}
