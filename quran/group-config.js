// Stable assignment IDs preserve existing Hub access and per-account bookmarks.
(() => {
  const groups = {
    hamoud: { quizId: 'quran-al-balad', title: 'سور حمود', surahs: [90, 89, 88, 87, 86, 85, 84] },
    deema: { quizId: 'quran-deema', title: 'سور ديما', surahs: [1, 114] }
  };
  const key = new URLSearchParams(location.search).get('group') || 'hamoud';
  const group = Object.hasOwn(groups, key) ? groups[key] : groups.hamoud;
  window.QuranGroup = Object.freeze({...group, surahs: Object.freeze(group.surahs)});
  window.QUIZZES_HUB_QUIZ_ID = group.quizId;
})();
