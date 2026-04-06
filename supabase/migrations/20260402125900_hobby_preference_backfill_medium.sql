update public.hobbies
set preference_level = 'medium'
where preference_level is null;

alter table public.hobbies
alter column preference_level set default 'medium';

alter table public.hobbies
alter column preference_level set not null;
