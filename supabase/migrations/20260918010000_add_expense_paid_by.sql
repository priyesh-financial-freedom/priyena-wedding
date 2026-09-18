-- Track who paid each expense.
alter table public.budget_payments
  add column if not exists paid_by text;
