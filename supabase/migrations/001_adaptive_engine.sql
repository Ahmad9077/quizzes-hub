-- ════════════════════════════════════════════════════════════════
-- Adaptive difficulty engine — migration 001
-- Numeric levels 1-100, EMA-based evaluation after 5 daily attempts.
-- All analytics tables are admin-only via RLS.
-- Child UI never receives ema_score, confidence, or adjustment history.
-- Child-facing quiz apps receive selected question keys only. User level,
-- weak topics, and question difficulty labels stay server-side/admin-only.
-- ════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
-- HELPER: merge two topic-stat jsonb objects
-- shape: { "topic": { "correct": N, "total": M }, ... }
-- ────────────────────────────────────────────────────────────────
create or replace function public.merge_topic_stats(a jsonb, b jsonb)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select coalesce(
    jsonb_object_agg(
      key,
      jsonb_build_object(
        'correct', coalesce((a->key->>'correct')::int, 0)
                 + coalesce((b->key->>'correct')::int, 0),
        'total',   coalesce((a->key->>'total')::int,   0)
                 + coalesce((b->key->>'total')::int,   0)
      )
    ), '{}'::jsonb
  )
  from (
    select key from jsonb_object_keys(a) t(key)
    union
    select key from jsonb_object_keys(b) t(key)
  ) keys
$$;
revoke all on function public.merge_topic_stats(jsonb, jsonb)
  from public, anon, authenticated;

-- ────────────────────────────────────────────────────────────────
-- TABLE: question_difficulty_profiles
-- Admin-managed. Populated once per quiz when question banks are labelled.
-- Quiz apps only need stable question keys; difficulty and topic labels stay
-- in Supabase so children do not see them in the page or browser console.
-- ────────────────────────────────────────────────────────────────
create table if not exists public.question_difficulty_profiles (
  id           uuid        primary key default gen_random_uuid(),
  quiz_id      text        not null references public.quizzes(id) on delete cascade,
  question_key text        not null,
  difficulty   integer     not null check (difficulty between 1 and 100),
  topic_tags   text[]      not null default '{}',
  skill_tags   text[]      not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (quiz_id, question_key)
);

-- ────────────────────────────────────────────────────────────────
-- TABLE: user_quiz_adaptive_state
-- One row per (user, quiz). Holds the live level + EMA + topics.
-- No direct child access — all reads go through get_user_quiz_profile.
-- ────────────────────────────────────────────────────────────────
create table if not exists public.user_quiz_adaptive_state (
  id             uuid         primary key default gen_random_uuid(),
  user_id        uuid         not null references auth.users(id) on delete cascade,
  quiz_id        text         not null references public.quizzes(id) on delete cascade,
  -- 1-100 with two decimal places so engine moves feel smooth
  current_level  numeric(5,2) not null default 50.0
                              check (current_level between 1.0 and 100.0),
  -- exponential moving average of session accuracy (0–1)
  ema_score      numeric(6,4) not null default 0.5
                              check (ema_score between 0 and 1),
  -- confidence in the estimate; grows per session, dampens early adjustments
  confidence     numeric(5,4) not null default 0.0
                              check (confidence between 0 and 1),
  weak_topics    text[]       not null default '{}',
  strong_topics  text[]       not null default '{}',
  total_sessions integer      not null default 0,
  last_evaluated timestamptz,
  created_at     timestamptz  not null default now(),
  updated_at     timestamptz  not null default now(),
  unique (user_id, quiz_id)
);

-- ────────────────────────────────────────────────────────────────
-- TABLE: quiz_daily_aggregates
-- Accumulates per-day attempt data. Engine reads this at attempt #5.
-- Admin can see these for monitoring; child cannot.
-- ────────────────────────────────────────────────────────────────
create table if not exists public.quiz_daily_aggregates (
  id             uuid         primary key default gen_random_uuid(),
  user_id        uuid         not null references auth.users(id) on delete cascade,
  quiz_id        text         not null references public.quizzes(id) on delete cascade,
  attempt_date   date         not null default current_date,
  attempt_count  integer      not null default 0,
  total_qs       integer      not null default 0,
  correct_qs     integer      not null default 0,
  avg_difficulty numeric(5,2),
  -- { "geography": { "correct": 3, "total": 5 }, ... }
  topic_stats    jsonb        not null default '{}',
  evaluated      boolean      not null default false,
  created_at     timestamptz  not null default now(),
  updated_at     timestamptz  not null default now(),
  unique (user_id, quiz_id, attempt_date)
);

-- ────────────────────────────────────────────────────────────────
-- TABLE: adaptive_adjustment_log
-- Append-only audit trail. Admin-only. Never exposed to child.
-- ────────────────────────────────────────────────────────────────
create table if not exists public.adaptive_adjustment_log (
  id                 uuid         primary key default gen_random_uuid(),
  user_id            uuid         not null references auth.users(id) on delete cascade,
  quiz_id            text         not null references public.quizzes(id) on delete cascade,
  previous_level     numeric(5,2) not null,
  new_level          numeric(5,2) not null,
  trigger_type       text         not null check (trigger_type in ('engine', 'admin_override')),
  session_accuracy   numeric(5,4),
  ema_before         numeric(6,4),
  ema_after          numeric(6,4),
  adjustment_details jsonb,
  admin_user_id      uuid         references auth.users(id),
  admin_note         text,
  created_at         timestamptz  not null default now()
);

-- ────────────────────────────────────────────────────────────────
-- INDEXES
-- ────────────────────────────────────────────────────────────────
create index if not exists idx_adaptive_state_user_quiz
  on public.user_quiz_adaptive_state (user_id, quiz_id);

create index if not exists idx_daily_agg_user_quiz_date
  on public.quiz_daily_aggregates (user_id, quiz_id, attempt_date);

create index if not exists idx_adjustment_log_user_quiz_time
  on public.adaptive_adjustment_log (user_id, quiz_id, created_at desc);

create index if not exists idx_qdp_quiz_difficulty
  on public.question_difficulty_profiles (quiz_id, difficulty);

-- ────────────────────────────────────────────────────────────────
-- RLS
-- All four tables are inaccessible to non-admin users directly.
-- Quiz apps access adaptive data exclusively through SECURITY DEFINER RPCs.
-- ────────────────────────────────────────────────────────────────
alter table public.question_difficulty_profiles  enable row level security;
alter table public.user_quiz_adaptive_state       enable row level security;
alter table public.quiz_daily_aggregates          enable row level security;
alter table public.adaptive_adjustment_log        enable row level security;

drop policy if exists "qdp admin all"    on public.question_difficulty_profiles;
drop policy if exists "uqas admin all"   on public.user_quiz_adaptive_state;
drop policy if exists "qda admin all"    on public.quiz_daily_aggregates;
drop policy if exists "aal admin select" on public.adaptive_adjustment_log;

create policy "qdp admin all" on public.question_difficulty_profiles
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- No child can ever SELECT this table. Only is_admin() rows qualify.
create policy "uqas admin all" on public.user_quiz_adaptive_state
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "qda admin all" on public.quiz_daily_aggregates
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "aal admin select" on public.adaptive_adjustment_log
  for select to authenticated
  using (public.is_admin());

-- ════════════════════════════════════════════════════════════════
-- ENGINE: evaluate_adaptive_level
-- Internal function. Called by record_quiz_attempt after attempt #5.
-- Not granted to authenticated role — only invoked SECURITY DEFINER.
-- ════════════════════════════════════════════════════════════════
create or replace function public.evaluate_adaptive_level(
  p_user_id uuid,
  p_quiz_id text,
  p_date    date default current_date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agg         quiz_daily_aggregates%rowtype;
  v_state       user_quiz_adaptive_state%rowtype;
  v_accuracy    numeric;
  v_ema_new     numeric;
  v_delta       numeric;
  v_new_level   numeric;
  v_conf_new    numeric;
  v_weak        text[] := '{}';
  v_strong      text[] := '{}';
  v_topic       text;
  v_tdata       jsonb;
  v_tacc        numeric;
  -- α=0.3: new session gets 30% weight, history gets 70%
  alpha     constant numeric := 0.3;
  conf_step constant numeric := 0.1;
begin
  -- Guard: only run when we have 5+ unevaluated attempts for this day
  select * into v_agg
  from public.quiz_daily_aggregates
  where user_id    = p_user_id
    and quiz_id    = p_quiz_id
    and attempt_date = p_date
    and attempt_count >= 5
    and not evaluated;

  if not found then return; end if;

  -- Ensure adaptive state row exists (first-time users start at 50)
  insert into public.user_quiz_adaptive_state (user_id, quiz_id)
  values (p_user_id, p_quiz_id)
  on conflict (user_id, quiz_id) do nothing;

  select * into v_state
  from public.user_quiz_adaptive_state
  where user_id = p_user_id and quiz_id = p_quiz_id;

  -- Session accuracy (0–1) from today's aggregate
  v_accuracy := case
    when v_agg.total_qs > 0
      then v_agg.correct_qs::numeric / v_agg.total_qs
    else 0.5
  end;

  -- EMA update
  v_ema_new := alpha * v_accuracy + (1.0 - alpha) * v_state.ema_score;

  -- Confidence grows 0.1 per evaluated session, caps at 1.0
  -- Low confidence = smaller level moves (protects new users from over-reaction)
  v_conf_new := least(1.0, v_state.confidence + conf_step);

  -- Base delta from EMA bands (symmetric but not identical up/down)
  v_delta := case
    when v_ema_new >= 0.90 then  10.0   -- mastery: move up fast
    when v_ema_new >= 0.80 then   6.0
    when v_ema_new >= 0.70 then   3.0
    when v_ema_new >= 0.60 then   1.5
    when v_ema_new >= 0.50 then   0.5   -- above comfort, nudge up
    when v_ema_new >= 0.45 then   0.0   -- comfort zone, hold
    when v_ema_new >= 0.35 then  -1.5
    when v_ema_new >= 0.25 then  -3.0
    when v_ema_new >= 0.15 then  -6.0
    else                         -10.0  -- struggling: move down fast
  end;

  -- Confidence damping: at conf=0 → 40% of delta; at conf=1 → 100%
  v_delta := v_delta * (0.4 + 0.6 * v_conf_new);

  v_new_level := least(100.0, greatest(1.0, v_state.current_level + v_delta));

  -- Topic weakness: < 50% = weak, >= 80% = strong
  for v_topic, v_tdata in select key, value from jsonb_each(v_agg.topic_stats) loop
    if (v_tdata->>'total')::int > 0 then
      v_tacc := (v_tdata->>'correct')::numeric / (v_tdata->>'total')::int;
      if v_tacc < 0.50 then
        v_weak := array_append(v_weak, v_topic);
      elsif v_tacc >= 0.80 then
        v_strong := array_append(v_strong, v_topic);
      end if;
    end if;
  end loop;

  -- Audit log (always written, even when delta is 0)
  insert into public.adaptive_adjustment_log (
    user_id, quiz_id, previous_level, new_level,
    trigger_type, session_accuracy, ema_before, ema_after,
    adjustment_details
  ) values (
    p_user_id, p_quiz_id, v_state.current_level, v_new_level,
    'engine', v_accuracy, v_state.ema_score, v_ema_new,
    jsonb_build_object(
      'attempt_count', v_agg.attempt_count,
      'total_qs',      v_agg.total_qs,
      'correct_qs',    v_agg.correct_qs,
      'level_delta',   round(v_delta, 2),
      'confidence',    v_conf_new,
      'weak_topics',   v_weak,
      'strong_topics', v_strong
    )
  );

  update public.user_quiz_adaptive_state set
    current_level  = v_new_level,
    ema_score      = v_ema_new,
    confidence     = v_conf_new,
    weak_topics    = v_weak,
    strong_topics  = v_strong,
    total_sessions = total_sessions + 1,
    last_evaluated = now(),
    updated_at     = now()
  where user_id = p_user_id and quiz_id = p_quiz_id;

  -- Mark as evaluated so today's run does not fire again
  update public.quiz_daily_aggregates set
    evaluated  = true,
    updated_at = now()
  where user_id    = p_user_id
    and quiz_id    = p_quiz_id
    and attempt_date = p_date;
end;
$$;
revoke all on function public.evaluate_adaptive_level(uuid, text, date)
  from public, anon, authenticated;

-- ════════════════════════════════════════════════════════════════
-- RPC: record_quiz_attempt
-- Called by quiz apps after every completed attempt.
-- Accumulates daily aggregate, writes to quiz_progress for the
-- admin activity feed, and triggers engine evaluation at attempt 5.
-- Returns only non-sensitive data (attempt counts).
-- ════════════════════════════════════════════════════════════════
create or replace function public.record_quiz_attempt(
  p_quiz_id          text,
  p_total_questions  integer,
  p_correct_answers  integer,
  -- Array of { key, correct }. Pass [] if question keys are not wired yet.
  p_question_results jsonb   default '[]',
  p_avg_difficulty   numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid          uuid := auth.uid();
  v_today        date := current_date;
  v_topic_stats  jsonb;
  v_avg_difficulty numeric;
  v_new_count    integer;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_total_questions <= 0 then
    raise exception 'Total questions must be greater than zero';
  end if;

  if p_correct_answers < 0 or p_correct_answers > p_total_questions then
    raise exception 'Correct answers must be between zero and total questions';
  end if;

  if not exists (
    select 1 from public.quiz_assignments
    where user_id = v_uid and quiz_id = p_quiz_id
  ) then
    raise exception 'Quiz not assigned to this user';
  end if;

  -- Compute average difficulty from server-side labels. p_avg_difficulty is
  -- kept only for backwards compatibility with early client drafts.
  select coalesce(round(avg(qdp.difficulty)::numeric, 2), p_avg_difficulty)
  into v_avg_difficulty
  from jsonb_array_elements(coalesce(p_question_results, '[]'::jsonb)) as q
  left join public.question_difficulty_profiles qdp
    on qdp.quiz_id = p_quiz_id
   and qdp.question_key = q->>'key';

  -- Build topic stats from server-side question labels.
  select coalesce(
    jsonb_object_agg(
      topic,
      jsonb_build_object('correct', correct_count, 'total', total_count)
    ),
    '{}'::jsonb
  )
  into v_topic_stats
  from (
    select
      topic,
      sum(case when correct then 1 else 0 end) as correct_count,
      count(*) as total_count
    from (
      select
        unnest(qdp.topic_tags) as topic,
        coalesce((q->>'correct')::boolean, false) as correct
      from jsonb_array_elements(coalesce(p_question_results, '[]'::jsonb)) as q
      join public.question_difficulty_profiles qdp
        on qdp.quiz_id = p_quiz_id
       and qdp.question_key = q->>'key'
    ) expanded
    group by topic
  ) per_topic;

  -- Keep quiz_progress populated for the admin activity feed (backwards compat)
  insert into public.quiz_progress (user_id, quiz_id, score, total, level, details)
  values (
    v_uid, p_quiz_id,
    p_correct_answers, p_total_questions,
    'adaptive',
    jsonb_build_object(
      'avg_difficulty',    v_avg_difficulty,
      'question_results',  p_question_results
    )
  );

  -- Upsert daily aggregate, running average for avg_difficulty
  insert into public.quiz_daily_aggregates (
    user_id, quiz_id, attempt_date,
    attempt_count, total_qs, correct_qs, avg_difficulty, topic_stats
  )
  values (
    v_uid, p_quiz_id, v_today,
    1, p_total_questions, p_correct_answers,
    v_avg_difficulty, v_topic_stats
  )
  on conflict (user_id, quiz_id, attempt_date) do update set
    attempt_count  = quiz_daily_aggregates.attempt_count + 1,
    total_qs       = quiz_daily_aggregates.total_qs + p_total_questions,
    correct_qs     = quiz_daily_aggregates.correct_qs + p_correct_answers,
    avg_difficulty = case
      when v_avg_difficulty is not null then round((
        coalesce(quiz_daily_aggregates.avg_difficulty, v_avg_difficulty)
          * quiz_daily_aggregates.attempt_count
        + v_avg_difficulty
      ) / (quiz_daily_aggregates.attempt_count + 1), 2)
      else quiz_daily_aggregates.avg_difficulty
    end,
    topic_stats    = public.merge_topic_stats(
                       quiz_daily_aggregates.topic_stats, v_topic_stats
                     ),
    updated_at     = now()
  returning attempt_count into v_new_count;

  -- Fire engine exactly once — at the 5th attempt for this user+quiz+day
  if v_new_count = 5 then
    perform public.evaluate_adaptive_level(v_uid, p_quiz_id, v_today);
  end if;

  return jsonb_build_object(
    'recorded',                   true,
    'attempts_today',             v_new_count,
    'attempts_until_adaptation',  greatest(0, 5 - v_new_count)
  );
end;
$$;

-- ════════════════════════════════════════════════════════════════
-- RPC: get_user_quiz_profile
-- Kept as a narrow compatibility helper. It does not return level, weak
-- topics, EMA, confidence, adjustment history, or difficulty labels.
-- ════════════════════════════════════════════════════════════════
create or replace function public.get_user_quiz_profile(p_quiz_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid         uuid := auth.uid();
  v_today_count integer;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.quiz_assignments
    where user_id = v_uid and quiz_id = p_quiz_id
  ) then
    raise exception 'Quiz not assigned to this user';
  end if;

  select coalesce(attempt_count, 0) into v_today_count
  from public.quiz_daily_aggregates
  where user_id    = v_uid
    and quiz_id    = p_quiz_id
    and attempt_date = current_date;

  return jsonb_build_object(
    'attempts_today', coalesce(v_today_count, 0)
  );
end;
$$;

-- ════════════════════════════════════════════════════════════════
-- RPC: get_quiz_question_keys
-- Child-facing quiz apps call this to receive selected question keys. The
-- current level, weak topics, and difficulty labels never leave Supabase.
-- ════════════════════════════════════════════════════════════════
create or replace function public.get_quiz_question_keys(
  p_quiz_id text,
  p_count integer default 10
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_level numeric := 50.0;
  v_weak text[] := '{}';
  v_keys jsonb;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_count <= 0 or p_count > 50 then
    raise exception 'Question count must be between 1 and 50';
  end if;

  if not exists (
    select 1 from public.quiz_assignments
    where user_id = v_uid and quiz_id = p_quiz_id
  ) then
    raise exception 'Quiz not assigned to this user';
  end if;

  select coalesce(current_level, 50.0), coalesce(weak_topics, '{}')
  into v_level, v_weak
  from public.user_quiz_adaptive_state
  where user_id = v_uid and quiz_id = p_quiz_id;

  v_level := coalesce(v_level, 50.0);
  v_weak := coalesce(v_weak, '{}');

  with ranked as (
    select
      question_key,
      case
        when difficulty between greatest(1, v_level - 15)
                            and least(100, v_level + 10)
          then 0
        else 1
      end as outside_window,
      case when topic_tags && v_weak then 0 else 1 end as topic_priority,
      abs(difficulty - v_level) as level_distance
    from public.question_difficulty_profiles
    where quiz_id = p_quiz_id
    order by topic_priority, outside_window, level_distance, random()
    limit p_count
  )
  select coalesce(jsonb_agg(question_key), '[]'::jsonb)
  into v_keys
  from ranked;

  return jsonb_build_object('question_keys', v_keys);
end;
$$;

-- ════════════════════════════════════════════════════════════════
-- RPC: admin_get_adaptive_analytics
-- Full analytics for admin panel: level, EMA, confidence, topics,
-- recent adjustment log. Never called by child-facing code.
-- ════════════════════════════════════════════════════════════════
create or replace function public.admin_get_adaptive_analytics(
  p_user_id uuid,
  p_quiz_id text
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  return (
    select jsonb_build_object(
      'current_level',  s.current_level,
      'ema_score',      s.ema_score,
      'confidence',     s.confidence,
      'weak_topics',    s.weak_topics,
      'strong_topics',  s.strong_topics,
      'total_sessions', s.total_sessions,
      'last_evaluated', s.last_evaluated,
      'today_aggregate', (
        select row_to_json(d)::jsonb
        from   public.quiz_daily_aggregates d
        where  d.user_id     = p_user_id
          and  d.quiz_id     = p_quiz_id
          and  d.attempt_date = current_date
      ),
      'recent_adjustments', (
        select coalesce(jsonb_agg(
          jsonb_build_object(
            'date',           l.created_at,
            'previous_level', l.previous_level,
            'new_level',      l.new_level,
            'trigger',        l.trigger_type,
            'accuracy',       l.session_accuracy,
            'ema_before',     l.ema_before,
            'ema_after',      l.ema_after,
            'details',        l.adjustment_details,
            'admin_note',     l.admin_note
          ) order by l.created_at desc
        ), '[]'::jsonb)
        from (
          select *
          from public.adaptive_adjustment_log
          where user_id = p_user_id
            and quiz_id = p_quiz_id
          order by created_at desc
          limit 30
        ) l
      )
    )
    from public.user_quiz_adaptive_state s
    where s.user_id = p_user_id
      and s.quiz_id = p_quiz_id
  );
end;
$$;

-- ════════════════════════════════════════════════════════════════
-- RPC: admin_override_quiz_level
-- Admin sets a specific 1-100 level for a user+quiz with a note.
-- Logged to adjustment log. Does not reset EMA or confidence so
-- the engine continues smoothly from the overridden level.
-- ════════════════════════════════════════════════════════════════
create or replace function public.admin_override_quiz_level(
  p_user_id uuid,
  p_quiz_id text,
  p_level   integer,
  p_note    text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prev numeric;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_level not between 1 and 100 then
    raise exception 'Level must be between 1 and 100';
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'User not found';
  end if;

  if not exists (
    select 1 from public.quiz_assignments
    where user_id = p_user_id and quiz_id = p_quiz_id
  ) then
    raise exception 'Quiz not assigned to this user';
  end if;

  -- Create state row if this user has never played the quiz
  insert into public.user_quiz_adaptive_state (user_id, quiz_id, current_level)
  values (p_user_id, p_quiz_id, p_level)
  on conflict (user_id, quiz_id) do nothing;

  select current_level into v_prev
  from public.user_quiz_adaptive_state
  where user_id = p_user_id and quiz_id = p_quiz_id;

  insert into public.adaptive_adjustment_log (
    user_id, quiz_id, previous_level, new_level,
    trigger_type, admin_user_id, admin_note
  ) values (
    p_user_id, p_quiz_id,
    coalesce(v_prev, 50.0), p_level,
    'admin_override', auth.uid(), p_note
  );

  update public.user_quiz_adaptive_state set
    current_level = p_level,
    updated_at    = now()
  where user_id = p_user_id and quiz_id = p_quiz_id;

  return jsonb_build_object('success', true, 'new_level', p_level);
end;
$$;

-- ════════════════════════════════════════════════════════════════
-- GRANTS
-- Internal helpers (merge_topic_stats, evaluate_adaptive_level)
-- are not granted — called only from SECURITY DEFINER context.
-- ════════════════════════════════════════════════════════════════
revoke all on function public.record_quiz_attempt(text, integer, integer, jsonb, numeric)
  from public, anon, authenticated;
revoke all on function public.get_user_quiz_profile(text)
  from public, anon, authenticated;
revoke all on function public.get_quiz_question_keys(text, integer)
  from public, anon, authenticated;
revoke all on function public.admin_get_adaptive_analytics(uuid, text)
  from public, anon, authenticated;
revoke all on function public.admin_override_quiz_level(uuid, text, integer, text)
  from public, anon, authenticated;

grant execute on function public.record_quiz_attempt(text, integer, integer, jsonb, numeric)
  to authenticated;
grant execute on function public.get_user_quiz_profile(text)
  to authenticated;
grant execute on function public.get_quiz_question_keys(text, integer)
  to authenticated;
grant execute on function public.admin_get_adaptive_analytics(uuid, text)
  to authenticated;
grant execute on function public.admin_override_quiz_level(uuid, text, integer, text)
  to authenticated;
