alter table public.hobbies
add column if not exists preferred_water_temp_min_c numeric null;

alter table public.hobbies
drop constraint if exists hobbies_preferred_water_temp_min_c_check;

alter table public.hobbies
add constraint hobbies_preferred_water_temp_min_c_check
check (
  preferred_water_temp_min_c is null
  or (
    preferred_water_temp_min_c >= -2
    and preferred_water_temp_min_c <= 45
  )
);
