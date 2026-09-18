-- Allow expenses that are not linked to an existing budget item.
alter table public.budget_payments
  alter column budget_item_id drop not null;

-- Store the budget category directly on each expense.
alter table public.budget_payments
  add column if not exists category_id uuid;

-- Link the expense category to the existing budget category table.
alter table public.budget_payments
  add constraint budget_payments_category_id_fkey
  foreign key (category_id)
  references public.budget_categories(id);

-- Helpful index for category-based expense totals.
create index if not exists budget_payments_category_id_idx
  on public.budget_payments(category_id);
