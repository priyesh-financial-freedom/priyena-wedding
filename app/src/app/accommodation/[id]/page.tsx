"use client";

import DateInput from "@/components/DateInput";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Hotel = {
  id: string;
  wedding_id: string;
  hotel_name: string;
  location: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  notes: string | null;
};

type RoomType = {
  id: string;
  hotel_id: string;
  room_type: string;
  number_of_rooms: number;
  occupancy_capacity: number;
  rate_per_night: number;
  notes: string | null;
};

type RoomForm = {
  roomType: string;
  numberOfRooms: string;
  occupancyCapacity: string;
  ratePerNight: string;
  notes: string;
};

const emptyRoomForm: RoomForm = {
  roomType: "",
  numberOfRooms: "1",
  occupancyCapacity: "2",
  ratePerNight: "0",
  notes: "",
};

export default function ManageHotelPage() {
  const params = useParams();
  const router = useRouter();
  const hotelId = params.id as string;

  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [allocatedRoomTypeIds, setAllocatedRoomTypeIds] = useState<Set<string>>(
    new Set(),
  );

  const [loading, setLoading] = useState(true);
  const [savingHotel, setSavingHotel] = useState(false);
  const [savingRoom, setSavingRoom] = useState(false);

  const [hotelError, setHotelError] = useState("");
  const [roomError, setRoomError] = useState("");

  const [hotelName, setHotelName] = useState("");
  const [location, setLocation] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [hotelNotes, setHotelNotes] = useState("");

  const [showRoomForm, setShowRoomForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomType | null>(null);
  const [roomForm, setRoomForm] = useState<RoomForm>(emptyRoomForm);

  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const [hotelResult, roomsResult, allocationsResult] = await Promise.all([
        supabase
          .from("accommodation_hotels")
          .select("*")
          .eq("id", hotelId)
          .maybeSingle(),

        supabase
          .from("accommodation_room_types")
          .select("*")
          .eq("hotel_id", hotelId)
          .order("created_at", { ascending: true }),

        supabase
          .from("accommodation_allocations")
          .select("id, status")
          .eq("hotel_id", hotelId)
          .neq("status", "cancelled"),
      ]);

      if (hotelResult.error) {
        console.error("Error loading hotel:", hotelResult.error);
      }

      if (roomsResult.error) {
        console.error("Error loading room types:", roomsResult.error);
      }

      if (allocationsResult.error) {
        console.error("Error loading allocations:", allocationsResult.error);
      }

      const loadedHotel = hotelResult.data as Hotel | null;

      setHotel(loadedHotel);
      setRoomTypes((roomsResult.data ?? []) as RoomType[]);

      if (loadedHotel) {
        setHotelName(loadedHotel.hotel_name);
        setLocation(loadedHotel.location ?? "");
        setContactPerson(loadedHotel.contact_person ?? "");
        setContactPhone(loadedHotel.contact_phone ?? "");
        setCheckInDate(loadedHotel.check_in_date ?? "");
        setCheckOutDate(loadedHotel.check_out_date ?? "");
        setHotelNotes(loadedHotel.notes ?? "");
      }

      const allocationIds = new Set<string>();

      if (allocationsResult.data?.length) {
        const allocationIdsList = allocationsResult.data.map(
          (allocation) => allocation.id,
        );

        const { data: allocationRooms, error: allocationRoomsError } =
          await supabase
            .from("accommodation_allocation_rooms")
            .select("room_type_id")
            .in("allocation_id", allocationIdsList);

        if (allocationRoomsError) {
          console.error("Error loading allocated rooms:", allocationRoomsError);
        }

        (allocationRooms ?? []).forEach((room) => {
          allocationIds.add(room.room_type_id);
        });
      }

      setAllocatedRoomTypeIds(allocationIds);
      setLoading(false);
    }

    if (hotelId) {
      loadData();
    }
  }, [hotelId, refresh]);

  const stats = useMemo(() => {
    const totalRooms = roomTypes.reduce(
      (total, room) => total + Number(room.number_of_rooms),
      0,
    );

    const totalCapacity = roomTypes.reduce(
      (total, room) =>
        total + Number(room.number_of_rooms) * Number(room.occupancy_capacity),
      0,
    );

    return {
      totalRooms,
      totalCapacity,
    };
  }, [roomTypes]);

  async function saveHotel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hotelName.trim()) {
      setHotelError("Please enter the hotel name.");
      return;
    }

    if (checkInDate && checkOutDate && checkOutDate < checkInDate) {
      setHotelError("Check-out date cannot be before check-in date.");
      return;
    }

    setSavingHotel(true);
    setHotelError("");

    const { error } = await supabase
      .from("accommodation_hotels")
      .update({
        hotel_name: hotelName.trim(),
        location: location.trim() || null,
        contact_person: contactPerson.trim() || null,
        contact_phone: contactPhone.trim() || null,
        check_in_date: checkInDate || null,
        check_out_date: checkOutDate || null,
        notes: hotelNotes.trim() || null,
      })
      .eq("id", hotelId);

    if (error) {
      console.error("Error updating hotel:", error);
      setHotelError("Could not save the hotel. Please try again.");
      setSavingHotel(false);
      return;
    }

    setSavingHotel(false);
    setRefresh((value) => value + 1);
  }

  function openAddRoom() {
    setEditingRoom(null);
    setRoomForm(emptyRoomForm);
    setRoomError("");
    setShowRoomForm(true);
  }

  function openEditRoom(room: RoomType) {
    setEditingRoom(room);
    setRoomForm({
      roomType: room.room_type,
      numberOfRooms: String(room.number_of_rooms),
      occupancyCapacity: String(room.occupancy_capacity),
      ratePerNight: String(room.rate_per_night),
      notes: room.notes ?? "",
    });
    setRoomError("");
    setShowRoomForm(true);
  }

  async function saveRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const numberOfRooms = Number(roomForm.numberOfRooms);
    const occupancyCapacity = Number(roomForm.occupancyCapacity);
    const ratePerNight = Number(roomForm.ratePerNight);

    if (!roomForm.roomType.trim()) {
      setRoomError("Please enter the room type.");
      return;
    }

    if (!Number.isInteger(numberOfRooms) || numberOfRooms < 0) {
      setRoomError("Number of rooms must be 0 or greater.");
      return;
    }

    if (!Number.isInteger(occupancyCapacity) || occupancyCapacity < 1) {
      setRoomError("Occupancy capacity must be at least 1.");
      return;
    }

    if (!Number.isFinite(ratePerNight) || ratePerNight < 0) {
      setRoomError("Rate per night must be 0 or greater.");
      return;
    }

    setSavingRoom(true);
    setRoomError("");

    const payload = {
      room_type: roomForm.roomType.trim(),
      number_of_rooms: numberOfRooms,
      occupancy_capacity: occupancyCapacity,
      rate_per_night: ratePerNight,
      notes: roomForm.notes.trim() || null,
    };

    const result = editingRoom
      ? await supabase
          .from("accommodation_room_types")
          .update(payload)
          .eq("id", editingRoom.id)
      : await supabase.from("accommodation_room_types").insert({
          hotel_id: hotelId,
          ...payload,
        });

    if (result.error) {
      console.error("Error saving room type:", result.error);
      setRoomError("Could not save the room type. Please try again.");
      setSavingRoom(false);
      return;
    }

    setSavingRoom(false);
    setShowRoomForm(false);
    setEditingRoom(null);
    setRoomForm(emptyRoomForm);
    setRefresh((value) => value + 1);
  }

  async function deleteRoom(room: RoomType) {
    if (allocatedRoomTypeIds.has(room.id)) {
      window.alert(
        "This room type is already used in an accommodation allocation and cannot be deleted.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete ${room.room_type}?\\n\\nThis will remove this room type from the hotel's inventory.`,
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("accommodation_room_types")
      .delete()
      .eq("id", room.id);

    if (error) {
      console.error("Error deleting room type:", error);
      window.alert("Could not delete the room type. Please try again.");
      return;
    }

    setRefresh((value) => value + 1);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fffaf5] p-6 md:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-xl bg-white p-10 text-center shadow-sm">
            <p className="text-sm text-slate-500">Loading hotel...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!hotel) {
    return (
      <main className="min-h-screen bg-[#fffaf5] p-6 md:p-8">
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={() => router.push("/accommodation")}
            className="mb-5 text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            ← Back to Accommodation
          </button>

          <div className="rounded-xl bg-white p-10 text-center shadow-sm">
            <p className="font-medium text-slate-700">Hotel not found</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fffaf5] p-6 md:p-8">
      <div className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={() => router.push("/accommodation")}
          className="mb-5 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          ← Back to Accommodation
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            {hotel.hotel_name}
          </h1>

          {hotel.location && (
            <p className="mt-1 text-sm text-slate-500">{hotel.location}</p>
          )}
        </div>

        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Rooms</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {stats.totalRooms}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Room Types</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {roomTypes.length}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total Capacity</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {stats.totalCapacity}
            </p>
            <p className="text-xs text-slate-400">persons</p>
          </div>
        </div>

        <section className="mb-8 rounded-xl bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900">
              Hotel Details
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Update the hotel's basic information.
            </p>
          </div>

          <form onSubmit={saveHotel}>
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Hotel Name *
                </label>
                <input
                  type="text"
                  value={hotelName}
                  onChange={(event) => setHotelName(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
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
                  value={hotelNotes}
                  onChange={(event) => setHotelNotes(event.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>
            </div>

            {hotelError && (
              <p className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {hotelError}
              </p>
            )}

            <div className="mt-6 flex justify-end border-t border-slate-100 pt-5">
              <button
                type="submit"
                disabled={savingHotel}
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {savingHotel ? "Saving..." : "Save Hotel Changes"}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-xl bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Room Inventory
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Manage the rooms available at this hotel.
              </p>
            </div>

            <button
              type="button"
              onClick={openAddRoom}
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <span className="mr-2 text-lg leading-none">+</span>
              Add Room Type
            </button>
          </div>

          {roomTypes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center">
              <p className="font-medium text-slate-700">
                No room types added yet
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Add your first room type to build the hotel's inventory.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {roomTypes.map((room) => (
                <div
                  key={room.id}
                  className="rounded-lg border border-slate-100 p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {room.room_type}
                      </h3>

                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                        <span>
                          Rooms:{" "}
                          <strong className="font-medium text-slate-700">
                            {room.number_of_rooms}
                          </strong>
                        </span>

                        <span>
                          Capacity:{" "}
                          <strong className="font-medium text-slate-700">
                            {room.occupancy_capacity}
                          </strong>
                        </span>

                        <span>
                          Rate:{" "}
                          <strong className="font-medium text-slate-700">
                            ₹
                            {Number(room.rate_per_night).toLocaleString(
                              "en-IN",
                            )}
                          </strong>
                          /night
                        </span>
                      </div>

                      {room.notes && (
                        <p className="mt-2 text-sm text-slate-500">
                          {room.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => openEditRoom(room)}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteRoom(room)}
                        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {showRoomForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    {editingRoom ? "Edit Room Type" : "Add Room Type"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Define the hotel's room inventory.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowRoomForm(false)}
                  className="text-2xl leading-none text-slate-400 hover:text-slate-700"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <form onSubmit={saveRoom} className="space-y-5 px-6 py-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Room Type *
                  </label>
                  <input
                    type="text"
                    value={roomForm.roomType}
                    onChange={(event) =>
                      setRoomForm((current) => ({
                        ...current,
                        roomType: event.target.value,
                      }))
                    }
                    placeholder="e.g. Deluxe"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    autoFocus
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Number of Rooms *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={roomForm.numberOfRooms}
                      onChange={(event) =>
                        setRoomForm((current) => ({
                          ...current,
                          numberOfRooms: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Occupancy Capacity *
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={roomForm.occupancyCapacity}
                      onChange={(event) =>
                        setRoomForm((current) => ({
                          ...current,
                          occupancyCapacity: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Rate per Night (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={roomForm.ratePerNight}
                    onChange={(event) =>
                      setRoomForm((current) => ({
                        ...current,
                        ratePerNight: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Notes
                  </label>
                  <textarea
                    value={roomForm.notes}
                    onChange={(event) =>
                      setRoomForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    rows={3}
                    placeholder="Optional notes"
                    className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                {roomError && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                    {roomError}
                  </p>
                )}

                <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    onClick={() => setShowRoomForm(false)}
                    disabled={savingRoom}
                    className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={savingRoom}
                    className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {savingRoom
                      ? "Saving..."
                      : editingRoom
                        ? "Save Changes"
                        : "Add Room Type"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
