-- Challenge Mode is intentionally separate from quiz progress and adaptive
-- tracking. It stores short-lived live session state only.

create table if not exists public.challenge_sessions (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  quiz_id text not null references public.quizzes(id) on delete cascade,
  host_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'waiting'
    check (status in ('waiting', 'active', 'finished', 'abandoned')),
  question_queue jsonb not null default '[]'::jsonb
    check (jsonb_typeof(question_queue) = 'array'),
  current_turn_index integer not null default 0 check (current_turn_index >= 0),
  winner_id uuid references public.profiles(id) on delete set null,
  loser_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '6 hours')
);

create table if not exists public.challenge_players (
  session_id uuid not null references public.challenge_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  is_host boolean not null default false,
  wrong_count integer not null default 0 check (wrong_count >= 0 and wrong_count <= 3),
  joined_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

create table if not exists public.challenge_turns (
  session_id uuid not null references public.challenge_sessions(id) on delete cascade,
  turn_index integer not null check (turn_index >= 0),
  answering_player_id uuid not null references public.profiles(id) on delete cascade,
  question_key text not null,
  answer_text text,
  is_correct boolean not null,
  answered_at timestamptz not null default now(),
  primary key (session_id, turn_index),
  constraint challenge_turns_answer_size check (answer_text is null or length(answer_text) <= 500)
);

create index if not exists idx_challenge_sessions_open
  on public.challenge_sessions (status, quiz_id, created_at desc)
  where status = 'waiting';

create index if not exists idx_challenge_players_user
  on public.challenge_players (user_id, session_id);

create index if not exists idx_challenge_turns_session_time
  on public.challenge_turns (session_id, turn_index desc);

alter table public.challenge_sessions enable row level security;
alter table public.challenge_players enable row level security;
alter table public.challenge_turns enable row level security;

create or replace function public.challenge_has_quiz_access(p_user_id uuid, p_quiz_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_user_id = auth.uid() and exists (
    select 1
    from public.profiles p
    join public.quiz_assignments qa on qa.user_id = p.id
    where p.id = p_user_id
      and p.active = true
      and qa.quiz_id = p_quiz_id
  );
$$;

create or replace function public.challenge_is_participant(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.challenge_players cp
    join public.profiles p on p.id = cp.user_id
    where cp.session_id = p_session_id
      and cp.user_id = auth.uid()
      and p.active = true
  );
$$;

drop policy if exists "challenge sessions participant or open select" on public.challenge_sessions;
create policy "challenge sessions participant or open select"
on public.challenge_sessions
for select
to authenticated
using (
  public.challenge_is_participant(id)
  or (
    status = 'waiting'
    and expires_at > now()
    and public.challenge_has_quiz_access(auth.uid(), quiz_id)
  )
);

drop policy if exists "challenge players participant select" on public.challenge_players;
create policy "challenge players participant select"
on public.challenge_players
for select
to authenticated
using (public.challenge_is_participant(session_id));

drop policy if exists "challenge turns participant select" on public.challenge_turns;
create policy "challenge turns participant select"
on public.challenge_turns
for select
to authenticated
using (public.challenge_is_participant(session_id));

create or replace function public.get_challenge_state(p_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_session public.challenge_sessions%rowtype;
  v_player_ids uuid[];
  v_players jsonb := '[]'::jsonb;
  v_current_answerer uuid;
  v_current_question_key text;
  v_queue_length integer := 0;
  v_last_turn jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated.';
  end if;

  select *
  into v_session
  from public.challenge_sessions
  where id = p_session_id;

  if not found then
    raise exception 'Challenge session was not found.';
  end if;

  if not public.challenge_is_participant(p_session_id)
     and not (
       v_session.status = 'waiting'
       and v_session.expires_at > now()
       and public.challenge_has_quiz_access(auth.uid(), v_session.quiz_id)
     ) then
    raise exception 'Challenge access denied.';
  end if;

  select
    coalesce(array_agg(cp.user_id order by cp.is_host desc, cp.joined_at asc), '{}'),
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'user_id', cp.user_id,
          'display_name', p.display_name,
          'avatar', p.avatar,
          'is_host', cp.is_host,
          'wrong_count', cp.wrong_count,
          'joined_at', cp.joined_at
        )
        order by cp.is_host desc, cp.joined_at asc
      ),
      '[]'::jsonb
    )
  into v_player_ids, v_players
  from public.challenge_players cp
  join public.profiles p on p.id = cp.user_id
  where cp.session_id = p_session_id;

  v_queue_length := jsonb_array_length(coalesce(v_session.question_queue, '[]'::jsonb));

  if v_session.status = 'active'
     and array_length(v_player_ids, 1) = 2
     and v_queue_length > v_session.current_turn_index then
    v_current_answerer := v_player_ids[((v_session.current_turn_index % 2) + 1)];
    v_current_question_key := v_session.question_queue ->> v_session.current_turn_index;
  end if;

  select jsonb_build_object(
    'turn_index', ct.turn_index,
    'answering_player_id', ct.answering_player_id,
    'question_key', ct.question_key,
    'answer_text', ct.answer_text,
    'is_correct', ct.is_correct,
    'answered_at', ct.answered_at
  )
  into v_last_turn
  from public.challenge_turns ct
  where ct.session_id = p_session_id
  order by ct.turn_index desc
  limit 1;

  return jsonb_build_object(
    'id', v_session.id,
    'invite_code', v_session.invite_code,
    'quiz_id', v_session.quiz_id,
    'quiz', (
      select jsonb_build_object(
        'id', q.id,
        'title', q.title,
        'url', q.url,
        'icon', q.icon,
        'color', q.color
      )
      from public.quizzes q
      where q.id = v_session.quiz_id
    ),
    'host_id', v_session.host_id,
    'status', v_session.status,
    'players', v_players,
    'current_turn_index', v_session.current_turn_index,
    'current_answering_user_id', v_current_answerer,
    'current_question_key', v_current_question_key,
    'winner_id', v_session.winner_id,
    'loser_id', v_session.loser_id,
    'last_turn', v_last_turn,
    'created_at', v_session.created_at,
    'updated_at', v_session.updated_at,
    'expires_at', v_session.expires_at
  );
end;
$$;

create or replace function public.list_open_challenge_sessions()
returns table (
  session_id uuid,
  invite_code text,
  quiz_id text,
  quiz_title text,
  quiz_icon text,
  host_display_name text,
  player_count integer,
  created_at timestamptz,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    s.invite_code,
    s.quiz_id,
    q.title,
    q.icon,
    p.display_name,
    count(cp.user_id)::integer,
    s.created_at,
    s.expires_at
  from public.challenge_sessions s
  join public.quizzes q on q.id = s.quiz_id
  join public.profiles p on p.id = s.host_id
  left join public.challenge_players cp on cp.session_id = s.id
  where s.status = 'waiting'
    and s.expires_at > now()
    and s.host_id <> auth.uid()
    and public.challenge_has_quiz_access(auth.uid(), s.quiz_id)
  group by s.id, q.title, q.icon, p.display_name
  having count(cp.user_id) < 2
  order by s.created_at desc
  limit 30;
$$;

create or replace function public.create_challenge_session(p_quiz_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_session_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated.';
  end if;

  if not public.challenge_has_quiz_access(v_uid, p_quiz_id) then
    raise exception 'Quiz is not assigned to this user.';
  end if;

  if not exists (select 1 from public.quizzes where id = p_quiz_id) then
    raise exception 'Quiz was not found.';
  end if;

  update public.challenge_sessions
  set status = 'abandoned',
      updated_at = now()
  where host_id = v_uid
    and status = 'waiting';

  insert into public.challenge_sessions (quiz_id, host_id)
  values (p_quiz_id, v_uid)
  returning id into v_session_id;

  insert into public.challenge_players (session_id, user_id, is_host)
  values (v_session_id, v_uid, true);

  return public.get_challenge_state(v_session_id);
end;
$$;

create or replace function public.join_challenge_session(
  p_session_id uuid default null,
  p_invite_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_session public.challenge_sessions%rowtype;
  v_player_count integer;
begin
  if v_uid is null then
    raise exception 'Not authenticated.';
  end if;

  select *
  into v_session
  from public.challenge_sessions
  where (p_session_id is not null and id = p_session_id)
     or (p_session_id is null and p_invite_code is not null and invite_code = upper(trim(p_invite_code)))
  for update;

  if not found then
    raise exception 'Challenge session was not found.';
  end if;

  if exists (
    select 1 from public.challenge_players
    where session_id = v_session.id
      and user_id = v_uid
  ) then
    return public.get_challenge_state(v_session.id);
  end if;

  if v_session.status <> 'waiting' or v_session.expires_at <= now() then
    raise exception 'Challenge session is not open.';
  end if;

  if not public.challenge_has_quiz_access(v_uid, v_session.quiz_id) then
    raise exception 'Quiz is not assigned to this user.';
  end if;

  select count(*)::integer
  into v_player_count
  from public.challenge_players
  where session_id = v_session.id;

  if v_player_count >= 2 then
    raise exception 'Challenge session is full.';
  end if;

  insert into public.challenge_players (session_id, user_id, is_host)
  values (v_session.id, v_uid, false);

  update public.challenge_sessions
  set updated_at = now()
  where id = v_session.id;

  return public.get_challenge_state(v_session.id);
end;
$$;

create or replace function public.start_challenge_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_session public.challenge_sessions%rowtype;
  v_player_count integer;
  v_queue jsonb := '[]'::jsonb;
  v_queue_count integer := 0;
begin
  if v_uid is null then
    raise exception 'Not authenticated.';
  end if;

  select *
  into v_session
  from public.challenge_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Challenge session was not found.';
  end if;

  if v_session.host_id <> v_uid then
    raise exception 'Only the host can start this challenge.';
  end if;

  if v_session.status <> 'waiting' or v_session.expires_at <= now() then
    raise exception 'Challenge session cannot be started.';
  end if;

  select count(*)::integer
  into v_player_count
  from public.challenge_players
  where session_id = p_session_id;

  if v_player_count <> 2 then
    raise exception 'Challenge needs two players.';
  end if;

  with sampled as (
    select question_key
    from public.question_difficulty_profiles
    where quiz_id = v_session.quiz_id
    order by random()
    limit 120
  )
  select coalesce(jsonb_agg(question_key), '[]'::jsonb), count(*)::integer
  into v_queue, v_queue_count
  from sampled;

  if v_queue_count = 0 then
    raise exception 'No challenge questions are configured for this quiz.';
  end if;

  update public.challenge_sessions
  set status = 'active',
      question_queue = v_queue,
      current_turn_index = 0,
      updated_at = now(),
      expires_at = now() + interval '6 hours'
  where id = p_session_id;

  return public.get_challenge_state(p_session_id);
end;
$$;

create or replace function public.submit_challenge_answer(
  p_session_id uuid,
  p_answer_text text,
  p_is_correct boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_session public.challenge_sessions%rowtype;
  v_player_ids uuid[];
  v_answering_player uuid;
  v_question_key text;
  v_queue_length integer;
  v_wrong_count integer := 0;
  v_winner_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated.';
  end if;

  select *
  into v_session
  from public.challenge_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Challenge session was not found.';
  end if;

  if v_session.status <> 'active' or v_session.expires_at <= now() then
    raise exception 'Challenge session is not active.';
  end if;

  select array_agg(user_id order by is_host desc, joined_at asc)
  into v_player_ids
  from public.challenge_players
  where session_id = p_session_id;

  if array_length(v_player_ids, 1) <> 2 then
    raise exception 'Challenge needs two players.';
  end if;

  v_answering_player := v_player_ids[((v_session.current_turn_index % 2) + 1)];

  if v_answering_player <> v_uid then
    raise exception 'It is not this user''s turn.';
  end if;

  v_queue_length := jsonb_array_length(v_session.question_queue);
  if v_session.current_turn_index >= v_queue_length then
    raise exception 'No challenge questions remain.';
  end if;

  v_question_key := v_session.question_queue ->> v_session.current_turn_index;

  if exists (
    select 1 from public.challenge_turns
    where session_id = p_session_id
      and turn_index = v_session.current_turn_index
  ) then
    raise exception 'This turn has already been answered.';
  end if;

  insert into public.challenge_turns (
    session_id,
    turn_index,
    answering_player_id,
    question_key,
    answer_text,
    is_correct
  )
  values (
    p_session_id,
    v_session.current_turn_index,
    v_uid,
    v_question_key,
    nullif(left(coalesce(p_answer_text, ''), 500), ''),
    coalesce(p_is_correct, false)
  );

  if not coalesce(p_is_correct, false) then
    update public.challenge_players
    set wrong_count = least(3, wrong_count + 1)
    where session_id = p_session_id
      and user_id = v_uid
    returning wrong_count into v_wrong_count;
  end if;

  if v_wrong_count >= 3 then
    v_winner_id := case when v_player_ids[1] = v_uid then v_player_ids[2] else v_player_ids[1] end;

    update public.challenge_sessions
    set status = 'finished',
        current_turn_index = current_turn_index + 1,
        winner_id = v_winner_id,
        loser_id = v_uid,
        updated_at = now()
    where id = p_session_id;
  else
    update public.challenge_sessions
    set current_turn_index = current_turn_index + 1,
        status = case
          when current_turn_index + 1 >= v_queue_length then 'finished'
          else status
        end,
        updated_at = now()
    where id = p_session_id;
  end if;

  return public.get_challenge_state(p_session_id);
end;
$$;

create or replace function public.abandon_challenge_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_session public.challenge_sessions%rowtype;
begin
  if v_uid is null then
    raise exception 'Not authenticated.';
  end if;

  select *
  into v_session
  from public.challenge_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Challenge session was not found.';
  end if;

  if not exists (
    select 1 from public.challenge_players
    where session_id = p_session_id
      and user_id = v_uid
  ) then
    raise exception 'Challenge access denied.';
  end if;

  if v_session.status in ('finished', 'abandoned') then
    return public.get_challenge_state(p_session_id);
  end if;

  update public.challenge_sessions
  set status = 'abandoned',
      updated_at = now()
  where id = p_session_id;

  return public.get_challenge_state(p_session_id);
end;
$$;

create or replace function public.purge_expired_challenges()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer := 0;
begin
  delete from public.challenge_sessions
  where expires_at < now()
     or (status in ('finished', 'abandoned') and updated_at < now() - interval '6 hours');

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.challenge_has_quiz_access(uuid, text) from public, anon, authenticated;
revoke all on function public.challenge_is_participant(uuid) from public, anon, authenticated;
revoke all on function public.get_challenge_state(uuid) from public, anon, authenticated;
revoke all on function public.list_open_challenge_sessions() from public, anon, authenticated;
revoke all on function public.create_challenge_session(text) from public, anon, authenticated;
revoke all on function public.join_challenge_session(uuid, text) from public, anon, authenticated;
revoke all on function public.start_challenge_session(uuid) from public, anon, authenticated;
revoke all on function public.submit_challenge_answer(uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.abandon_challenge_session(uuid) from public, anon, authenticated;
revoke all on function public.purge_expired_challenges() from public, anon, authenticated;

grant execute on function public.challenge_has_quiz_access(uuid, text) to authenticated;
grant execute on function public.challenge_is_participant(uuid) to authenticated;
grant execute on function public.get_challenge_state(uuid) to authenticated;
grant execute on function public.list_open_challenge_sessions() to authenticated;
grant execute on function public.create_challenge_session(text) to authenticated;
grant execute on function public.join_challenge_session(uuid, text) to authenticated;
grant execute on function public.start_challenge_session(uuid) to authenticated;
grant execute on function public.submit_challenge_answer(uuid, text, boolean) to authenticated;
grant execute on function public.abandon_challenge_session(uuid) to authenticated;
grant execute on function public.purge_expired_challenges() to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.challenge_sessions;
exception
  when duplicate_object or undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.challenge_players;
exception
  when duplicate_object or undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.challenge_turns;
exception
  when duplicate_object or undefined_object then null;
end $$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.unschedule('quizzes-hub-challenge-cleanup');
    exception
      when others then null;
    end;

    perform cron.schedule(
      'quizzes-hub-challenge-cleanup',
      '17 * * * *',
      'select public.purge_expired_challenges();'
    );
  end if;
end $$;
