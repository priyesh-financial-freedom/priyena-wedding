-- Room occupants
-- One physical room can contain multiple families and/or individual guests.

create table if not exists accommodation_room_occupants (
  id uuid primary key default gen_random_uuid(),

  allocation_room_id uuid not null
    references accommodation_allocation_rooms(id)
    on delete cascade,

  guest_family_id uuid references guest_families(id)
    on delete cascade,

  guest_id uuid references guests(id)
    on delete cascade,

  persons_allocated integer not null default 1,

  created_at timestamptz default now(),

  constraint accommodation_room_occupants_one_guest_source
    check (
      (guest_family_id is not null and guest_id is null)
      or
      (guest_family_id is null and guest_id is not null)
    ),

  constraint accommodation_room_occupants_positive_persons
    check (persons_allocated > 0)
);

create index if not exists idx_accommodation_room_occupants_room
  on accommodation_room_occupants(allocation_room_id);

create index if not exists idx_accommodation_room_occupants_family
  on accommodation_room_occupants(guest_family_id);

create index if not exists idx_accommodation_room_occupants_guest
  on accommodation_room_occupants(guest_id);
