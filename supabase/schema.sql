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
  completed_at timestamptz not null default now()
);

insert into public.quizzes (id, title, url, icon, color, sort_order)
values
  ('world-flags', 'World Flags Quiz', 'https://ahmad9077.github.io/world-flags-quiz/', '🌍', '#e5f8ff', 10),
  ('country-map', 'Country Map Quiz', 'https://ahmad9077.github.io/country-map-quiz/', '🗺️', '#eafff9', 20),
  ('spelling', 'Spelling Quiz', 'https://ahmad9077.github.io/spelling-quiz/', '🔤', '#fff2bf', 30),
  ('picture-reading', 'Picture Reading Quiz', 'https://ahmad9077.github.io/little-words-picture-quiz/', '📖', '#ffece6', 40)
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

grant execute on function public.resolve_login(text) to anon, authenticated;
grant execute on function public.is_admin() to authenticated;

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
create policy "quiz progress self or admin select"
on public.quiz_progress
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

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
