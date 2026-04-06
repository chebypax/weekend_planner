alter table public.hobbies
add column if not exists preference_level text not null default 'medium';

alter table public.hobbies
drop constraint if exists hobbies_preference_level_check;

alter table public.hobbies
add constraint hobbies_preference_level_check
check (preference_level in ('high', 'medium', 'low'));
