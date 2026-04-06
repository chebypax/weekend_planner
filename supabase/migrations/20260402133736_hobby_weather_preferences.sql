alter table public.hobbies
add column if not exists preferred_temp_min_c numeric null,
add column if not exists preferred_temp_max_c numeric null,
add column if not exists rain_allowed boolean null;

alter table public.hobbies
drop constraint if exists hobbies_preferred_temp_bounds_check;

alter table public.hobbies
add constraint hobbies_preferred_temp_bounds_check
check (
  preferred_temp_min_c is null
  or preferred_temp_max_c is null
  or preferred_temp_min_c <= preferred_temp_max_c
);
