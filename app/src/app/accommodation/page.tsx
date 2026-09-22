"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/dateUtils";

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

type AllocationRoom = {
  id: string;
  room_type_id: string;
  persons_allocated: number;
};

export default function AccommodationPage() {
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [allocationRooms, setAllocationRooms] = useState<AllocationRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const [weddingResult, hotelsResult, roomTypesResult, allocationResult] =
        await Promise.all([
          supabase
            .from("weddings")
            .select("id")
            .eq("name", "Priyena Wedding")
            .limit(1)
            .maybeSingle(),

          supabase
            .from("accommodation_hotels")
            .select("*")
            .order("created_at", { ascending: true }),

          supabase
            .from("accommodation_room_types")
            .select("*")
            .order("created_at", { ascending: true }),

          supabase
            .from("accommodation_allocation_rooms")
            .select("id, room_type_id, persons_allocated")
            .order("created_at", { ascending: true }),
        ]);

      if (weddingResult.error) {
        console.error("Error loading wedding:", weddingResult.error);
      }

      if (hotelsResult.error) {
        console.error("Error loading hotels:", hotelsResult.error);
      }

      if (roomTypesResult.error) {
        console.error("Error loading room types:", roomTypesResult.error);
      }

      if (allocationResult.error) {
        console.error(
          "Error loading accommodation allocations:",
          allocationResult.error,
        );
      }

      setWeddingId(weddingResult.data?.id ?? null);
      setHotels(hotelsResult.data ?? []);
      setRoomTypes(roomTypesResult.data ?? []);
      setAllocationRooms(allocationResult.data ?? []);
      setLoading(false);
    }

    loadData();
  }, [refresh]);

  const roomStats = useMemo(() => {
    const totalRooms = roomTypes.reduce(
      (total, room) => total + room.number_of_rooms,
      0,
    );

    const totalCapacity = roomTypes.reduce(
      (total, room) => total + room.number_of_rooms * room.occupancy_capacity,
      0,
    );

    const allocatedRooms = allocationRooms.length;

    return {
      totalRooms,
      totalCapacity,
      allocatedRooms,
      availableRooms: Math.max(totalRooms - allocatedRooms, 0),
    };
  }, [roomTypes, allocationRooms]);

  async function deleteHotel(hotel: Hotel) {
    const confirmed = window.confirm(
      `Delete ${hotel.hotel_name}?\\n\\nThis will also remove its room inventory and accommodation allocations.`,
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("accommodation_hotels")
      .delete()
      .eq("id", hotel.id);

    if (error) {
      console.error("Error deleting hotel:", error);
      window.alert("Could not delete the hotel. Please try again.");
      return;
    }

    setRefresh((value) => value + 1);
  }

  function hotelRoomCount(hotelId: string) {
    return roomTypes
      .filter((room) => room.hotel_id === hotelId)
      .reduce((total, room) => total + room.number_of_rooms, 0);
  }

  function hotelAllocatedRoomCount(hotelId: string) {
    const hotelRoomTypeIds = new Set(
      roomTypes
        .filter((room) => room.hotel_id === hotelId)
        .map((room) => room.id),
    );

    return allocationRooms.filter((room) =>
      hotelRoomTypeIds.has(room.room_type_id),
    ).length;
  }

  return (
    <main className="min-h-screen bg-[#fffaf5] p-6 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Accommodation</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage hotels, room inventory and guest accommodation
            </p>
          </div>

          <Link
            href="/accommodation/allocations"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Room Allocation
          </Link>

          <Link
            href="/accommodation/new"
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <span className="mr-2 text-lg leading-none">+</span>
            Add Hotel
          </Link>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Hotels</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {hotels.length}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Rooms</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {roomStats.totalRooms}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Allocated</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {roomStats.allocatedRooms}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Available</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {roomStats.availableRooms}
            </p>
          </div>
        </div>

        <div className="mb-8 rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Room Capacity</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {roomStats.totalCapacity} persons
          </p>
        </div>

        {loading ? (
          <div className="rounded-xl bg-white p-10 text-center shadow-sm">
            <p className="text-sm text-slate-500">Loading accommodation...</p>
          </div>
        ) : hotels.length === 0 ? (
          <div className="rounded-xl bg-white p-10 text-center shadow-sm">
            <p className="font-medium text-slate-700">No hotels added yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Add your first hotel to start managing room inventory.
            </p>
          </div>
        ) : (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Hotels</h2>
              <span className="text-sm text-slate-500">
                {hotels.length} {hotels.length === 1 ? "hotel" : "hotels"}
              </span>
            </div>

            <div className="space-y-4">
              {hotels.map((hotel) => {
                const rooms = hotelRoomCount(hotel.id);
                const allocated = hotelAllocatedRoomCount(hotel.id);

                return (
                  <div
                    key={hotel.id}
                    className="rounded-xl bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          {hotel.hotel_name}
                        </h3>

                        {hotel.location && (
                          <p className="mt-1 text-sm text-slate-500">
                            {hotel.location}
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                          <span>
                            Rooms:{" "}
                            <strong className="font-medium text-slate-700">
                              {rooms}
                            </strong>
                          </span>

                          <span>
                            Allocated:{" "}
                            <strong className="font-medium text-slate-700">
                              {allocated}
                            </strong>
                          </span>

                          <span>
                            Available:{" "}
                            <strong className="font-medium text-slate-700">
                              {Math.max(rooms - allocated, 0)}
                            </strong>
                          </span>
                        </div>

                        {(hotel.check_in_date || hotel.check_out_date) && (
                          <p className="mt-2 text-sm text-slate-500">
                            {hotel.check_in_date
                              ? formatDate(hotel.check_in_date)
                              : "TBD"}{" "}
                            →{" "}
                            {hotel.check_out_date
                              ? formatDate(hotel.check_out_date)
                              : "TBD"}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/accommodation/${hotel.id}`}
                          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                          Manage Hotel
                        </Link>

                        <button
                          type="button"
                          onClick={() => deleteHotel(hotel)}
                          className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
