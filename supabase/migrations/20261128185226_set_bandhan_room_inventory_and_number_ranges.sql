-- Bandhan Resorts: establish the physical room inventory and numbering ranges.
alter table public.accommodation_room_types
  add column if not exists room_number_start integer,
  add column if not exists room_number_end integer;

update public.accommodation_room_types rt
set room_type = 'Deluxe 3',
    number_of_rooms = 25,
    room_number_start = 101,
    room_number_end = 125
from public.accommodation_hotels h
where rt.hotel_id = h.id
  and lower(trim(h.hotel_name)) = 'bandhan resorts'
  and lower(trim(rt.room_type)) = 'deluxe 3';

update public.accommodation_room_types rt
set room_type = 'Deluxe 4',
    number_of_rooms = 10,
    room_number_start = 126,
    room_number_end = 135
from public.accommodation_hotels h
where rt.hotel_id = h.id
  and lower(trim(h.hotel_name)) = 'bandhan resorts'
  and lower(trim(rt.room_type)) in ('.deluxe 4', 'deluxe 4');

update public.accommodation_room_types rt
set number_of_rooms = 5,
    room_number_start = 136,
    room_number_end = 140
from public.accommodation_hotels h
where rt.hotel_id = h.id
  and lower(trim(h.hotel_name)) = 'bandhan resorts'
  and lower(trim(rt.room_type)) = 'suite';

alter table public.accommodation_room_types
  add constraint accommodation_room_types_room_number_range_valid
  check (
    (room_number_start is null and room_number_end is null)
    or (
      room_number_start is not null
      and room_number_end is not null
      and room_number_end >= room_number_start
      and number_of_rooms = room_number_end - room_number_start + 1
    )
  );
