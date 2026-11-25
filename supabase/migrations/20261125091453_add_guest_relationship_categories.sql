alter table public.guest_families
  add column if not exists relationship_category text not null default 'Others';

alter table public.guests
  add column if not exists relationship_category text not null default 'Others';

alter table public.guest_families
  add constraint guest_families_relationship_category_check
  check (relationship_category in ('Family', 'Friends', 'Relatives', 'Business Acquaintances', 'Others'));

alter table public.guests
  add constraint guests_relationship_category_check
  check (relationship_category in ('Family', 'Friends', 'Relatives', 'Business Acquaintances', 'Others'));
