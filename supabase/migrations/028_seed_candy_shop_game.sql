-- Hub registration for «البقالة» (candy-shop): a game that teaches adding within ten.
-- Apply only after the production site is approved and live.
-- Registers the catalog row only. A game has no scored questions, so there are no adaptive
-- question profiles, and it stays out of Challenge. Intentionally creates no quiz_assignments.

begin;

insert into public.quizzes (id, title, url, icon, color, sort_order)
values (
  'candy-shop',
  'البقالة',
  'https://ahmad9077.github.io/candy-shop/',
  '🛒',
  '#f1e6ff',
  170
)
on conflict (id) do update set
  title = excluded.title,
  url = excluded.url,
  icon = excluded.icon,
  color = excluded.color,
  sort_order = excluded.sort_order;

commit;
