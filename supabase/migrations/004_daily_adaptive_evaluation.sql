-- Move adaptive evaluation to a daily 5 AM automation and lower the
-- evaluation threshold from 5 completed sessions to 3.

create extension if not exists pg_cron with schema extensions;

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
  alpha     constant numeric := 0.3;
  conf_step constant numeric := 0.1;
begin
  select * into v_agg
  from public.quiz_daily_aggregates
  where user_id      = p_user_id
    and quiz_id      = p_quiz_id
    and attempt_date = p_date
    and attempt_count >= 3
    and not evaluated;

  if not found then return; end if;

  insert into public.user_quiz_adaptive_state (user_id, quiz_id)
  values (p_user_id, p_quiz_id)
  on conflict (user_id, quiz_id) do nothing;

  select * into v_state
  from public.user_quiz_adaptive_state
  where user_id = p_user_id and quiz_id = p_quiz_id;

  v_accuracy := case
    when v_agg.total_qs > 0
      then v_agg.correct_qs::numeric / v_agg.total_qs
    else 0.5
  end;

  v_ema_new := alpha * v_accuracy + (1.0 - alpha) * v_state.ema_score;
  v_conf_new := least(1.0, v_state.confidence + conf_step);

  v_delta := case
    when v_ema_new >= 0.90 then  10.0
    when v_ema_new >= 0.80 then   6.0
    when v_ema_new >= 0.70 then   3.0
    when v_ema_new >= 0.60 then   1.5
    when v_ema_new >= 0.50 then   0.5
    when v_ema_new >= 0.45 then   0.0
    when v_ema_new >= 0.35 then  -1.5
    when v_ema_new >= 0.25 then  -3.0
    when v_ema_new >= 0.15 then  -6.0
    else                         -10.0
  end;

  v_delta := v_delta * (0.4 + 0.6 * v_conf_new);
  v_new_level := least(100.0, greatest(1.0, v_state.current_level + v_delta));

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

  insert into public.adaptive_adjustment_log (
    user_id, quiz_id, previous_level, new_level,
    trigger_type, session_accuracy, ema_before, ema_after,
    adjustment_details
  ) values (
    p_user_id, p_quiz_id, v_state.current_level, v_new_level,
    'engine', v_accuracy, v_state.ema_score, v_ema_new,
    jsonb_build_object(
      'attempt_count',          v_agg.attempt_count,
      'total_qs',               v_agg.total_qs,
      'correct_qs',             v_agg.correct_qs,
      'level_delta',            round(v_delta, 2),
      'confidence',             v_conf_new,
      'weak_topics',            v_weak,
      'strong_topics',          v_strong,
      'evaluation_date',        p_date,
      'evaluation_threshold',   3,
      'evaluation_schedule',    'daily_5am'
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

  update public.quiz_daily_aggregates set
    evaluated  = true,
    updated_at = now()
  where user_id      = p_user_id
    and quiz_id      = p_quiz_id
    and attempt_date = p_date;
end;
$$;

revoke all on function public.evaluate_adaptive_level(uuid, text, date)
  from public, anon, authenticated;

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
  v_uid          uuid := auth.uid();
  v_today        date := (now() at time zone 'Asia/Kuwait')::date;
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
    p_correct_answers, p_total_questions,
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

  return jsonb_build_object(
    'recorded',                   true,
    'attempts_today',             v_new_count,
    'attempts_until_adaptation',  greatest(0, 3 - v_new_count),
    'next_evaluation',            'daily_5am'
  );
end;
$$;

revoke all on function public.record_quiz_attempt(text, integer, integer, jsonb, numeric)
  from public, anon, authenticated;
grant execute on function public.record_quiz_attempt(text, integer, integer, jsonb, numeric)
  to authenticated;

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
  v_skipped integer := 0;
  v_failed integer := 0;
  v_errors jsonb := '[]'::jsonb;
begin
  for r in
    select user_id, quiz_id, attempt_date
    from public.quiz_daily_aggregates
    where attempt_date = p_date
      and attempt_count >= 3
      and not evaluated
    order by user_id, quiz_id
  loop
    begin
      perform public.evaluate_adaptive_level(r.user_id, r.quiz_id, r.attempt_date);
      v_processed := v_processed + 1;
    exception when others then
      v_failed := v_failed + 1;
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'user_id', r.user_id,
        'quiz_id', r.quiz_id,
        'attempt_date', r.attempt_date,
        'error', sqlerrm
      ));
    end;
  end loop;

  select count(*) into v_skipped
  from public.quiz_daily_aggregates
  where attempt_date = p_date
    and attempt_count < 3
    and not evaluated;

  return jsonb_build_object(
    'evaluation_date', p_date,
    'threshold', 3,
    'processed', v_processed,
    'failed', v_failed,
    'skipped_below_threshold', v_skipped,
    'errors', v_errors
  );
end;
$$;

revoke all on function public.run_due_adaptive_evaluations(date)
  from public, anon, authenticated;

create or replace function public.get_user_quiz_profile(p_quiz_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid         uuid := auth.uid();
  v_today       date := (now() at time zone 'Asia/Kuwait')::date;
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
  where user_id      = v_uid
    and quiz_id      = p_quiz_id
    and attempt_date = v_today;

  return jsonb_build_object(
    'attempts_today', coalesce(v_today_count, 0)
  );
end;
$$;

revoke all on function public.get_user_quiz_profile(text)
  from public, anon, authenticated;
grant execute on function public.get_user_quiz_profile(text)
  to authenticated;

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

do $$
begin
  perform cron.unschedule(jobid)
  from cron.job
  where jobname = 'quizzes-hub-adaptive-daily-5am';
exception when others then
  null;
end $$;

select cron.schedule(
  'quizzes-hub-adaptive-daily-5am',
  '0 2 * * *',
  $cron$
    select public.run_due_adaptive_evaluations(
      ((now() at time zone 'Asia/Kuwait')::date - 1)
    );
  $cron$
);

select
  jobname,
  schedule,
  command
from cron.job
where jobname = 'quizzes-hub-adaptive-daily-5am';
