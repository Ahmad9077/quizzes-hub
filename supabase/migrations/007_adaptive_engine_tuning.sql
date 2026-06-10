-- ════════════════════════════════════════════════════════════════
-- Adaptive engine tuning — migration 007
--
-- 1. Trailing-window evaluation: all unevaluated days up to the
--    evaluation date are pooled, so children who play only once or
--    twice a day still adapt once 3 attempts have accumulated.
--    (Previously a single day needed 3+ attempts or its data was
--    dropped forever.)
-- 2. Self-healing daily run: the cron now picks up every unevaluated
--    aggregate on or before the target date, so a missed run no
--    longer loses a day permanently.
-- 3. Retuned level bands: the engine now holds steady around 65-75%
--    accuracy instead of equilibrating below 50%, which was
--    demotivating for kids.
-- 4. Difficulty-aware deltas: served question difficulty (already
--    recorded as avg_difficulty) now scales the level move.
-- 5. Persistent per-topic mastery (new topic_mastery column): weak /
--    strong topics come from a per-topic EMA with a minimum sample
--    size instead of being overwritten by one day's tiny sample.
-- 6. Confidence decays after long inactivity so a stale estimate is
--    not trusted at full strength on return.
-- 7. record_quiz_attempt derives correct/total counts server-side
--    from question_results when provided, so the scalar inputs
--    cannot disagree with the detailed payload.
-- 8. get_quiz_question_keys: difficulty window now outranks weak
--    topics, weak-topic questions are interleaved at ~30% of any
--    prefix instead of front-loaded, and questions served in the
--    last 3 recorded attempts (any device) sort to the back.
-- ════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
-- Persistent per-topic mastery
-- shape: { "topic": { "ema": 0.62, "samples": 14 }, ... }
-- ────────────────────────────────────────────────────────────────
alter table public.user_quiz_adaptive_state
  add column if not exists topic_mastery jsonb not null default '{}';

-- ════════════════════════════════════════════════════════════════
-- ENGINE: evaluate_adaptive_level (trailing-window version)
-- Pools every unevaluated daily aggregate up to p_date for the
-- user+quiz. Runs only when the pooled attempts reach 3.
-- ════════════════════════════════════════════════════════════════
create or replace function public.evaluate_adaptive_level(
  p_user_id uuid,
  p_quiz_id text,
  p_date    date default ((now() at time zone 'Asia/Kuwait')::date)
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state         user_quiz_adaptive_state%rowtype;
  r               record;
  v_attempts      integer := 0;
  v_total_qs      integer := 0;
  v_correct_qs    integer := 0;
  v_diff_sum      numeric := 0;
  v_diff_attempts integer := 0;
  v_avg_diff      numeric;
  v_topic_stats   jsonb := '{}'::jsonb;
  v_window_start  date;
  v_window_end    date;
  v_days_idle     integer := 0;
  v_conf_base     numeric;
  v_accuracy      numeric;
  v_ema_new       numeric;
  v_delta         numeric;
  v_diff_factor   numeric := 1.0;
  v_new_level     numeric;
  v_conf_new      numeric;
  v_mastery       jsonb;
  v_weak          text[] := '{}';
  v_strong        text[] := '{}';
  v_topic         text;
  v_tdata         jsonb;
  v_t_total       integer;
  v_t_correct     integer;
  v_t_ema         numeric;
  v_t_samples     integer;
  -- α=0.3: the pooled window gets 30% weight, history gets 70%
  alpha             constant numeric := 0.3;
  -- per-topic data is sparser, so each window weighs more
  topic_alpha       constant numeric := 0.4;
  conf_step         constant numeric := 0.1;
  min_attempts      constant integer := 3;
  min_topic_samples constant integer := 4;
begin
  -- Pool every unevaluated day up to p_date (trailing window)
  for r in
    select *
    from public.quiz_daily_aggregates
    where user_id      = p_user_id
      and quiz_id      = p_quiz_id
      and attempt_date <= p_date
      and not evaluated
    order by attempt_date
  loop
    v_attempts   := v_attempts + r.attempt_count;
    v_total_qs   := v_total_qs + r.total_qs;
    v_correct_qs := v_correct_qs + r.correct_qs;
    if r.avg_difficulty is not null then
      v_diff_sum      := v_diff_sum + r.avg_difficulty * r.attempt_count;
      v_diff_attempts := v_diff_attempts + r.attempt_count;
    end if;
    v_topic_stats  := public.merge_topic_stats(v_topic_stats, r.topic_stats);
    v_window_start := coalesce(v_window_start, r.attempt_date);
    v_window_end   := r.attempt_date;
  end loop;

  if v_attempts < min_attempts then return; end if;

  v_avg_diff := case
    when v_diff_attempts > 0 then round(v_diff_sum / v_diff_attempts, 2)
  end;

  insert into public.user_quiz_adaptive_state (user_id, quiz_id)
  values (p_user_id, p_quiz_id)
  on conflict (user_id, quiz_id) do nothing;

  select * into v_state
  from public.user_quiz_adaptive_state
  where user_id = p_user_id and quiz_id = p_quiz_id;

  -- Session accuracy (0–1) pooled over the window
  v_accuracy := case
    when v_total_qs > 0 then v_correct_qs::numeric / v_total_qs
    else 0.5
  end;

  v_ema_new := alpha * v_accuracy + (1.0 - alpha) * v_state.ema_score;

  -- Long inactivity makes the old estimate stale: shed 0.1 confidence
  -- per full week away beyond the first, floored at 0.2.
  v_conf_base := v_state.confidence;
  if v_state.last_evaluated is not null then
    v_days_idle := greatest(
      0,
      v_window_start - (v_state.last_evaluated at time zone 'Asia/Kuwait')::date
    );
    if v_days_idle >= 14 and v_conf_base > 0.2 then
      v_conf_base := greatest(0.2, v_conf_base - 0.1 * (v_days_idle / 7 - 1));
    end if;
  end if;
  v_conf_new := least(1.0, v_conf_base + conf_step);

  -- Bands hold around 65-75% accuracy: high enough to feel rewarding
  -- for kids, low enough that there is still something to learn.
  v_delta := case
    when v_ema_new >= 0.95 then  10.0   -- near-perfect: move up fast
    when v_ema_new >= 0.88 then   6.0
    when v_ema_new >= 0.80 then   3.0
    when v_ema_new >= 0.72 then   1.0   -- upper comfort, gentle nudge
    when v_ema_new >= 0.62 then   0.0   -- comfort zone, hold
    when v_ema_new >= 0.52 then  -1.5
    when v_ema_new >= 0.40 then  -3.0
    when v_ema_new >= 0.25 then  -6.0
    else                        -10.0   -- struggling: move down fast
  end;

  -- Success on harder-than-level questions counts more (and on easier
  -- ones less); failure on easier-than-level questions counts more
  -- (and on harder ones less).
  if v_avg_diff is not null then
    v_diff_factor := least(1.25, greatest(0.50,
      v_avg_diff / greatest(v_state.current_level, 1.0)));
    if v_delta > 0 then
      v_delta := v_delta * v_diff_factor;
    elsif v_delta < 0 then
      v_delta := v_delta * (2.0 - v_diff_factor);
    end if;
  end if;

  -- Confidence damping: at conf=0 → 40% of delta; at conf=1 → 100%
  v_delta := v_delta * (0.4 + 0.6 * v_conf_new);
  v_delta := least(12.0, greatest(-12.0, v_delta));
  v_new_level := least(100.0, greatest(1.0, v_state.current_level + v_delta));

  -- Fold the window's per-topic results into the persistent mastery EMA
  v_mastery := coalesce(v_state.topic_mastery, '{}'::jsonb);
  for v_topic, v_tdata in select key, value from jsonb_each(v_topic_stats) loop
    v_t_total := coalesce((v_tdata->>'total')::int, 0);
    if v_t_total <= 0 then continue; end if;
    v_t_correct := coalesce((v_tdata->>'correct')::int, 0);
    v_t_ema     := coalesce((v_mastery->v_topic->>'ema')::numeric, 0.5);
    v_t_samples := coalesce((v_mastery->v_topic->>'samples')::int, 0);
    v_t_ema     := round(
      topic_alpha * (v_t_correct::numeric / v_t_total)
      + (1.0 - topic_alpha) * v_t_ema, 4);
    v_t_samples := v_t_samples + v_t_total;
    v_mastery   := jsonb_set(v_mastery, array[v_topic],
      jsonb_build_object('ema', v_t_ema, 'samples', v_t_samples));
  end loop;

  -- Weak/strong need a persistent EMA and enough samples — one wrong
  -- answer on a rarely-seen topic no longer flags it, and topics keep
  -- their status across days they were not played.
  for v_topic, v_tdata in select key, value from jsonb_each(v_mastery) loop
    if coalesce((v_tdata->>'samples')::int, 0) >= min_topic_samples then
      if (v_tdata->>'ema')::numeric < 0.55 then
        v_weak := array_append(v_weak, v_topic);
      elsif (v_tdata->>'ema')::numeric >= 0.85 then
        v_strong := array_append(v_strong, v_topic);
      end if;
    end if;
  end loop;

  insert into public.adaptive_adjustment_log (
    user_id, quiz_id, previous_level, new_level,
    trigger_type, session_accuracy, ema_before, ema_after,
    adjustment_details
  ) values (
    p_user_id, p_quiz_id, v_state.current_level, v_new_level,
    'engine', v_accuracy, v_state.ema_score, v_ema_new,
    jsonb_build_object(
      'attempt_count',         v_attempts,
      'total_qs',              v_total_qs,
      'correct_qs',            v_correct_qs,
      'avg_difficulty',        v_avg_diff,
      'difficulty_factor',     round(v_diff_factor, 2),
      'level_delta',           round(v_delta, 2),
      'confidence',            v_conf_new,
      'days_idle',             v_days_idle,
      'weak_topics',           v_weak,
      'strong_topics',         v_strong,
      'window_start',          v_window_start,
      'window_end',            v_window_end,
      'evaluation_threshold',  min_attempts,
      'evaluation_schedule',   'daily_5am'
    )
  );

  update public.user_quiz_adaptive_state set
    current_level  = v_new_level,
    ema_score      = v_ema_new,
    confidence     = v_conf_new,
    weak_topics    = v_weak,
    strong_topics  = v_strong,
    topic_mastery  = v_mastery,
    total_sessions = total_sessions + 1,
    last_evaluated = now(),
    updated_at     = now()
  where user_id = p_user_id and quiz_id = p_quiz_id;

  update public.quiz_daily_aggregates set
    evaluated  = true,
    updated_at = now()
  where user_id      = p_user_id
    and quiz_id      = p_quiz_id
    and attempt_date <= p_date
    and not evaluated;
end;
$$;

revoke all on function public.evaluate_adaptive_level(uuid, text, date)
  from public, anon, authenticated;

-- ════════════════════════════════════════════════════════════════
-- DAILY RUN: run_due_adaptive_evaluations (self-healing version)
-- Considers every unevaluated aggregate on or before p_date, grouped
-- per user+quiz, so missed cron runs and slow accumulators both
-- catch up automatically.
-- ════════════════════════════════════════════════════════════════
create or replace function public.run_due_adaptive_evaluations(
  p_date date default ((now() at time zone 'Asia/Kuwait')::date - 1)
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_processed integer := 0;
  v_pending   integer := 0;
  v_failed    integer := 0;
  v_errors    jsonb := '[]'::jsonb;
begin
  for r in
    select user_id, quiz_id
    from public.quiz_daily_aggregates
    where attempt_date <= p_date
      and not evaluated
    group by user_id, quiz_id
    having sum(attempt_count) >= 3
    order by user_id, quiz_id
  loop
    begin
      perform public.evaluate_adaptive_level(r.user_id, r.quiz_id, p_date);
      v_processed := v_processed + 1;
    exception when others then
      v_failed := v_failed + 1;
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'user_id', r.user_id,
        'quiz_id', r.quiz_id,
        'error',   sqlerrm
      ));
    end;
  end loop;

  -- Pairs still accumulating toward the threshold (kept, not dropped)
  select count(*) into v_pending
  from (
    select 1
    from public.quiz_daily_aggregates
    where attempt_date <= p_date
      and not evaluated
    group by user_id, quiz_id
    having sum(attempt_count) < 3
  ) below;

  return jsonb_build_object(
    'evaluation_date',          p_date,
    'threshold',                3,
    'processed',                v_processed,
    'failed',                   v_failed,
    'pending_below_threshold',  v_pending,
    'errors',                   v_errors
  );
end;
$$;

revoke all on function public.run_due_adaptive_evaluations(date)
  from public, anon, authenticated;

-- ════════════════════════════════════════════════════════════════
-- RPC: record_quiz_attempt
-- Counts are derived server-side from question_results when present.
-- attempts_until_adaptation now reflects the trailing window (all
-- unevaluated attempts), not just today's count.
-- ════════════════════════════════════════════════════════════════
create or replace function public.record_quiz_attempt(
  p_quiz_id          text,
  p_total_questions  integer,
  p_correct_answers  integer,
  p_question_results jsonb   default '[]',
  p_avg_difficulty   numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid            uuid := auth.uid();
  v_today          date := (now() at time zone 'Asia/Kuwait')::date;
  v_total          integer := p_total_questions;
  v_correct        integer := p_correct_answers;
  v_result_count   integer := 0;
  v_result_correct integer := 0;
  v_topic_stats    jsonb;
  v_avg_difficulty numeric;
  v_new_count      integer;
  v_pending        integer;
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

  -- When per-question results are provided, derive the counts from them
  -- so the scalar inputs cannot disagree with the detailed payload.
  select
    count(*),
    count(*) filter (where coalesce((q->>'correct')::boolean, false))
  into v_result_count, v_result_correct
  from jsonb_array_elements(coalesce(p_question_results, '[]'::jsonb)) as q;

  if v_result_count > 0 then
    v_total   := v_result_count;
    v_correct := v_result_correct;
  end if;

  select coalesce(round(avg(qdp.difficulty)::numeric, 2), p_avg_difficulty)
  into v_avg_difficulty
  from jsonb_array_elements(coalesce(p_question_results, '[]'::jsonb)) as q
  left join public.question_difficulty_profiles qdp
    on qdp.quiz_id = p_quiz_id
   and qdp.question_key = q->>'key';

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

  insert into public.quiz_progress (user_id, quiz_id, score, total, level, details)
  values (
    v_uid, p_quiz_id,
    v_correct, v_total,
    'adaptive',
    jsonb_build_object(
      'avg_difficulty',    v_avg_difficulty,
      'question_results',  p_question_results
    )
  );

  insert into public.quiz_daily_aggregates (
    user_id, quiz_id, attempt_date,
    attempt_count, total_qs, correct_qs, avg_difficulty, topic_stats
  )
  values (
    v_uid, p_quiz_id, v_today,
    1, v_total, v_correct,
    v_avg_difficulty, v_topic_stats
  )
  on conflict (user_id, quiz_id, attempt_date) do update set
    attempt_count  = quiz_daily_aggregates.attempt_count + 1,
    total_qs       = quiz_daily_aggregates.total_qs + v_total,
    correct_qs     = quiz_daily_aggregates.correct_qs + v_correct,
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

  -- Trailing window: attempts left before the next evaluation can fire
  select coalesce(sum(attempt_count), 0) into v_pending
  from public.quiz_daily_aggregates
  where user_id      = v_uid
    and quiz_id      = p_quiz_id
    and attempt_date <= v_today
    and not evaluated;

  return jsonb_build_object(
    'recorded',                   true,
    'attempts_today',             v_new_count,
    'attempts_until_adaptation',  greatest(0, 3 - v_pending),
    'next_evaluation',            'daily_5am'
  );
end;
$$;

revoke all on function public.record_quiz_attempt(text, integer, integer, jsonb, numeric)
  from public, anon, authenticated;
grant execute on function public.record_quiz_attempt(text, integer, integer, jsonb, numeric)
  to authenticated;

-- ════════════════════════════════════════════════════════════════
-- RPC: get_quiz_question_keys
-- Difficulty window now outranks weak topics; weak-topic questions
-- are interleaved at ~30% of any prefix of the list instead of
-- front-loaded; keys served in the user's last 3 recorded attempts
-- (tracked server-side, so it works across devices) sort last.
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
  v_uid    uuid := auth.uid();
  v_level  numeric := 50.0;
  v_weak   text[] := '{}';
  v_recent text[] := '{}';
  v_lo     numeric;
  v_hi     numeric;
  v_keys   jsonb;
  -- ~30% of any prefix of the list comes from weak topics
  weak_share constant numeric := 0.30;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_count <= 0 or p_count > 150 then
    raise exception 'Question count must be between 1 and 150';
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
  v_weak  := coalesce(v_weak, '{}');
  v_lo    := greatest(1, v_level - 15);
  v_hi    := least(100, v_level + 10);

  -- Keys served in the last 3 recorded attempts rotate to the back
  select coalesce(array_agg(distinct k), '{}'::text[]) into v_recent
  from (
    select jsonb_array_elements(p.details->'question_results')->>'key' as k
    from (
      select details
      from public.quiz_progress
      where user_id = v_uid
        and quiz_id = p_quiz_id
        and jsonb_typeof(details->'question_results') = 'array'
      order by completed_at desc
      limit 3
    ) p
  ) recent
  where k is not null;

  with c as (
    select
      question_key,
      (difficulty between v_lo and v_hi)  as in_window,
      (topic_tags && v_weak)              as is_weak,
      (question_key = any(v_recent))      as is_recent,
      abs(difficulty - v_level)           as dist,
      random()                            as rnd
    from public.question_difficulty_profiles
    where quiz_id = p_quiz_id
  ),
  ordered as (
    select
      question_key,
      case when is_recent then 1 else 0 end as recency_grp,
      case when in_window then 0 else 1 end as window_grp,
      -- Interleave: rank weak and non-weak questions separately, then
      -- stretch the ranks so merging them yields ~30% weak questions
      -- in every prefix of the list.
      case
        when is_weak then
          (row_number() over (
            partition by is_recent, in_window, is_weak
            order by dist, rnd
          ))::numeric / weak_share
        else
          (row_number() over (
            partition by is_recent, in_window, is_weak
            order by dist, rnd
          ))::numeric / (1.0 - weak_share)
      end as ord,
      dist,
      rnd
    from c
  ),
  final_q as (
    select question_key, recency_grp, window_grp, ord, dist, rnd
    from ordered
    order by recency_grp, window_grp, ord, dist, rnd
    limit p_count
  )
  select coalesce(
    jsonb_agg(question_key order by recency_grp, window_grp, ord, dist, rnd),
    '[]'::jsonb
  )
  into v_keys
  from final_q;

  return jsonb_build_object('question_keys', v_keys);
end;
$$;

revoke all on function public.get_quiz_question_keys(text, integer)
  from public, anon, authenticated;
grant execute on function public.get_quiz_question_keys(text, integer)
  to authenticated;

-- ════════════════════════════════════════════════════════════════
-- RPC: admin_get_adaptive_analytics — now includes topic_mastery
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
declare
  v_today date := (now() at time zone 'Asia/Kuwait')::date;
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
      'topic_mastery',  s.topic_mastery,
      'total_sessions', s.total_sessions,
      'last_evaluated', s.last_evaluated,
      'today_aggregate', (
        select row_to_json(d)::jsonb
        from   public.quiz_daily_aggregates d
        where  d.user_id      = p_user_id
          and  d.quiz_id      = p_quiz_id
          and  d.attempt_date = v_today
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

revoke all on function public.admin_get_adaptive_analytics(uuid, text)
  from public, anon, authenticated;
grant execute on function public.admin_get_adaptive_analytics(uuid, text)
  to authenticated;

-- The cron job from migration 004 ('quizzes-hub-adaptive-daily-5am',
-- 0 2 * * * UTC = 5 AM Asia/Kuwait) is unchanged: it still calls
-- run_due_adaptive_evaluations(yesterday), which is now self-healing.
