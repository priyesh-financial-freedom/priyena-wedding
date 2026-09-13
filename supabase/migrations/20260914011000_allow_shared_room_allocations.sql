-- Shared-room accommodation model
-- A room allocation may now have multiple occupants.
-- Therefore guest_family_id and guest_id on the allocation itself
-- may both be NULL. Actual occupants are stored in
-- accommodation_room_occupants.

alter table accommodation_allocations
drop constraint if exists accommodation_allocations_guest_source;

alter table accommodation_allocations
add constraint accommodation_allocations_guest_source
check (
  (guest_family_id is not null and guest_id is null)
  or
  (guest_family_id is null and guest_id is not null)
  or
  (guest_family_id is null and guest_id is null)
);
