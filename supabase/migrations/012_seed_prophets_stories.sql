-- Register the story collection for the existing Admin access checkboxes.
-- This does not create assignments or change any child's current quiz access.
-- Stories do not submit scores or participate in adaptive levels/challenges.
insert into public.quizzes (id, title, url, icon, color, sort_order)
values (
  'prophets-stories',
  'قصص الأنبياء',
  'https://ahmad9077.github.io/quizzes-hub/prophets-stories.html',
  '📚',
  '#d4b37d',
  80
)
on conflict (id) do update set
  title = excluded.title,
  url = excluded.url,
  icon = excluded.icon,
  color = excluded.color,
  sort_order = excluded.sort_order;
