-- Catalog only. Preserve every existing assignment and profile; Admin selects access.
begin;
insert into public.quizzes (id, title, url, icon, color, sort_order)
values
  ('quran-al-balad', 'القرآن الكريم - حمود', 'https://ahmad9077.github.io/quizzes-hub/quran/?group=hamoud', 'ق', '#dce9dd', 90),
  ('quran-deema', 'القرآن الكريم - ديما', 'https://ahmad9077.github.io/quizzes-hub/quran/?group=deema', 'ق', '#dce9dd', 100)
on conflict (id) do update set
  title = excluded.title, url = excluded.url, icon = excluded.icon,
  color = excluded.color, sort_order = excluded.sort_order;
commit;
