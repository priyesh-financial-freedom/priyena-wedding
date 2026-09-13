-- Priyena Wedding Planner
-- Accommodation: Hotels, Room Inventory and Guest Allocations

-- ==============================
-- Accommodation Hotels
-- ==============================

create table accommodation_hotels (
    id uuid primary key default gen_random_uuid(),

    wedding_id uuid not null
        references weddings(id)
        on delete cascade,

    hotel_name text not null,

    location text,

    contact_person text,

    contact_phone text,

    check_in_date date,

    check_out_date date,

    notes text,

    created_at timestamptz default now(),

    constraint accommodation_hotels_dates_valid
        check (
            check_out_date is null
            or check_in_date is null
            or check_out_date >= check_in_date
        )
);

-- ==============================
-- Accommodation Room Types
-- ==============================

create table accommodation_room_types (
    id uuid primary key default gen_random_uuid(),

    hotel_id uuid not null
        references accommodation_hotels(id)
        on delete cascade,

    room_type text not null,

    number_of_rooms integer not null default 0,

    occupancy_capacity integer not null default 1,

    rate_per_night numeric(12,2) not null default 0,

    notes text,

    created_at timestamptz default now(),

    constraint accommodation_room_types_rooms_valid
        check (number_of_rooms >= 0),

    constraint accommodation_room_types_capacity_valid
        check (occupancy_capacity > 0),

    constraint accommodation_room_types_rate_valid
        check (rate_per_night >= 0)
);

-- ==============================
-- Accommodation Allocations
-- ==============================

create table accommodation_allocations (
    id uuid primary key default gen_random_uuid(),

    wedding_id uuid not null
        references weddings(id)
        on delete cascade,

    guest_family_id uuid
        references guest_families(id)
        on delete cascade,

    guest_id uuid
        references guests(id)
        on delete cascade,

    hotel_id uuid not null
        references accommodation_hotels(id)
        on delete cascade,

    check_in_date date not null,

    check_out_date date not null,

    status text not null default 'allocated',

    notes text,

    created_at timestamptz default now(),

    constraint accommodation_allocations_guest_source
        check (
            (guest_family_id is not null and guest_id is null)
            or
            (guest_family_id is null and guest_id is not null)
        ),

    constraint accommodation_allocations_dates_valid
        check (check_out_date > check_in_date),

    constraint accommodation_allocations_status_valid
        check (
            status in (
                'allocated',
                'checked_in',
                'checked_out',
                'cancelled'
            )
        )
);

-- ==============================
-- Accommodation Allocation Rooms
-- ==============================

create table accommodation_allocation_rooms (
    id uuid primary key default gen_random_uuid(),

    allocation_id uuid not null
        references accommodation_allocations(id)
        on delete cascade,

    room_type_id uuid not null
        references accommodation_room_types(id)
        on delete restrict,

    room_number text,

    persons_allocated integer not null default 0,

    created_at timestamptz default now(),

    constraint accommodation_allocation_rooms_persons_valid
        check (persons_allocated > 0)
);

-- ==============================
-- Indexes
-- ==============================

create index accommodation_hotels_wedding_id_idx
    on accommodation_hotels(wedding_id);

create index accommodation_room_types_hotel_id_idx
    on accommodation_room_types(hotel_id);

create index accommodation_allocations_wedding_id_idx
    on accommodation_allocations(wedding_id);

create index accommodation_allocations_family_id_idx
    on accommodation_allocations(guest_family_id);

create index accommodation_allocations_guest_id_idx
    on accommodation_allocations(guest_id);

create index accommodation_allocations_hotel_id_idx
    on accommodation_allocations(hotel_id);

create index accommodation_allocation_rooms_allocation_id_idx
    on accommodation_allocation_rooms(allocation_id);

create index accommodation_allocation_rooms_room_type_id_idx
    on accommodation_allocation_rooms(room_type_id);
