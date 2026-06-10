-- ════════════════════════════════════════════════════════════════
-- Fix heavy question repetition — migration 008
--
-- Root cause: get_quiz_question_keys ordered candidates by
-- (topic_priority, outside_window, level_distance, random()), where
-- random() was only a tie-breaker. The questions closest to the
-- user's level always ranked first, the level changes at most once a
-- day, so every fetch returned the same ordered list and quiz apps
-- sliced the same first N questions round after round. The only
-- variety came from the client's per-device localStorage rotation,
-- which is best-effort and does not work across devices.
--
-- Fix: freshness-first selection, guaranteed server-side.
--   1. Per-question "last answered" history is derived from
--      quiz_progress (cross-device, 60-day horizon).
--   2. Questions the user has never seen (or not seen in 60 days)
--      always rank before anything seen recently; seen questions are
--      bucketed by recency so a question only comes back after the
--      fresher material is exhausted. The full bank cycles before
--      heavy repeats are possible.
--   3. Inside the difficulty window the order is RANDOM on every
--      call (level_distance ranking removed) — the window already
--      bounds suitability, so deterministic distance ordering only
--      destroyed variety. Outside the window, nearest-first applies.
--   4. Weak-topic questions are interleaved at ~30% of any prefix.
--
-- This replaces get_quiz_question_keys from migrations 005/007 and
-- has no dependency on migration 007 (safe to apply directly after
-- 006 or after 007).
-- ════════════════════════════════════════════════════════════════

create or replace function public.get_quiz_question_keys(
  p_quiz_id text,
  p_count integer default 10
)
returns jsonb
language plpgsql
security definer
volatile
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_level  numeric := 50.0;
  v_weak   text[] := '{}';
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

  with seen as (
    -- When this user last answered each question (any device).
    -- 60-day horizon: older history counts as fresh again.
    select q->>'key' as question_key, max(p.completed_at) as last_seen
    from public.quiz_progress p
    cross join lateral jsonb_array_elements(p.details->'question_results') q
    where p.user_id = v_uid
      and p.quiz_id = p_quiz_id
      and p.completed_at > now() - interval '60 days'
      and jsonb_typeof(p.details->'question_results') = 'array'
    group by q->>'key'
  ),
  c as (
    select
      qdp.question_key,
      (qdp.difficulty between v_lo and v_hi) as in_window,
      (qdp.topic_tags && v_weak)             as is_weak,
      abs(qdp.difficulty - v_level)          as dist,
      -- Freshness buckets: fresher material always ranks first, so a
      -- question only repeats once fresher questions are exhausted.
      case
        when s.last_seen is null                      then 0  -- never seen
        when s.last_seen < now() - interval '7 days'  then 1
        when s.last_seen < now() - interval '2 days'  then 2
        when s.last_seen < now() - interval '1 day'   then 3
        else                                               4  -- seen today
      end as freshness_grp,
      random() as rnd
    from public.question_difficulty_profiles qdp
    left join seen s using (question_key)
    where qdp.quiz_id = p_quiz_id
  ),
  ordered as (
    select
      question_key,
      freshness_grp,
      case when in_window then 0 else 1 end as window_grp,
      -- Interleave: rank weak and non-weak questions separately
      -- (random inside the window, nearest-first outside), then
      -- stretch the ranks so merging yields ~30% weak questions in
      -- every prefix of the list.
      case
        when is_weak then
          (row_number() over (
            partition by freshness_grp, in_window, is_weak
            order by case when in_window then 0 else dist end, rnd
          ))::numeric / weak_share
        else
          (row_number() over (
            partition by freshness_grp, in_window, is_weak
            order by case when in_window then 0 else dist end, rnd
          ))::numeric / (1.0 - weak_share)
      end as ord,
      rnd
    from c
  ),
  final_q as (
    select question_key, freshness_grp, window_grp, ord, rnd
    from ordered
    order by freshness_grp, window_grp, ord, rnd
    limit p_count
  )
  select coalesce(
    jsonb_agg(question_key order by freshness_grp, window_grp, ord, rnd),
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

-- Speeds up the per-user history scan in the CTE above.
create index if not exists idx_quiz_progress_user_quiz_completed
  on public.quiz_progress (user_id, quiz_id, completed_at desc);
