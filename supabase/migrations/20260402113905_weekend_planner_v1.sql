create extension if not exists "pgcrypto";

create table if not exists public.hobbies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.recommendation_runs (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  forecast_date_start date not null,
  forecast_date_end date not null,
  score_version text not null,
  weather_snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.recommendation_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.recommendation_runs(id) on delete cascade,
  hobby_id uuid not null references public.hobbies(id) on delete cascade,
  score numeric(6, 2) not null,
  score_breakdown jsonb not null,
  rationale text not null,
  rank_position integer not null
);

create index if not exists recommendation_runs_created_at_desc_idx
on public.recommendation_runs (created_at desc);

create index if not exists recommendation_items_run_rank_idx
on public.recommendation_items (run_id, rank_position);

insert into public.hobbies (name, is_active)
values
  ('Hiking', true),
  ('Cycling', true),
  ('Photography walk', true),
  ('Museum visit', true),
  ('Board games cafe', true)
on conflict (name) do nothing;
