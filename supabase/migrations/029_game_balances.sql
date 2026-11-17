-- Game balances: the points a child holds in a Hub game («البقالة» first), kept on the server so
-- the Admin can see a balance and reset it, and so it follows the child to another device.
-- Creates no assignments and touches no existing row.
--
-- A balance carries an epoch: the number of resets it has seen. A reset (by the Admin here, or by
-- a parent inside the game) raises the epoch. Between resets points only grow, so for one epoch
-- the larger number is the true one, and a larger epoch always wins.

begin;

create table if not exists public.game_balances (
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_id text not null references public.quizzes(id) on delete cascade,
  points integer not null default 0 check (points between 0 and 1000),
  epoch integer not null default 0 check (epoch >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

alter table public.game_balances enable row level security;

revoke all on public.game_balances from anon;
revoke insert, update, delete, truncate on public.game_balances from authenticated;
grant select on public.game_balances to authenticated;

-- A child reads their own balance, the Admin reads all. Nobody writes directly: the functions do.
drop policy if exists "game balances self or admin select" on public.game_balances;
create policy "game balances self or admin select"
on public.game_balances
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

-- The game reports what it holds and gets back what stands.
create or replace function public.game_balance_sync(p_game_id text, p_points integer, p_epoch integer)
returns table (points integer, epoch integer)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  me uuid := auth.uid();
  new_points integer := greatest(0, least(coalesce(p_points, 0), 1000));
  new_epoch integer := greatest(0, coalesce(p_epoch, 0));
begin
  if me is null then
    raise exception 'Sign-in required.';
  end if;

  if not exists (
    select 1
    from public.quiz_assignments
    where quiz_assignments.user_id = me
      and quiz_assignments.quiz_id = p_game_id
  ) then
    raise exception 'This activity is not assigned to this account.';
  end if;

  return query
  insert into public.game_balances as balance (user_id, game_id, points, epoch)
  values (me, p_game_id, new_points, new_epoch)
  on conflict (user_id, game_id) do update set
    points = case
      when excluded.epoch > balance.epoch then excluded.points
      when excluded.epoch = balance.epoch then greatest(balance.points, excluded.points)
      else balance.points
    end,
    epoch = greatest(balance.epoch, excluded.epoch),
    updated_at = now()
  returning balance.points, balance.epoch;
end;
$$;

-- The Admin sets a child's balance back to zero; the game adopts it at its next sync.
create or replace function public.admin_reset_game_balance(target_user_id uuid, p_game_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  insert into public.game_balances as balance (user_id, game_id, points, epoch)
  values (target_user_id, p_game_id, 0, 1)
  on conflict (user_id, game_id) do update set
    points = 0,
    epoch = balance.epoch + 1,
    updated_at = now();

  return true;
end;
$$;

revoke all on function public.game_balance_sync(text, integer, integer) from public, anon;
revoke all on function public.admin_reset_game_balance(uuid, text) from public, anon;

grant execute on function public.game_balance_sync(text, integer, integer) to authenticated;
grant execute on function public.admin_reset_game_balance(uuid, text) to authenticated;

commit;
