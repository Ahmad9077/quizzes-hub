-- Rename «القرآن والأحاديث - ديما» to «القرآن الكريم - الأول الابتدائي»: the group now follows the Ministry's
-- Grade 1 term 1 Quran book (eight surahs) and no longer includes the hadith.
-- Same id, so assignments and reading positions are unchanged.
update public.quizzes set title = 'القرآن الكريم - الأول الابتدائي' where id = 'quran-deema';
