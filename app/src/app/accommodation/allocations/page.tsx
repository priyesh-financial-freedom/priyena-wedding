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
  room_number_start: number | null;
  room_number_end: number | null;
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
  const [guestContext, setGuestContext] = useState<{type: "family" | "guest"; id: string} | null>(null);

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
  const [selectedExistingRoomId, setSelectedExistingRoomId] = useState<string | null>(null);

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
          "id, hotel_id, room_type, number_of_rooms, occupancy_capacity, rate_per_night, room_number_start, room_number_end",
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
          "id, guest_family_id, guest_id, hotel_id, check_in_date, check_out_date, status, notes",
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
      .select("id, allocation_id, room_type_id, room_number, persons_allocated")
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
          "id, allocation_room_id, guest_family_id, guest_id, persons_allocated",
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
        (room) => room.allocation_id === allocation.id,
      );

      for (const room of allocationRooms) {
        displayRows.push({
          allocation,
          room,
          occupants: occupantsData.filter(
            (occupant) => occupant.allocation_room_id === room.id,
          ),
        });
      }
    }

    setAllocations(displayRows);
    setLoading(false);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get("guestType");
    const id = params.get("guestId");
    if ((type === "family" || type === "guest") && id && params.get("returnTo") === "guests") {
      setGuestContext({type, id});
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!guestContext || loading) return;
    const family = guestContext.type === "family" ? families.find((item) => item.id === guestContext.id) : null;
    const guest = guestContext.type === "guest" ? guests.find((item) => item.id === guestContext.id) : null;
    if (!family && !guest) {
      setError("The selected guest could not be found. Return to the Guest Directory and try again.");
      return;
    }
    setOccupants([{
      key: crypto.randomUUID(),
      type: guestContext.type,
      id: guestContext.id,
      persons: family ? String(family.guest_count) : "1",
    }]);
  }, [guestContext, loading === false]);

  const contextGuestName = guestContext
    ? guestContext.type === "family"
      ? families.find((family) => family.id === guestContext.id)?.family_name
      : guests.find((guest) => guest.id === guestContext.id)?.full_name
    : null;

  const selectedRoomType = roomTypes.find((room) => room.id === roomTypeId);

  const selectedHotelRoomTypes = useMemo(
    () => roomTypes.filter((room) => room.hotel_id === hotelId),
    [roomTypes, hotelId],
  );

  const occupancyTotal = occupants.reduce(
    (sum, occupant) => sum + Number(occupant.persons || 0),
    0,
  );

  const capacity = selectedRoomType?.occupancy_capacity || 0;
  const remainingCapacity = Math.max(0, capacity - occupancyTotal);

  const allocatedFamilyIds = useMemo(
    () =>
      new Set(
        allocations.flatMap((row) =>
          row.occupants
            .map((occupant) => occupant.guest_family_id)
            .filter(Boolean),
        ) as string[],
      ),
    [allocations],
  );

  const allocatedGuestIds = useMemo(
    () =>
      new Set(
        allocations.flatMap((row) =>
          row.occupants.map((occupant) => occupant.guest_id).filter(Boolean),
        ) as string[],
      ),
    [allocations],
  );

  const usedRoomCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const row of allocations) {
      const activeOccupants = row.occupants.reduce(
        (sum, occupant) => sum + Number(occupant.persons_allocated || 0),
        0,
      );

      if (activeOccupants > 0) {
        counts[row.room.room_type_id] =
          (counts[row.room.room_type_id] || 0) + 1;
      }
    }

    return counts;
  }, [allocations]);

  const occupiedRoomNumbers = useMemo(() => {
    const numbers = new Set<string>();
    for (const row of allocations) {
      const occupied = row.occupants.reduce((sum, occupant) => sum + Number(occupant.persons_allocated || 0), 0);
      if (occupied > 0 && row.room.room_number) numbers.add(`${row.room.room_type_id}:${row.room.room_number}`);
    }
    return numbers;
  }, [allocations]);

  const availableNumberedRooms = useMemo(() => roomTypes.flatMap((roomType) => {
    if (roomType.room_number_start == null || roomType.room_number_end == null) return [];
    const hotel = hotels.find((item) => item.id === roomType.hotel_id);
    return Array.from({ length: roomType.room_number_end - roomType.room_number_start + 1 }, (_, index) => roomType.room_number_start! + index)
      .filter((number) => !occupiedRoomNumbers.has(`${roomType.id}:${number}`))
      .map((number) => ({ roomType, hotel, number }));
  }), [roomTypes, hotels, occupiedRoomNumbers]);

  const availableRoomNumbersForSelectedType = useMemo(
    () => availableNumberedRooms.filter((item) => item.roomType.id === roomTypeId).map((item) => String(item.number)),
    [availableNumberedRooms, roomTypeId],
  );

  const partiallyFilledRooms = useMemo(() => allocations.flatMap((row) => {
    const roomType = roomTypes.find((room) => room.id === row.room.room_type_id);
    if (!roomType) return [];
    const occupied = row.occupants.reduce((sum, occupant) => sum + Number(occupant.persons_allocated || 0), 0);
    const remaining = Number(roomType.occupancy_capacity || 0) - occupied;
    return occupied > 0 && remaining > 0 ? [{ ...row, roomType, occupied, remaining }] : [];
  }), [allocations, roomTypes]);

  const allocatedPersons = allocations.reduce(
    (sum, row) =>
      sum +
      row.occupants.reduce(
        (occupantSum, occupant) =>
          occupantSum + Number(occupant.persons_allocated || 0),
        0,
      ),
    0,
  );

  const totalRooms = roomTypes.reduce(
    (sum, room) => sum + Number(room.number_of_rooms || 0),
    0,
  );

  const totalCapacity = roomTypes.reduce(
    (sum, room) =>
      sum +
      Number(room.number_of_rooms || 0) * Number(room.occupancy_capacity || 0),
    0,
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

  function updateOccupant(key: string, changes: Partial<NewOccupant>) {
    setOccupants((current) =>
      current.map((occupant) =>
        occupant.key === key ? { ...occupant, ...changes } : occupant,
      ),
    );
  }

  async function createAllocation() {
    setError("");

    if (!weddingId || !hotelId || !roomTypeId) {
      setError("Please select a hotel and room type.");
      return;
    }

    if (!selectedExistingRoomId && !roomNumber.trim()) {
      setError("Please select an available physical room number.");
      return;
    }

    if (!selectedExistingRoomId && selectedRoomType?.room_number_start != null && selectedRoomType?.room_number_end != null) {
      const selectedNumber = Number(roomNumber);
      if (!Number.isInteger(selectedNumber) || selectedNumber < selectedRoomType.room_number_start || selectedNumber > selectedRoomType.room_number_end || occupiedRoomNumbers.has(`${selectedRoomType.id}:${roomNumber}`)) {
        setError("That room number is outside this room type's range or is already occupied. Please choose an available room.");
        return;
      }
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
          (families.find((family) => family.id === occupant.id)?.guest_count ||
            0)
      ) {
        setError(
          "A family cannot have more persons allocated than its registered guest count.",
        );
        return;
      }
    }

    if (guestContext && !cleanedOccupants.some((occupant) => occupant.type === guestContext.type && occupant.id === guestContext.id)) {
      setError("Keep the selected guest in this room allocation.");
      return;
    }

    for (const occupant of cleanedOccupants) {
      if (occupant.type === "family" && allocatedFamilyIds.has(occupant.id)) {
        setError("This family already has a room allocation. Return to the Guest Directory to review it.");
        return;
      }
      if (occupant.type === "guest" && allocatedGuestIds.has(occupant.id)) {
        setError("This guest already has a room allocation. Return to the Guest Directory to review it.");
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

    const existingRoom = selectedExistingRoomId ? allocations.find((row) => row.room.id === selectedExistingRoomId) : null;
    const existingOccupancy = existingRoom ? existingRoom.occupants.reduce((sum, occupant) => sum + Number(occupant.persons_allocated || 0), 0) : 0;

    if (selectedRoomType && existingOccupancy + occupancyTotal > capacity) {
      setError(
        `This room has capacity for ${capacity} persons, but existing occupants plus new occupants total ${existingOccupancy + occupancyTotal}.`,
      );
      return;
    }

    if (selectedExistingRoomId) {
      if (!existingRoom) {
        setError("The selected room is no longer available. Please refresh and choose another room.");
        return;
      }
      if (cleanedOccupants.some((occupant) => occupant.type === "family" ? existingRoom.occupants.some((current) => current.guest_family_id === occupant.id) : existingRoom.occupants.some((current) => current.guest_id === occupant.id))) {
        setError("This guest is already staying in the selected room.");
        return;
      }
      setSaving(true);
      const occupantRows = cleanedOccupants.map((occupant) => ({
        allocation_room_id: selectedExistingRoomId,
        guest_family_id: occupant.type === "family" ? occupant.id : null,
        guest_id: occupant.type === "guest" ? occupant.id : null,
        persons_allocated: occupant.personsNumber,
      }));
      const { error: addOccupantsError } = await supabase.from("accommodation_room_occupants").insert(occupantRows);
      if (addOccupantsError) {
        setError(addOccupantsError.message);
        setSaving(false);
        return;
      }
      const { error: updateRoomError } = await supabase.from("accommodation_allocation_rooms").update({ persons_allocated: existingOccupancy + occupancyTotal }).eq("id", selectedExistingRoomId);
      if (updateRoomError) {
        for (const occupant of cleanedOccupants) {
          const query = supabase.from("accommodation_room_occupants").delete().eq("allocation_room_id", selectedExistingRoomId);
          if (occupant.type === "family") await query.eq("guest_family_id", occupant.id);
          else await query.eq("guest_id", occupant.id);
        }
        setError(updateRoomError.message);
        setSaving(false);
        return;
      }
      router.push("/guests");
      router.refresh();
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
          cleanedOccupants.length === 1 && cleanedOccupants[0].type === "family"
            ? cleanedOccupants[0].id
            : null,
        guest_id:
          cleanedOccupants.length === 1 && cleanedOccupants[0].type === "guest"
            ? cleanedOccupants[0].id
            : null,
      })
      .select("id")
      .single();

    if (allocationError || !allocation) {
      setError(allocationError?.message || "Could not create room allocation.");
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
      guest_family_id: occupant.type === "family" ? occupant.id : null,
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
    setSelectedExistingRoomId(null);
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

    if (guestContext) {
      router.push("/guests");
      router.refresh();
      return;
    }
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
      roomTypes.find((room) => room.id === roomTypeIdValue)?.room_type || "Room"
    );
  }

  function hotelName(hotelIdValue: string) {
    return (
      hotels.find((hotel) => hotel.id === hotelIdValue)?.hotel_name || "Hotel"
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
          onClick={() => router.push(guestContext ? "/guests" : "/accommodation")}
          className="mb-6 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          {guestContext ? "← Back to Guest Directory" : "← Back to Accommodation"}
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

        {guestContext && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            <strong>Allocating accommodation for: {contextGuestName || "Selected guest"}</strong>
            <p className="mt-1">Choose an available room below. After successful allocation, you will return to the Guest Directory.</p>
          </div>
        )}

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

        {guestContext && (
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Available rooms by hotel</h2>
            <p className="mt-1 text-xs text-slate-500">Choose an empty room type or add a guest to a partially occupied physical room. Existing occupants and room numbers are shown.</p>
            {partiallyFilledRooms.length > 0 && (
              <div className="mt-5">
                <h3 className="mb-3 text-sm font-semibold text-slate-800">Partially occupied rooms — add occupants to an existing room</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {partiallyFilledRooms.map((row) => {
                    const alreadyInRoom = row.occupants.some((occupant) => guestContext?.type === "family" ? occupant.guest_family_id === guestContext.id : occupant.guest_id === guestContext?.id);
                    const requiredPersons = guestContext?.type === "family" ? (families.find((family) => family.id === guestContext.id)?.guest_count || 1) : 1;
                    const canFitSelectedGuest = !alreadyInRoom && row.remaining >= requiredPersons;
                    return (
                      <button key={row.room.id} type="button" disabled={!canFitSelectedGuest} onClick={() => {
                        setSelectedExistingRoomId(row.room.id);
                        setHotelId(row.allocation.hotel_id);
                        setRoomTypeId(row.room.room_type_id);
                        setRoomNumber(row.room.room_number || "");
                        setCheckIn(row.allocation.check_in_date);
                        setCheckOut(row.allocation.check_out_date);
                        setStatus(row.allocation.status);
                        document.getElementById("new-room-allocation")?.scrollIntoView({behavior: "smooth"});
                      }} className={`rounded-xl border p-4 text-left transition ${selectedExistingRoomId === row.room.id ? "border-blue-600 bg-blue-50" : "border-slate-200"} disabled:cursor-not-allowed disabled:opacity-50`}>
                        <span className="block font-semibold text-slate-900">{hotelName(row.allocation.hotel_id)} · Room {row.room.room_number || "TBD"}</span>
                        <span className="mt-1 block text-sm text-slate-600">{row.roomType.room_type}</span>
                        <span className="mt-2 block text-sm font-medium text-green-700">{row.remaining} bed{row.remaining === 1 ? "" : "s"} available · {row.occupied}/{row.roomType.occupancy_capacity} occupied</span>
                        <span className="mt-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Already allocated</span>
                        {row.occupants.map((occupant) => <span key={occupant.id} className="mt-1 block text-sm text-slate-700">{occupantName(occupant)} ({occupant.persons_allocated})</span>)}
                        <span className="mt-2 block text-xs text-slate-500">{formatDate(row.allocation.check_in_date)} → {formatDate(row.allocation.check_out_date)}</span>
                        {!canFitSelectedGuest && <span className="mt-2 block text-xs text-amber-700">Selected guest cannot be added to this room</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {availableNumberedRooms.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-800">Empty rooms — select a physical room number</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {availableNumberedRooms.map(({ roomType, hotel, number }) => (
                    <button key={`${roomType.id}:${number}`} type="button" onClick={() => {
                      setSelectedExistingRoomId(null);
                      setHotelId(roomType.hotel_id);
                      setRoomTypeId(roomType.id);
                      setRoomNumber(String(number));
                      document.getElementById("new-room-allocation")?.scrollIntoView({behavior: "smooth"});
                    }} className={`rounded-xl border p-4 text-left transition hover:border-blue-500 ${roomNumber === String(number) && roomTypeId === roomType.id ? "border-blue-600 bg-blue-50" : "border-slate-200"}`}>
                      <span className="block font-semibold text-slate-900">{hotel?.hotel_name || "Hotel"} · Room {number}</span>
                      <span className="mt-1 block text-sm text-slate-600">{roomType.room_type}</span>
                      <span className="mt-2 block text-sm font-medium text-green-700">Available</span>
                      <span className="block text-xs text-slate-500">Capacity: {roomType.occupancy_capacity} persons</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {roomTypes.filter((room) => room.room_number_start == null && room.number_of_rooms > (usedRoomCounts[room.id] || 0)).map((room) => {
                const available = room.number_of_rooms - (usedRoomCounts[room.id] || 0);
                const hotel = hotels.find((item) => item.id === room.hotel_id);
                return (
                  <button key={room.id} type="button" onClick={() => {
                    setSelectedExistingRoomId(null);
                    setRoomNumber("");
                    setHotelId(room.hotel_id);
                    setRoomTypeId(room.id);
                    document.getElementById("new-room-allocation")?.scrollIntoView({behavior: "smooth"});
                  }} className={`rounded-xl border p-4 text-left transition hover:border-blue-500 ${roomTypeId === room.id ? "border-blue-600 bg-blue-50" : "border-slate-200"}`}>
                    <span className="block font-semibold text-slate-900">{hotel?.hotel_name || "Hotel"}</span>
                    <span className="mt-1 block text-sm text-slate-600">{room.room_type}</span>
                    <span className="mt-2 block text-sm font-medium text-green-700">{available} empty room{available === 1 ? "" : "s"} available</span>
                    <span className="block text-xs text-slate-500">Capacity: {room.occupancy_capacity} persons</span>
                  </button>
                );
              })}
            </div>
            {roomTypes.every((room) => room.number_of_rooms <= (usedRoomCounts[room.id] || 0)) && <p className="mt-3 text-sm text-amber-700">No completely empty rooms are currently available. You can still choose a partially occupied room above.</p>}
          </section>
        )}

        <details id="new-room-allocation" open={guestContext ? true : undefined} className="mb-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {selectedExistingRoomId ? `Add Occupant to Room ${roomNumber}` : "New Room Allocation"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Select a physical room and add one or more occupants.
              </p>
            </div>

            <span className="ml-4 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">
              {selectedExistingRoomId ? "Add to Existing Room" : "+ New Allocation"}
            </span>
          </summary>

          <div className="border-t border-slate-100 px-6 pb-6 pt-6">
            {selectedExistingRoomId && (
              <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                Adding the selected guest to an existing physical room. Current occupants and stay dates are retained; only the new occupant will be added.
              </div>
            )}
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Hotel
                </label>

                <select
                  value={hotelId}
                  disabled={Boolean(selectedExistingRoomId)}
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
                  onChange={(event) => {
                    const nextRoomTypeId = event.target.value;
                    setRoomTypeId(nextRoomTypeId);
                    const nextRoomType = roomTypes.find((room) => room.id === nextRoomTypeId);
                    if (nextRoomType?.room_number_start != null) {
                      const firstAvailable = availableNumberedRooms.find((item) => item.roomType.id === nextRoomTypeId);
                      setRoomNumber(firstAvailable ? String(firstAvailable.number) : "");
                    } else {
                      setRoomNumber("");
                    }
                  }}
                  disabled={!hotelId || Boolean(selectedExistingRoomId)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm disabled:bg-slate-50"
                >
                  <option value="">Select room type</option>

                  {selectedHotelRoomTypes.map((room) => {
                    const used = usedRoomCounts[room.id] || 0;
                    const available = Math.max(0, room.number_of_rooms - used);

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

                {selectedRoomType?.room_number_start != null && selectedRoomType?.room_number_end != null ? (
                  <select value={roomNumber} onChange={(event) => setRoomNumber(event.target.value)} disabled={Boolean(selectedExistingRoomId)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm disabled:bg-slate-50">
                    <option value="">Select available room</option>
                    {availableRoomNumbersForSelectedType.map((number) => <option key={number} value={number}>Room {number}</option>)}
                  </select>
                ) : (
                  <input type="text" value={roomNumber} onChange={(event) => setRoomNumber(event.target.value)} disabled={Boolean(selectedExistingRoomId)} placeholder="Enter room number" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
                )}

                <p className="mt-1 text-xs text-slate-500">
                  {selectedRoomType?.room_number_start != null && selectedRoomType?.room_number_end != null
                    ? `Select an available room from ${selectedRoomType.room_number_start}–${selectedRoomType.room_number_end}.`
                    : "Required so multiple occupants can share the same physical room."}
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
                      family.id === occupant.id,
                  );

                  const availableGuests = guests.filter(
                    (guest) =>
                      !allocatedGuestIds.has(guest.id) ||
                      guest.id === occupant.id,
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
                                (item) => item.id === value,
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
                            {occupant.type === "family" ? "family" : "guest"}
                          </option>

                          {occupant.type === "family"
                            ? availableFamilies.map((family) => (
                                <option key={family.id} value={family.id}>
                                  {family.family_name} — {family.guest_count}{" "}
                                  persons
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
                  disabled={!selectedRoomType || occupancyTotal >= capacity}
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
                  disabled={Boolean(selectedExistingRoomId)}
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
                  disabled={!checkIn || Boolean(selectedExistingRoomId)}
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
                  0,
                );

                const roomCapacity =
                  roomTypes.find((room) => room.id === row.room.room_type_id)
                    ?.occupancy_capacity || 0;

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
                          {Math.max(0, roomCapacity - roomOccupancy)} remaining
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
                        onClick={() => cancelAllocation(row.allocation.id)}
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
