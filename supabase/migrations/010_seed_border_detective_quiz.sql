-- Register Border Detective, reuse the validated Country Map question keys,
-- and assign the quiz to active child profiles.

insert into public.quizzes (id, title, url, icon, color, sort_order)
values (
  'border-detective',
  'Border Detective',
  'https://ahmad9077.github.io/country-border-letter-quiz/',
  '🧩',
  '#e0f2f1',
  60
)
on conflict (id) do update set
  title = excluded.title,
  url = excluded.url,
  icon = excluded.icon,
  color = excluded.color,
  sort_order = excluded.sort_order;

insert into public.question_difficulty_profiles (
  quiz_id,
  question_key,
  difficulty,
  topic_tags
)
select
  'border-detective',
  question_key,
  difficulty,
  array(
    select distinct tag
    from unnest(topic_tags || array['border_silhouette', 'letter_builder']) as tag
  )
from public.question_difficulty_profiles
where quiz_id = 'country-map'
on conflict (quiz_id, question_key) do update set
  difficulty = excluded.difficulty,
  topic_tags = excluded.topic_tags;

insert into public.quiz_assignments (user_id, quiz_id, difficulty)
select id, 'border-detective', 'medium'
from public.profiles
where role = 'user'
  and active = true
on conflict (user_id, quiz_id) do nothing;

select
  (select count(*) from public.question_difficulty_profiles where quiz_id = 'border-detective')
    as seeded_question_profiles,
  (select count(*) from public.profiles where role = 'user' and active = true)
    as active_child_profiles,
  (select count(*) from public.quiz_assignments where quiz_id = 'border-detective')
    as border_detective_assignments,
  (
    select count(*)
    from public.profiles p
    where p.role = 'user'
      and p.active = true
      and not exists (
        select 1
        from public.quiz_assignments qa
        where qa.user_id = p.id
          and qa.quiz_id = 'border-detective'
      )
  ) as active_children_missing_assignment;
