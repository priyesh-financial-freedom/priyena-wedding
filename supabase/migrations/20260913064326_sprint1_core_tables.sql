-- Priyena Wedding Planner
-- Sprint 1A Core Tables

create extension if not exists pgcrypto;

-- ==============================
-- Weddings
-- ==============================

create table weddings (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    wedding_date date not null,
    bride_name text not null,
    groom_name text,
    currency_code text default 'INR',
    created_at timestamptz default now()
);

-- ==============================
-- Family Members
-- ==============================

create table family_members (
    id uuid primary key default gen_random_uuid(),
    wedding_id uuid not null references weddings(id) on delete cascade,

    name text not null,
    relationship text not null,

    mobile text,
    email text,

    display_order integer default 1,
    active boolean default true,

    created_at timestamptz default now()
);

-- ==============================
-- Guest Families
-- ==============================

create table guest_families (
    id uuid primary key default gen_random_uuid(),

    wedding_id uuid not null references weddings(id) on delete cascade,

    guest_owner_id uuid not null
        references family_members(id),

    family_name text not null,

    primary_contact_name text,

    mobile text,
    email text,

    city text,

    side text default 'bride',

    invited boolean default false,

    rsvp_status text default 'pending',

    vip_status boolean default false,

    notes text,

    created_at timestamptz default now()
);

-- ==============================
-- Guests
-- ==============================

create table guests (
    id uuid primary key default gen_random_uuid(),

    guest_family_id uuid not null
        references guest_families(id)
        on delete cascade,

    full_name text not null,

    mobile text,

    email text,

    age_group text default 'adult',

    attendance_status text default 'pending',

    notes text,

    created_at timestamptz default now()
);

-- ==============================
-- Functions
-- ==============================

create table functions (
    id uuid primary key default gen_random_uuid(),

    wedding_id uuid not null
        references weddings(id)
        on delete cascade,

    name text not null,

    function_date date,

    venue text,

    start_time time,

    end_time time,

    sequence_number integer,

    created_at timestamptz default now()
);

-- ==============================
-- Guest Function Attendance
-- ==============================

create table guest_function_attendance (
    id uuid primary key default gen_random_uuid(),

    guest_id uuid not null
        references guests(id)
        on delete cascade,

    function_id uuid not null
        references functions(id)
        on delete cascade,

    attendance_status text default 'pending',

    checked_in_at timestamptz,

    created_at timestamptz default now(),

    unique (guest_id, function_id)
);

-- ==============================
-- Seed Data
-- ==============================

insert into weddings
(
    name,
    wedding_date,
    bride_name
)
values
(
    'Priyena Wedding',
    '2027-01-25',
    'Priyena'
);

insert into family_members
(
    wedding_id,
    name,
    relationship,
    display_order
)
select
    id,
    'Priyesh',
    'Father',
    1
from weddings
limit 1;

insert into family_members
(
    wedding_id,
    name,
    relationship,
    display_order
)
select
    id,
    'Shobhana',
    'Mother',
    2
from weddings
limit 1;

insert into family_members
(
    wedding_id,
    name,
    relationship,
    display_order
)
select
    id,
    'Priyena',
    'Bride',
    3
from weddings
limit 1;

insert into family_members
(
    wedding_id,
    name,
    relationship,
    display_order
)
select
    id,
    'Shobhit',
    'Brother',
    4
from weddings
limit 1;

insert into functions
(
    wedding_id,
    name,
    sequence_number
)
select id, 'Mehendi', 1 from weddings;

insert into functions
(
    wedding_id,
    name,
    sequence_number
)
select id, 'Sangeet', 2 from weddings;

insert into functions
(
    wedding_id,
    name,
    sequence_number
)
select id, 'Wedding', 3 from weddings;

insert into functions
(
    wedding_id,
    name,
    sequence_number
)
select id, 'Reception', 4 from weddings;