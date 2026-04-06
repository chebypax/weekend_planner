alter table public.hobbies enable row level security;
alter table public.recommendation_runs enable row level security;
alter table public.recommendation_items enable row level security;

drop policy if exists hobbies_public_all on public.hobbies;
create policy hobbies_public_all
on public.hobbies
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists recommendation_runs_public_all on public.recommendation_runs;
create policy recommendation_runs_public_all
on public.recommendation_runs
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists recommendation_items_public_all on public.recommendation_items;
create policy recommendation_items_public_all
on public.recommendation_items
for all
to anon, authenticated
using (true)
with check (true);
