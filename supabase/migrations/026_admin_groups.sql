-- Groups for the Admin page: a group holds members and activities, and every member gets the
-- group's activities. An account can also have activities of its own, as before.
--
-- A group never replaces public.quiz_assignments: triggers keep that table filled, so the access
-- guard, the dashboard, progress rules, the adaptive engine and Challenge Mode read it unchanged.
-- quiz_assignments.direct says whether the Admin gave the activity to the account itself
-- (existing rows are all direct). A row with direct = false exists only because of a group, and
-- it goes away when no group gives that activity to that account any more.
-- Removing an activity never touches results: quiz_progress and the adaptive state stay.

begin;

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

-- Nothing an account has today changes: every existing row is its own, and no group exists yet.
do $$
begin
  if exists (select 1 from public.quiz_assignments where direct = false) then
    raise exception 'Existing assignments must all stay direct';
  end if;
end
$$;

commit;

select
  (select count(*) from public.quiz_assignments) as assignments_total,
  (select count(*) from public.quiz_assignments where direct) as assignments_direct,
  (select count(*) from public.quiz_groups) as groups_total;
