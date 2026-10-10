-- Rename the existing group only; assignments and child profiles are unchanged.
update public.quizzes set title = 'القرآن والأحاديث - ديما' where id = 'quran-deema';
