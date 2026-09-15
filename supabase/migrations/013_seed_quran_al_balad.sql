-- Approved Quran collection; catalog registration only.
-- Existing profiles, assignments, scores, RLS and Auth stay unchanged.
insert into public.quizzes (id, title, url, icon, color, sort_order)
values
  ('quran-al-balad', 'القرآن الكريم', 'https://ahmad9077.github.io/quizzes-hub/quran/', 'ق', '#dce9dd', 90)
on conflict (id) do update set
  title = excluded.title,
  url = excluded.url,
  icon = excluded.icon,
  color = excluded.color,
  sort_order = excluded.sort_order;
