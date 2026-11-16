-- Cash basis for tax: record the date each order was actually paid out to us.
-- The Tax Year page, Finance page and Tax Calculator count an order in the tax year of
-- paid_date (falling back to order_date when it's blank).
-- Safe to run more than once. Adds a column and one function — no existing data is changed.
-- Run in Supabase → SQL Editor.

alter table orders
  add column if not exists paid_date date;  -- date the platform paid the money out (TikTok statement date, Etsy "available" date, etc.)

create or replace function set_order_paid_date(p_order_id uuid, p_paid_date date)
returns void
language sql
security definer
set search_path = public
as $$
  update orders set paid_date = p_paid_date where id = p_order_id;
$$;

grant execute on function set_order_paid_date(uuid, date) to anon, authenticated;
