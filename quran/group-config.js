// Stable assignment IDs preserve existing Hub access and per-account bookmarks.
(() => {
  const groups = {
    hamoud: { quizId: 'quran-al-balad', title: 'سور حمود', pageTitle: 'القرآن الكريم - حمود', surahs: [90, 89, 88, 87, 86, 85, 84] },
    // Grade 1, term 1 (Ministry book 2026/2027), in the book's order. The key and id keep Deema's access.
    deema: { quizId: 'quran-deema', title: 'القرآن الكريم', pageTitle: 'القرآن الكريم - الأول الابتدائي', surahs: [1, 114, 113, 112, 111, 110, 109, 108] }
  };
  const key = new URLSearchParams(location.search).get('group') || 'hamoud';
  const group = Object.hasOwn(groups, key) ? groups[key] : groups.hamoud;
  window.QuranGroup = Object.freeze({...group, surahs: Object.freeze(group.surahs)});
  window.QUIZZES_HUB_QUIZ_ID = group.quizId;
})();
