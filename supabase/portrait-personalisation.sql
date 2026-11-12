-- Family portrait personalisation: adds fields to the existing requests table.
-- Safe to run more than once. Adds columns only — no existing data is changed.
-- Run in Supabase → SQL Editor.

alter table personalisation_requests
  add column if not exists kind text not null default 'standard',   -- 'standard' | 'portrait'
  add column if not exists size_label text,                         -- e.g. '2–4'
  add column if not exists min_people int,
  add column if not exists max_people int,
  add column if not exists portrait jsonb;                          -- what the customer built
