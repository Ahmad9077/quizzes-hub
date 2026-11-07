create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,32}$'),
  login_email text not null unique,
  display_name text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  avatar text not null default '⭐',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quizzes (
  id text primary key,
  title text not null,
  url text not null,
  icon text not null,
  color text not null,
  sort_order integer not null default 100
);

create table if not exists public.quiz_assignments (
  user_id uuid not null references public.profiles(id) on delete cascade,
  quiz_id text not null references public.quizzes(id) on delete cascade,
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  created_at timestamptz not null default now(),
  primary key (user_id, quiz_id)
);

create table if not exists public.quiz_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  quiz_id text not null references public.quizzes(id) on delete cascade,
  score integer not null check (score >= 0),
  total integer not null check (total > 0),
  level text not null default 'Practice',
  details jsonb not null default '{}'::jsonb,
  completed_at timestamptz not null default now(),
  constraint quiz_progress_score_range check (score <= total),
  constraint quiz_progress_details_size check (octet_length(details::text) <= 65536)
);

insert into public.quizzes (id, title, url, icon, color, sort_order)
values
  ('world-flags', 'World Flags Quiz', 'https://ahmad9077.github.io/world-flags-quiz/', '🌍', '#e5f8ff', 10),
  ('country-map', 'Country Map Quiz', 'https://ahmad9077.github.io/country-map-quiz/', '🗺️', '#eafff9', 20),
  ('spelling', 'Spelling Quiz', 'https://ahmad9077.github.io/spelling-quiz/', '🔤', '#fff2bf', 30),
  ('picture-reading', 'Picture Reading Quiz', 'https://ahmad9077.github.io/little-words-picture-quiz/', '📖', '#ffece6', 40),
  ('english-word-choice', 'English Word Choice Quiz', 'https://ahmad9077.github.io/english-word-choice-quiz/', '🔠', '#e7f5ef', 50),
  ('border-detective', 'Border Detective', 'https://ahmad9077.github.io/country-border-letter-quiz/', '🧭', '#e8f2ff', 60),
  ('arabic-phonics', 'صدى الحروف', 'https://ahmad9077.github.io/arabic-phonics-quiz/', 'أ', '#efe8ff', 70),
  ('prophets-stories', 'قصص الأنبياء', 'https://ahmad9077.github.io/quizzes-hub/prophets-stories.html', '📚', '#d4b37d', 80),
  ('quran-al-balad', 'القرآن الكريم - حمود', 'https://ahmad9077.github.io/quizzes-hub/quran/?group=hamoud', 'ق', '#dce9dd', 90),
  ('quran-deema', 'القرآن الكريم - الأول الابتدائي', 'https://ahmad9077.github.io/quizzes-hub/quran/?group=deema', 'ق', '#dce9dd', 100),
  ('science-grade1', 'علوم - بنات', 'https://ahmad9077.github.io/science-grade1-quiz/', '🔬', '#e3f6dc', 110),
  ('science-grade1-boys', 'علوم - أولاد', 'https://ahmad9077.github.io/science-grade1-quiz/boys/', '🔬', '#dcecfb', 111),
  ('english-grade1', 'English', 'https://ahmad9077.github.io/english-grade1-quiz/', '🔤', '#ffe9b8', 120),
  ('arabic-grade1', 'اللغة العربية - الأول الابتدائي', 'https://ahmad9077.github.io/arabic-grade1-quiz/', 'ع', '#d9f1ef', 130),
  ('math-grade1', 'الرياضيات - الأول الابتدائي', 'https://ahmad9077.github.io/math-grade1-quiz/', '🔢', '#dcefff', 140),
  ('social-grade1', 'الاجتماعيات - الأول الابتدائي', 'https://ahmad9077.github.io/social-grade1-quiz/', '🇰🇼', '#e3f4ea', 150),
  ('islamic-grade1', 'التربية الإسلامية - الأول الابتدائي', 'https://ahmad9077.github.io/islamic-grade1-quiz/', '🕌', '#e2f3ee', 160)
on conflict (id) do update set
  title = excluded.title,
  url = excluded.url,
  icon = excluded.icon,
  color = excluded.color,
  sort_order = excluded.sort_order;

alter table public.profiles enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_assignments enable row level security;
alter table public.quiz_progress enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and active = true
  );
$$;

create or replace function public.resolve_login(requested_username text)
returns table (login_email text)
language sql
stable
security definer
set search_path = public
as $$
  select profiles.login_email
  from public.profiles
  where username = lower(trim(requested_username))
    and active = true
  limit 1;
$$;

create or replace function public.admin_delete_user(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'You cannot delete the account you are signed in with.';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = target_user_id
  ) then
    raise exception 'User profile was not found.';
  end if;

  delete from auth.users
  where id = target_user_id;

  return true;
end;
$$;

drop function if exists public.admin_set_assignments(uuid, text[]);

grant execute on function public.resolve_login(text) to anon, authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;

alter table public.quiz_assignments
add column if not exists difficulty text not null default 'medium';

alter table public.quiz_assignments
drop constraint if exists quiz_assignments_difficulty_check,
add constraint quiz_assignments_difficulty_check check (difficulty in ('easy', 'medium', 'hard'));

alter table public.quiz_progress
drop constraint if exists quiz_progress_score_range,
add constraint quiz_progress_score_range check (score <= total);

alter table public.quiz_progress
drop constraint if exists quiz_progress_details_size,
add constraint quiz_progress_details_size check (octet_length(details::text) <= 65536);

drop policy if exists "profiles self or admin select" on public.profiles;
create policy "profiles self or admin select"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "quizzes authenticated select" on public.quizzes;
create policy "quizzes authenticated select"
on public.quizzes
for select
to authenticated
using (true);

drop policy if exists "quiz assignments self or admin select" on public.quiz_assignments;
create policy "quiz assignments self or admin select"
on public.quiz_assignments
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "quiz assignments admin insert" on public.quiz_assignments;
create policy "quiz assignments admin insert"
on public.quiz_assignments
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "quiz assignments admin delete" on public.quiz_assignments;
create policy "quiz assignments admin delete"
on public.quiz_assignments
for delete
to authenticated
using (public.is_admin());

drop policy if exists "quiz progress self insert" on public.quiz_progress;
create policy "quiz progress self insert"
on public.quiz_progress
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.quiz_assignments
    where quiz_assignments.user_id = auth.uid()
      and quiz_assignments.quiz_id = quiz_progress.quiz_id
  )
);

drop policy if exists "quiz progress self or admin select" on public.quiz_progress;
drop policy if exists "quiz progress admin select" on public.quiz_progress;
create policy "quiz progress admin select"
on public.quiz_progress
for select
to authenticated
using (public.is_admin());

-- Groups for the Admin page (same as migrations/026_admin_groups.sql).
alter table public.quiz_assignments
  add column if not exists direct boolean not null default true;

create table if not exists public.quiz_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 60),
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_group_members (
  group_id uuid not null references public.quiz_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists quiz_group_members_user_idx on public.quiz_group_members (user_id);

create table if not exists public.quiz_group_quizzes (
  group_id uuid not null references public.quiz_groups(id) on delete cascade,
  quiz_id text not null references public.quizzes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, quiz_id)
);

create index if not exists quiz_group_quizzes_quiz_idx on public.quiz_group_quizzes (quiz_id);

-- Only the Admin reads groups. Nobody writes them directly: the functions below do.
alter table public.quiz_groups enable row level security;
alter table public.quiz_group_members enable row level security;
alter table public.quiz_group_quizzes enable row level security;

drop policy if exists "quiz groups admin select" on public.quiz_groups;
create policy "quiz groups admin select"
on public.quiz_groups for select to authenticated
using (public.is_admin());

drop policy if exists "quiz group members admin select" on public.quiz_group_members;
create policy "quiz group members admin select"
on public.quiz_group_members for select to authenticated
using (public.is_admin());

drop policy if exists "quiz group quizzes admin select" on public.quiz_group_quizzes;
create policy "quiz group quizzes admin select"
on public.quiz_group_quizzes for select to authenticated
using (public.is_admin());

-- Every member has every activity of their groups, and a row that only a group gave
-- does not outlive that group's grant. Fires on any change, cascades included.
create or replace function public.sync_group_assignments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.quiz_assignments (user_id, quiz_id, direct)
  select distinct m.user_id, q.quiz_id, false
  from public.quiz_group_members m
  join public.quiz_group_quizzes q on q.group_id = m.group_id
  on conflict (user_id, quiz_id) do nothing;

  delete from public.quiz_assignments a
  where a.direct = false
    and not exists (
      select 1
      from public.quiz_group_members m
      join public.quiz_group_quizzes q on q.group_id = m.group_id
      where m.user_id = a.user_id
        and q.quiz_id = a.quiz_id
    );

  return null;
end;
$$;

revoke all on function public.sync_group_assignments() from public, anon, authenticated;

drop trigger if exists quiz_group_members_sync on public.quiz_group_members;
create trigger quiz_group_members_sync
after insert or delete on public.quiz_group_members
for each statement execute function public.sync_group_assignments();

drop trigger if exists quiz_group_quizzes_sync on public.quiz_group_quizzes;
create trigger quiz_group_quizzes_sync
after insert or delete on public.quiz_group_quizzes
for each statement execute function public.sync_group_assignments();

-- The list is now the account's own activities. Activities from its groups stay whatever the
-- list says. A kept activity keeps its difficulty and its date.
create or replace function public.admin_set_assignments(target_user_id uuid, quiz_configs jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = target_user_id
  ) then
    raise exception 'User profile was not found.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(quiz_configs, '[]'::jsonb)) as selected(quiz_id text, difficulty text)
    left join public.quizzes on quizzes.id = selected.quiz_id
    where selected.quiz_id is null
      or quizzes.id is null
      or coalesce(selected.difficulty, 'medium') not in ('easy', 'medium', 'hard')
  ) then
    raise exception 'Unknown quiz assignment.';
  end if;

  insert into public.quiz_assignments (user_id, quiz_id, difficulty, direct)
  select target_user_id, selected.quiz_id, selected.difficulty, true
  from (
    select distinct on (quiz_id)
      quiz_id,
      coalesce(difficulty, 'medium') as difficulty
    from jsonb_to_recordset(coalesce(quiz_configs, '[]'::jsonb)) as selected(quiz_id text, difficulty text)
    order by quiz_id
  ) selected
  on conflict (user_id, quiz_id) do update set direct = true;

  update public.quiz_assignments a
  set direct = false
  where a.user_id = target_user_id
    and a.direct = true
    and not exists (
      select 1
      from jsonb_to_recordset(coalesce(quiz_configs, '[]'::jsonb)) as selected(quiz_id text, difficulty text)
      where selected.quiz_id = a.quiz_id
    );

  delete from public.quiz_assignments a
  where a.user_id = target_user_id
    and a.direct = false
    and not exists (
      select 1
      from public.quiz_group_members m
      join public.quiz_group_quizzes q on q.group_id = m.group_id
      where m.user_id = a.user_id
        and q.quiz_id = a.quiz_id
    );
end;
$$;

create or replace function public.admin_create_group(group_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := btrim(coalesce(group_name, ''));
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if char_length(v_name) not between 2 and 60 then
    raise exception 'Group name is required.';
  end if;

  if exists (select 1 from public.quiz_groups where name = v_name) then
    raise exception 'Group name is taken.';
  end if;

  insert into public.quiz_groups (name) values (v_name) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.admin_rename_group(target_group_id uuid, group_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := btrim(coalesce(group_name, ''));
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if char_length(v_name) not between 2 and 60 then
    raise exception 'Group name is required.';
  end if;

  if exists (select 1 from public.quiz_groups where name = v_name and id <> target_group_id) then
    raise exception 'Group name is taken.';
  end if;

  update public.quiz_groups set name = v_name where id = target_group_id;

  if not found then
    raise exception 'Group was not found.';
  end if;
end;
$$;

-- Members lose what only this group gave them; their accounts and results stay.
create or replace function public.admin_delete_group(target_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  delete from public.quiz_groups where id = target_group_id;

  if not found then
    raise exception 'Group was not found.';
  end if;
end;
$$;

create or replace function public.admin_set_group_quizzes(target_group_id uuid, quiz_ids text[], enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if not exists (select 1 from public.quiz_groups where id = target_group_id) then
    raise exception 'Group was not found.';
  end if;

  if exists (
    select 1 from unnest(coalesce(quiz_ids, '{}')) as wanted(quiz_id)
    where not exists (select 1 from public.quizzes where id = wanted.quiz_id)
  ) then
    raise exception 'Unknown quiz assignment.';
  end if;

  if enabled then
    insert into public.quiz_group_quizzes (group_id, quiz_id)
    select target_group_id, wanted.quiz_id
    from unnest(coalesce(quiz_ids, '{}')) as wanted(quiz_id)
    on conflict (group_id, quiz_id) do nothing;
  else
    delete from public.quiz_group_quizzes
    where group_id = target_group_id
      and quiz_id = any(coalesce(quiz_ids, '{}'));
  end if;
end;
$$;

create or replace function public.admin_set_group_members(target_group_id uuid, user_ids uuid[], enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if not exists (select 1 from public.quiz_groups where id = target_group_id) then
    raise exception 'Group was not found.';
  end if;

  if exists (
    select 1 from unnest(coalesce(user_ids, '{}')) as wanted(user_id)
    where not exists (select 1 from public.profiles where id = wanted.user_id)
  ) then
    raise exception 'User profile was not found.';
  end if;

  if enabled then
    insert into public.quiz_group_members (group_id, user_id)
    select target_group_id, wanted.user_id
    from unnest(coalesce(user_ids, '{}')) as wanted(user_id)
    on conflict (group_id, user_id) do nothing;
  else
    delete from public.quiz_group_members
    where group_id = target_group_id
      and user_id = any(coalesce(user_ids, '{}'));
  end if;
end;
$$;

revoke all on function public.admin_set_assignments(uuid, jsonb) from public, anon;
revoke all on function public.admin_create_group(text) from public, anon;
revoke all on function public.admin_rename_group(uuid, text) from public, anon;
revoke all on function public.admin_delete_group(uuid) from public, anon;
revoke all on function public.admin_set_group_quizzes(uuid, text[], boolean) from public, anon;
revoke all on function public.admin_set_group_members(uuid, uuid[], boolean) from public, anon;

grant execute on function public.admin_set_assignments(uuid, jsonb) to authenticated;
grant execute on function public.admin_create_group(text) to authenticated;
grant execute on function public.admin_rename_group(uuid, text) to authenticated;
grant execute on function public.admin_delete_group(uuid) to authenticated;
grant execute on function public.admin_set_group_quizzes(uuid, text[], boolean) to authenticated;
grant execute on function public.admin_set_group_members(uuid, uuid[], boolean) to authenticated;

-- Bootstrap the first admin after creating the Auth user in Supabase Dashboard.
-- Replace the placeholders and run once:
--
-- insert into public.profiles (id, username, login_email, display_name, role, avatar)
-- values (
--   'AUTH_USER_UUID_HERE',
--   'admin',
--   'admin@users.quizzeshub.local',
--   'Admin',
--   'admin',
--   '⭐'
-- );
