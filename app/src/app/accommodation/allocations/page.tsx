"use client";

import DateInput from "@/components/DateInput";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/dateUtils";

type Hotel = {
  id: string;
  hotel_name: string;
};

type RoomType = {
  id: string;
  hotel_id: string;
  room_type: string;
  number_of_rooms: number;
  occupancy_capacity: number;
  rate_per_night: number;
};

type Family = {
  id: string;
  family_name: string;
  guest_count: number;
};

type Guest = {
  id: string;
  full_name: string;
};

type Allocation = {
  id: string;
  guest_family_id: string | null;
  guest_id: string | null;
  hotel_id: string;
  check_in_date: string;
  check_out_date: string;
  status: string;
  notes: string | null;
};

type AllocationRoom = {
  id: string;
  allocation_id: string;
  room_type_id: string;
  room_number: string | null;
  persons_allocated: number;
};

type Occupant = {
  id: string;
  allocation_room_id: string;
  guest_family_id: string | null;
  guest_id: string | null;
  persons_allocated: number;
};

type AllocationDisplay = {
  allocation: Allocation;
  room: AllocationRoom;
  occupants: Occupant[];
};

type NewOccupant = {
  key: string;
  type: "family" | "guest";
  id: string;
  persons: string;
};

function getNextDate(date: string) {
  if (!date) return "";

  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + 1);

  return value.toISOString().split("T")[0];
}

export default function AccommodationAllocationsPage() {
  const router = useRouter();

  const [weddingId, setWeddingId] = useState("");
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [allocations, setAllocations] = useState<AllocationDisplay[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [hotelId, setHotelId] = useState("");
  const [roomTypeId, setRoomTypeId] = useState("");
  const [roomNumber, setRoomNumber] = useState("");

  const [occupants, setOccupants] = useState<NewOccupant[]>([
    {
      key: crypto.randomUUID(),
      type: "family",
      id: "",
      persons: "1",
    },
  ]);

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [status, setStatus] = useState("allocated");
  const [notes, setNotes] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    const { data: wedding, error: weddingError } = await supabase
      .from("weddings")
      .select("id")
      .eq("name", "Priyena Wedding")
      .single();

    if (weddingError || !wedding) {
      setError("Wedding record could not be loaded.");
      setLoading(false);
      return;
    }

    setWeddingId(wedding.id);

    const [
      hotelsResult,
      roomTypesResult,
      familiesResult,
      guestsResult,
      allocationsResult,
    ] = await Promise.all([
      supabase
        .from("accommodation_hotels")
        .select("id, hotel_name")
        .eq("wedding_id", wedding.id)
        .order("hotel_name"),

      supabase
        .from("accommodation_room_types")
        .select(
          "id, hotel_id, room_type, number_of_rooms, occupancy_capacity, rate_per_night"
        )
        .order("room_type"),

      supabase
        .from("guest_families")
        .select("id, family_name, guest_count")
        .eq("wedding_id", wedding.id)
        .order("family_name"),

      supabase
        .from("guests")
        .select("id, full_name")
        .eq("wedding_id", wedding.id)
        .is("guest_family_id", null)
        .order("full_name"),

      supabase
        .from("accommodation_allocations")
        .select(
          "id, guest_family_id, guest_id, hotel_id, check_in_date, check_out_date, status, notes"
        )
        .eq("wedding_id", wedding.id)
        .neq("status", "cancelled")
        .order("check_in_date"),
    ]);

    if (hotelsResult.error) setError(hotelsResult.error.message);
    if (roomTypesResult.error) setError(roomTypesResult.error.message);
    if (familiesResult.error) setError(familiesResult.error.message);
    if (guestsResult.error) setError(guestsResult.error.message);
    if (allocationsResult.error) setError(allocationsResult.error.message);

    setHotels(hotelsResult.data || []);
    setRoomTypes(roomTypesResult.data || []);
    setFamilies(familiesResult.data || []);
    setGuests(guestsResult.data || []);

    const allocationData = allocationsResult.data || [];

    if (allocationData.length === 0) {
      setAllocations([]);
      setLoading(false);
      return;
    }

    const allocationIds = allocationData.map((item) => item.id);

    const { data: rooms, error: roomsError } = await supabase
      .from("accommodation_allocation_rooms")
      .select(
        "id, allocation_id, room_type_id, room_number, persons_allocated"
      )
      .in("allocation_id", allocationIds);

    if (roomsError) {
      setError(roomsError.message);
      setLoading(false);
      return;
    }

    const roomIds = (rooms || []).map((room) => room.id);

    let occupantsData: Occupant[] = [];

    if (roomIds.length > 0) {
      const { data: occupantRows, error: occupantsError } = await supabase
        .from("accommodation_room_occupants")
        .select(
          "id, allocation_room_id, guest_family_id, guest_id, persons_allocated"
        )
        .in("allocation_room_id", roomIds);

      if (occupantsError) {
        setError(occupantsError.message);
      } else {
        occupantsData = occupantRows || [];
      }
    }

    const displayRows: AllocationDisplay[] = [];

    for (const allocation of allocationData) {
      const allocationRooms = (rooms || []).filter(
        (room) => room.allocation_id === allocation.id
      );

      for (const room of allocationRooms) {
        displayRows.push({
          allocation,
          room,
          occupants: occupantsData.filter(
            (occupant) => occupant.allocation_room_id === room.id
          ),
        });
      }
    }

    setAllocations(displayRows);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const selectedRoomType = roomTypes.find((room) => room.id === roomTypeId);

  const selectedHotelRoomTypes = useMemo(
    () => roomTypes.filter((room) => room.hotel_id === hotelId),
    [roomTypes, hotelId]
  );

  const occupancyTotal = occupants.reduce(
    (sum, occupant) => sum + Number(occupant.persons || 0),
    0
  );

  const capacity = selectedRoomType?.occupancy_capacity || 0;
  const remainingCapacity = Math.max(0, capacity - occupancyTotal);

  const allocatedFamilyIds = useMemo(
    () =>
      new Set(
        allocations
          .flatMap((row) =>
            row.occupants
              .map((occupant) => occupant.guest_family_id)
              .filter(Boolean)
          ) as string[]
      ),
    [allocations]
  );

  const allocatedGuestIds = useMemo(
    () =>
      new Set(
        allocations
          .flatMap((row) =>
            row.occupants
              .map((occupant) => occupant.guest_id)
              .filter(Boolean)
          ) as string[]
      ),
    [allocations]
  );

  const usedRoomCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const row of allocations) {
      const activeOccupants = row.occupants.reduce(
        (sum, occupant) => sum + Number(occupant.persons_allocated || 0),
        0
      );

      if (activeOccupants > 0) {
        counts[row.room.room_type_id] =
          (counts[row.room.room_type_id] || 0) + 1;
      }
    }

    return counts;
  }, [allocations]);

  const allocatedPersons = allocations.reduce(
    (sum, row) =>
      sum +
      row.occupants.reduce(
        (occupantSum, occupant) =>
          occupantSum + Number(occupant.persons_allocated || 0),
        0
      ),
    0
  );

  const totalRooms = roomTypes.reduce(
    (sum, room) => sum + Number(room.number_of_rooms || 0),
    0
  );

  const totalCapacity = roomTypes.reduce(
    (sum, room) =>
      sum +
      Number(room.number_of_rooms || 0) *
        Number(room.occupancy_capacity || 0),
    0
  );

  function addOccupant() {
    setOccupants((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        type: "family",
        id: "",
        persons: "1",
      },
    ]);
  }

  function removeOccupant(key: string) {
    setOccupants((current) => {
      if (current.length === 1) return current;
      return current.filter((occupant) => occupant.key !== key);
    });
  }

  function updateOccupant(
    key: string,
    changes: Partial<NewOccupant>
  ) {
    setOccupants((current) =>
      current.map((occupant) =>
        occupant.key === key ? { ...occupant, ...changes } : occupant
      )
    );
  }

  async function createAllocation() {
    setError("");

    if (!weddingId || !hotelId || !roomTypeId) {
      setError("Please select a hotel and room type.");
      return;
    }

    if (!roomNumber.trim()) {
      setError(
        "Please enter a room number. A physical room needs a room number so occupants can share it."
      );
      return;
    }

    if (!checkIn || !checkOut) {
      setError("Please enter check-in and check-out dates.");
      return;
    }

    if (checkOut <= checkIn) {
      setError("Check-out date must be after check-in date.");
      return;
    }

    if (occupants.length === 0) {
      setError("Please add at least one occupant.");
      return;
    }

    const cleanedOccupants = occupants.map((occupant) => ({
      ...occupant,
      personsNumber: Number(occupant.persons),
    }));

    for (const occupant of cleanedOccupants) {
      if (!occupant.id) {
        setError("Please select every occupant.");
        return;
      }

      if (
        !Number.isInteger(occupant.personsNumber) ||
        occupant.personsNumber <= 0
      ) {
        setError("Persons allocated must be a positive whole number.");
        return;
      }

      if (
        occupant.type === "family" &&
        occupant.personsNumber >
          (families.find((family) => family.id === occupant.id)
            ?.guest_count || 0)
      ) {
        setError(
          "A family cannot have more persons allocated than its registered guest count."
        );
        return;
      }
    }

    const duplicateKeys = new Set<string>();

    for (const occupant of cleanedOccupants) {
      const key = `${occupant.type}:${occupant.id}`;

      if (duplicateKeys.has(key)) {
        setError("The same family or guest cannot be added twice to one room.");
        return;
      }

      duplicateKeys.add(key);
    }

    if (selectedRoomType && occupancyTotal > capacity) {
      setError(
        `This room has capacity for ${capacity} persons, but you have allocated ${occupancyTotal}.`
      );
      return;
    }

    const usedRooms = usedRoomCounts[roomTypeId] || 0;

    if (selectedRoomType && usedRooms >= selectedRoomType.number_of_rooms) {
      setError("All rooms of this room type are already allocated.");
      return;
    }

    setSaving(true);

    const { data: allocation, error: allocationError } = await supabase
      .from("accommodation_allocations")
      .insert({
        wedding_id: weddingId,
        hotel_id: hotelId,
        check_in_date: checkIn,
        check_out_date: checkOut,
        status,
        notes: notes.trim() || null,
        guest_family_id:
          cleanedOccupants.length === 1 &&
          cleanedOccupants[0].type === "family"
            ? cleanedOccupants[0].id
            : null,
        guest_id:
          cleanedOccupants.length === 1 &&
          cleanedOccupants[0].type === "guest"
            ? cleanedOccupants[0].id
            : null,
      })
      .select("id")
      .single();

    if (allocationError || !allocation) {
      setError(
        allocationError?.message || "Could not create room allocation."
      );
      setSaving(false);
      return;
    }

    const { data: allocationRoom, error: roomError } = await supabase
      .from("accommodation_allocation_rooms")
      .insert({
        allocation_id: allocation.id,
        room_type_id: roomTypeId,
        room_number: roomNumber.trim(),
        persons_allocated: occupancyTotal,
      })
      .select("id")
      .single();

    if (roomError || !allocationRoom) {
      await supabase
        .from("accommodation_allocations")
        .delete()
        .eq("id", allocation.id);

      setError(roomError?.message || "Could not create room record.");
      setSaving(false);
      return;
    }

    const occupantRows = cleanedOccupants.map((occupant) => ({
      allocation_room_id: allocationRoom.id,
      guest_family_id:
        occupant.type === "family" ? occupant.id : null,
      guest_id: occupant.type === "guest" ? occupant.id : null,
      persons_allocated: occupant.personsNumber,
    }));

    const { error: occupantsError } = await supabase
      .from("accommodation_room_occupants")
      .insert(occupantRows);

    if (occupantsError) {
      await supabase
        .from("accommodation_allocation_rooms")
        .delete()
        .eq("id", allocationRoom.id);

      await supabase
        .from("accommodation_allocations")
        .delete()
        .eq("id", allocation.id);

      setError(occupantsError.message);
      setSaving(false);
      return;
    }

    setHotelId("");
    setRoomTypeId("");
    setRoomNumber("");
    setOccupants([
      {
        key: crypto.randomUUID(),
        type: "family",
        id: "",
        persons: "1",
      },
    ]);
    setCheckIn("");
    setCheckOut("");
    setStatus("allocated");
    setNotes("");

    await loadData();
    setSaving(false);
  }

  async function cancelAllocation(id: string) {
    if (!confirm("Cancel this room allocation?")) return;

    const { error: updateError } = await supabase
      .from("accommodation_allocations")
      .update({ status: "cancelled" })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await loadData();
  }

  function occupantName(occupant: Occupant) {
    if (occupant.guest_family_id) {
      return (
        families.find((family) => family.id === occupant.guest_family_id)
          ?.family_name || "Family"
      );
    }

    return (
      guests.find((guest) => guest.id === occupant.guest_id)?.full_name ||
      "Guest"
    );
  }

  function roomTypeName(roomTypeIdValue: string) {
    return (
      roomTypes.find((room) => room.id === roomTypeIdValue)?.room_type ||
      "Room"
    );
  }

  function hotelName(hotelIdValue: string) {
    return (
      hotels.find((hotel) => hotel.id === hotelIdValue)?.hotel_name ||
      "Hotel"
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fffaf6] px-6 py-12">
        <div className="mx-auto max-w-7xl text-sm text-slate-500">
          Loading room allocations...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fffaf6] px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <button
          onClick={() => router.push("/accommodation")}
          className="mb-6 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Back to Accommodation
        </button>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Room Allocation
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Allocate multiple families or individual guests to the same
              physical room.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total Rooms</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {totalRooms}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Allocated Rooms</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {allocations.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Persons Accommodated</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {allocatedPersons}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total Capacity</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {totalCapacity}
            </p>
          </div>
        </div>

        <details className="mb-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                New Room Allocation
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Select a physical room and add one or more occupants.
              </p>
            </div>

            <span className="ml-4 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">
              + New Allocation
            </span>
          </summary>

          <div className="border-t border-slate-100 px-6 pb-6 pt-6">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Hotel
                </label>

                <select
                  value={hotelId}
                  onChange={(event) => {
                    setHotelId(event.target.value);
                    setRoomTypeId("");
                  }}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                >
                  <option value="">Select hotel</option>
                  {hotels.map((hotel) => (
                    <option key={hotel.id} value={hotel.id}>
                      {hotel.hotel_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Room Type
                </label>

                <select
                  value={roomTypeId}
                  onChange={(event) => setRoomTypeId(event.target.value)}
                  disabled={!hotelId}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm disabled:bg-slate-50"
                >
                  <option value="">Select room type</option>

                  {selectedHotelRoomTypes.map((room) => {
                    const used = usedRoomCounts[room.id] || 0;
                    const available = Math.max(
                      0,
                      room.number_of_rooms - used
                    );

                    return (
                      <option
                        key={room.id}
                        value={room.id}
                        disabled={available === 0}
                      >
                        {room.room_type} — {available} rooms available —
                        capacity {room.occupancy_capacity}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Room Number
                </label>

                <input
                  type="text"
                  value={roomNumber}
                  onChange={(event) => setRoomNumber(event.target.value)}
                  placeholder="e.g. 201"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                />

                <p className="mt-1 text-xs text-slate-500">
                  Required so multiple occupants can share the same physical
                  room.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Room Capacity
                </label>

                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
                  {selectedRoomType
                    ? `${selectedRoomType.occupancy_capacity} persons`
                    : "Select a room type"}
                </div>
              </div>
            </div>

            <div className="mt-7 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">Occupants</h3>
                  <p className="text-xs text-slate-500">
                    Multiple families and/or individual guests can share this
                    room.
                  </p>
                </div>

                <div className="text-sm font-semibold text-slate-900">
                  Occupancy: {occupancyTotal} / {capacity || "—"}
                </div>
              </div>

              <div className="space-y-3">
                {occupants.map((occupant, index) => {
                  const availableFamilies = families.filter(
                    (family) =>
                      !allocatedFamilyIds.has(family.id) ||
                      family.id === occupant.id
                  );

                  const availableGuests = guests.filter(
                    (guest) =>
                      !allocatedGuestIds.has(guest.id) ||
                      guest.id === occupant.id
                  );

                  return (
                    <div
                      key={occupant.key}
                      className="rounded-xl border border-slate-200 bg-white p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-700">
                          Occupant {index + 1}
                        </p>

                        {occupants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeOccupant(occupant.key)}
                            className="text-xs font-medium text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <select
                          value={occupant.type}
                          onChange={(event) =>
                            updateOccupant(occupant.key, {
                              type: event.target.value as "family" | "guest",
                              id: "",
                              persons: "1",
                            })
                          }
                          className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                        >
                          <option value="family">Family</option>
                          <option value="guest">Individual Guest</option>
                        </select>

                        <select
                          value={occupant.id}
                          onChange={(event) => {
                            const value = event.target.value;

                            if (occupant.type === "family") {
                              const family = families.find(
                                (item) => item.id === value
                              );

                              updateOccupant(occupant.key, {
                                id: value,
                                persons: family
                                  ? String(family.guest_count)
                                  : "1",
                              });
                            } else {
                              updateOccupant(occupant.key, {
                                id: value,
                                persons: "1",
                              });
                            }
                          }}
                          className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                        >
                          <option value="">
                            Select{" "}
                            {occupant.type === "family"
                              ? "family"
                              : "guest"}
                          </option>

                          {occupant.type === "family"
                            ? availableFamilies.map((family) => (
                                <option key={family.id} value={family.id}>
                                  {family.family_name} —{" "}
                                  {family.guest_count} persons
                                </option>
                              ))
                            : availableGuests.map((guest) => (
                                <option key={guest.id} value={guest.id}>
                                  {guest.full_name}
                                </option>
                              ))}
                        </select>

                        <input
                          type="number"
                          min="1"
                          value={occupant.persons}
                          onChange={(event) =>
                            updateOccupant(occupant.key, {
                              persons: event.target.value,
                            })
                          }
                          className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                          placeholder="Persons"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={addOccupant}
                  disabled={
                    !selectedRoomType || occupancyTotal >= capacity
                  }
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  + Add Another Occupant
                </button>

                <div
                  className={`text-sm font-semibold ${
                    remainingCapacity === 0 && capacity > 0
                      ? "text-emerald-600"
                      : "text-slate-600"
                  }`}
                >
                  {capacity > 0
                    ? remainingCapacity === 0
                      ? "Room is full"
                      : `${remainingCapacity} person${
                          remainingCapacity === 1 ? "" : "s"
                        } remaining`
                    : "Select a room type"}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Check-in
                </label>

                <DateInput
                  value={checkIn}
                  onChange={(event) => {
                    const value = event.target.value;
                    setCheckIn(value);

                    if (!checkOut || checkOut <= value) {
                      setCheckOut(getNextDate(value));
                    }
                  }}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Check-out
                </label>

                <DateInput
                  value={checkOut}
                  min={checkIn ? getNextDate(checkIn) : undefined}
                  onChange={(event) => setCheckOut(event.target.value)}
                  disabled={!checkIn}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Status
                </label>

                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                >
                  <option value="allocated">Allocated</option>
                  <option value="checked_in">Checked In</option>
                  <option value="checked_out">Checked Out</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Notes
                </label>

                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  placeholder="Any rooming or guest notes"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={createAllocation}
                disabled={saving}
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving..." : "Allocate Room"}
              </button>
            </div>
          </div>
        </details>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">
              Current Room Allocations
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Physical rooms and everyone staying in each room.
            </p>
          </div>

          {allocations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-6 py-10 text-center text-sm text-slate-500">
              No room allocations yet.
            </div>
          ) : (
            <div className="space-y-4">
              {allocations.map((row) => {
                const roomOccupancy = row.occupants.reduce(
                  (sum, occupant) =>
                    sum + Number(occupant.persons_allocated || 0),
                  0
                );

                const roomCapacity =
                  roomTypes.find(
                    (room) => room.id === row.room.room_type_id
                  )?.occupancy_capacity || 0;

                return (
                  <div
                    key={row.room.id}
                    className="rounded-xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-900">
                            Room {row.room.room_number || "TBD"}
                          </h3>

                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                            {roomTypeName(row.room.room_type_id)}
                          </span>

                          <span className="rounded-full bg-[#fff3ed] px-2.5 py-1 text-xs font-medium text-[#8b3a2f]">
                            {row.allocation.status.replace("_", " ")}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-slate-500">
                          {hotelName(row.allocation.hotel_id)}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {formatDate(row.allocation.check_in_date)} →{" "}
                          {formatDate(row.allocation.check_out_date)}
                        </p>
                      </div>

                      <div className="text-left lg:text-right">
                        <p className="text-sm font-semibold text-slate-900">
                          Occupancy {roomOccupancy} / {roomCapacity}
                        </p>

                        <p className="text-xs text-slate-500">
                          {Math.max(0, roomCapacity - roomOccupancy)}{" "}
                          remaining
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 border-t border-slate-100 pt-4">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Occupants
                      </p>

                      {row.occupants.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          No occupants recorded.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {row.occupants.map((occupant) => (
                            <div
                              key={occupant.id}
                              className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-800">
                                  {occupantName(occupant)}
                                </span>

                                <span className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-slate-500">
                                  {occupant.guest_family_id
                                    ? "Family"
                                    : "Individual"}
                                </span>
                              </div>

                              <span className="text-sm font-semibold text-slate-700">
                                {occupant.persons_allocated}{" "}
                                {occupant.persons_allocated === 1
                                  ? "person"
                                  : "persons"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          cancelAllocation(row.allocation.id)
                        }
                        className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Cancel Allocation
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
