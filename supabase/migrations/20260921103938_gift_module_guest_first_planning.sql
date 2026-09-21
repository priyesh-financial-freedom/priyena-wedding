-- Priyena Wedding Planner
-- Gift Module V1: guest-first gift planning

create extension if not exists pgcrypto;

create table if not exists public.gift_types (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  gift_name text not null,
  gift_category text,
  estimated_unit_cost numeric(12,2) not null default 0,
  vendor_name text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (wedding_id, gift_name),
  check (estimated_unit_cost >= 0)
);

create table if not exists public.guest_gift_plan (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  guest_family_id uuid references public.guest_families(id) on delete cascade,
  guest_id uuid references public.guests(id) on delete cascade,
  gift_type_id uuid not null references public.gift_types(id) on delete restrict,
  quantity integer not null default 1,
  status text not null default 'planned',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (quantity >= 1),
  check (status in ('planned', 'packed', 'delivered')),
  check (
    (
      guest_family_id is not null
      and guest_id is null
    )
    or
    (
      guest_family_id is null
      and guest_id is not null
    )
  )
);

create unique index if not exists uq_guest_gift_plan_family_gift
on public.guest_gift_plan (
  wedding_id,
  guest_family_id,
  gift_type_id
)
where guest_family_id is not null;

create unique index if not exists uq_guest_gift_plan_guest_gift
on public.guest_gift_plan (
  wedding_id,
  guest_id,
  gift_type_id
)
where guest_id is not null;

create index if not exists idx_gift_types_wedding_active
on public.gift_types (
  wedding_id,
  active,
  gift_name
);

create index if not exists idx_guest_gift_plan_wedding
on public.guest_gift_plan (wedding_id);

create index if not exists idx_guest_gift_plan_family
on public.guest_gift_plan (guest_family_id);

create index if not exists idx_guest_gift_plan_guest
on public.guest_gift_plan (guest_id);

create index if not exists idx_guest_gift_plan_type_status
on public.guest_gift_plan (
  gift_type_id,
  status
);

create or replace function public.set_gift_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_gift_types_updated_at
on public.gift_types;

create trigger trg_gift_types_updated_at
before update on public.gift_types
for each row
execute function public.set_gift_updated_at();

drop trigger if exists trg_guest_gift_plan_updated_at
on public.guest_gift_plan;

create trigger trg_guest_gift_plan_updated_at
before update on public.guest_gift_plan
for each row
execute function public.set_gift_updated_at();

create or replace view public.v_gift_requirements as
select
  gift_type.wedding_id,
  gift_type.id as gift_type_id,
  gift_type.gift_name,
  gift_type.gift_category,
  gift_type.estimated_unit_cost,

  count(distinct gift_plan.guest_family_id)
    filter (
      where gift_plan.guest_family_id is not null
    ) as families_assigned,

  count(distinct gift_plan.guest_id)
    filter (
      where gift_plan.guest_id is not null
    ) as individual_guests_assigned,

  coalesce(
    sum(gift_plan.quantity),
    0
  )::bigint as quantity_required,

  (
    coalesce(sum(gift_plan.quantity), 0)
    * gift_type.estimated_unit_cost
  )::numeric(14,2) as estimated_total_cost,

  count(gift_plan.id) as allocation_count

from public.gift_types as gift_type

left join public.guest_gift_plan as gift_plan
  on gift_plan.gift_type_id = gift_type.id

where gift_type.active = true

group by
  gift_type.wedding_id,
  gift_type.id,
  gift_type.gift_name,
  gift_type.gift_category,
  gift_type.estimated_unit_cost;
