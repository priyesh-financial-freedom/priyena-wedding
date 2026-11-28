-- Track whether hotel accommodation is required for each family invitation
-- and individual guest. Actual allocation status is derived from active room occupants.
alter table guest_families
  add column if not exists room_required boolean not null default true;

alter table guests
  add column if not exists room_required boolean not null default true;

comment on column guest_families.room_required is
  'Whether this family requires hotel accommodation; active room allocation is derived from accommodation_room_occupants.';
comment on column guests.room_required is
  'Whether this individual guest requires hotel accommodation; active room allocation is derived from accommodation_room_occupants.';
