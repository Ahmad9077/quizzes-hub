-- Give the adaptive client a larger candidate pool for rotation and keep
-- all current quiz assignments on the medium round shape.

update public.quiz_assignments
set difficulty = 'medium'
where difficulty <> 'medium';

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

revoke all on function public.get_quiz_question_keys(text, integer)
  from public, anon, authenticated;
grant execute on function public.get_quiz_question_keys(text, integer)
  to authenticated;

select
  count(*) filter (where difficulty = 'medium') as medium_assignments,
  count(*) filter (where difficulty <> 'medium') as non_medium_assignments
from public.quiz_assignments;
