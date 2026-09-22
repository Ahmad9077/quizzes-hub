'use strict';
const $ = id => document.getElementById(id);
const number = value => new Intl.NumberFormat('ar-KW').format(value);
const catalog = new Map();
let chapter, audioData, selected = 1, visibleVerse = 1, mode = 'learn', revealed = false;
let generation = 0, audioElement = null, settlePlayback = null, playing = false;
let currentScreen = 'home', bookmarkPrefix = '';
let accessGranted = false;

async function readJSON(path) {
  const response = await fetch(path);
  if (!response.ok) throw Error('تعذر تحميل المحتوى. حاول مرة أخرى.');
  return response.json();
}
function message(text = '') { $('message').textContent = text; }
function status(text = '') { $('playStatus').textContent = text; }
function showScreen(name) {
  for (const id of ['home', 'reader']) $(id).hidden = id !== name;
  currentScreen = name;
  document.body.dataset.screen = name;
  $('backHome').hidden = name !== 'reader';
  $('backHub').hidden = name !== 'home';
  message();
}
function bookmark() {
  try { localStorage.setItem(bookmarkPrefix + chapter.chapter, JSON.stringify({verse:selected,mode})); } catch {}
}
function restoreBookmark() {
  let saved;
  try { saved = JSON.parse(localStorage.getItem(bookmarkPrefix + chapter.chapter)); } catch {}
  selected = Number.isInteger(saved?.verse) && saved.verse >= 1 && saved.verse <= chapter.verses.length ? saved.verse : 1;
  mode = saved?.mode === 'test' ? 'test' : 'learn';
  visibleVerse = selected; revealed = false;
}
function draw() {
  $('verseStage').style.minHeight = '';
  const verse = chapter.verses[visibleVerse - 1];
  $('verseText').textContent = verse.text;
  $('verseText').dataset.verse = verse.id;
  const hidden = mode === 'test' && !revealed;
  $('verseLine').hidden = hidden;
  $('verseText').hidden = hidden;
  $('verseMarker').textContent = '\u202D\u06DD' + number(visibleVerse) + '\u202C';
  $('verseMarker').setAttribute('aria-label', 'الآية ' + number(visibleVerse));
  $('verseMarker').hidden = hidden;
  $('recall').hidden = !hidden;
  $('basmala').textContent = chapter.basmala;
  $('basmala').hidden = visibleVerse !== 1 || hidden;
  $('hideAgain').hidden = mode !== 'test' || !revealed;
  $('verseCounter').textContent = 'الآية ' + number(visibleVerse) + ' من ' + number(chapter.verses.length);
  $('versePicker').value = selected;
  $('listenUntil').textContent = 'من البداية إلى ' + number(selected);
  $('previous').disabled = selected === 1;
  $('next').disabled = selected === chapter.verses.length;
  $('learnMode').setAttribute('aria-pressed', String(mode === 'learn'));
  $('testMode').setAttribute('aria-pressed', String(mode === 'test'));
  document.querySelectorAll('#verseList button').forEach(button => button.setAttribute('aria-current', String(Number(button.dataset.verse) === selected)));
  queueVerseFit();
}
function restoreAudioUI() {
  playing = false;
  $('listenLabel').textContent = 'استمع للآية';
  $('listenUntil').disabled = false;
  $('listen').setAttribute('aria-pressed', 'false');
}
function stopAudio(announce = false) {
  generation++;
  if (audioElement) {
    audioElement.onended = audioElement.onerror = null;
    audioElement.pause(); audioElement.removeAttribute('src'); audioElement.load(); audioElement = null;
  }
  if (settlePlayback) { const settle = settlePlayback; settlePlayback = null; settle(); }
  restoreAudioUI();
  visibleVerse = selected;
  if (chapter) draw();
  status(announce ? 'توقف التشغيل.' : '');
}
function selectVerse(id, persist = true) {
  const value = Number(id);
  if (!Number.isInteger(value)) return;
  stopAudio(); selected = Math.max(1, Math.min(chapter.verses.length, value)); visibleVerse = selected; revealed = false;
  draw(); message();
  if (persist) bookmark();
}
function changeMode(next) {
  stopAudio(); mode = next; revealed = false; draw(); bookmark();
}
async function playFile(url, token) {
  if (token !== generation) return;
  const element = new Audio(url); audioElement = element;
  await new Promise((resolve, reject) => {
    let settled = false;
    const finish = error => {
      if (settled) return; settled = true;
      element.onended = element.onerror = null;
      if (settlePlayback === cancel) settlePlayback = null;
      if (error) reject(error); else resolve();
    };
    const cancel = () => finish(); settlePlayback = cancel;
    element.onended = () => finish();
    element.onerror = () => finish(Error('تعذر تشغيل التلاوة. تحقق من الاتصال وحاول مجددًا.'));
    element.play().catch(() => finish(Error('لم يبدأ الصوت. اضغط الاستماع مرة أخرى.')));
  });
}
async function loadAudio(entry) {
  if (entry.audioData && Date.parse(entry.audioData.expires) > Date.now()) return entry.audioData;
  if (entry.audioPromise) return entry.audioPromise;
  entry.audioPromise = (async () => {
    const cached = entry.audioData || await readJSON(entry.audio);
    if (Date.parse(cached.expires) > Date.now()) return cached;
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch('https://api.quran.com/api/v4/recitations/7/by_chapter/' + entry.id + '?per_page=50', {signal:controller.signal, cache:'no-store'});
      if (!response.ok) throw Error('audio source unavailable');
      const data = await response.json(), files = data.audio_files;
      if (!Array.isArray(files) || files.length !== entry.chapter.verses.length || data.pagination?.next_page) throw Error('incomplete audio');
      const verses = files.map((file, index) => {
        const id = index + 1, expected = 'Alafasy/mp3/' + String(entry.id).padStart(3, '0') + String(id).padStart(3, '0') + '.mp3';
        if (file.verse_key !== entry.id + ':' + id || file.url !== expected) throw Error('audio identity mismatch');
        return {id, url:'https://verses.quran.com/' + expected};
      });
      return {...cached, verses, retrieved:new Date().toISOString(), expires:new Date(Date.now() + 7 * 86400000).toISOString()};
    } catch {
      throw Error('تعذر تحديث مصدر التلاوة. يمكنك القراءة واختبار نفسك، ثم إعادة محاولة الاستماع.');
    } finally { clearTimeout(timeout); }
  })();
  try { entry.audioData = await entry.audioPromise; return entry.audioData; }
  finally { entry.audioPromise = null; }
}
async function listen(cumulative = false) {
  if (playing) { if (!cumulative) stopAudio(true); return; }
  stopAudio(); message();
  const token = generation, target = selected, entry = catalog.get(chapter.chapter);
  playing = true; $('listenLabel').textContent = 'إيقاف الصوت'; $('listenUntil').disabled = true; $('listen').setAttribute('aria-pressed', 'true');
  try {
    audioData = await loadAudio(entry);
    if (token !== generation) return;
    entry.audioData = audioData;
    if (cumulative) {
      status('أستمع للبسملة');
      await playFile(audioData.basmala, token);
    }
    for (let id = cumulative ? 1 : target; id <= target && token === generation; id++) {
      visibleVerse = id; draw();
      status('أستمع للآية ' + number(id));
      await playFile(audioData.verses[id - 1].url, token);
    }
    if (token === generation) {
      audioElement = null; restoreAudioUI(); visibleVerse = target; draw(); status();
    }
  } catch (error) {
    if (token === generation) { stopAudio(); message(error.message); }
  }
}
function openChapter(id) {
  const entry = catalog.get(id);
  if (!entry) return;
  stopAudio(); chapter = entry.chapter; audioData = entry.audioData;
  restoreBookmark();
  $('chapterTitle').textContent = 'سورة ' + chapter.name;
  document.title = 'القرآن الكريم · سورة ' + chapter.name;
  $('verseList').replaceChildren(); $('versePicker').replaceChildren();
  for (const verse of chapter.verses) {
    const button = document.createElement('button'); button.textContent = number(verse.id); button.dataset.verse = verse.id;
    button.setAttribute('aria-label', 'الآية ' + number(verse.id)); button.onclick = () => selectVerse(verse.id); $('verseList').append(button);
    const option = document.createElement('option'); option.value = verse.id; option.textContent = number(verse.id) + ' من ' + number(chapter.verses.length); $('versePicker').append(option);
  }
  showScreen('reader'); draw();
}
function route() {
  if (!accessGranted) return;
  const match = location.hash.match(/^#surah-(\d+)$/);
  if (match && catalog.has(Number(match[1]))) { openChapter(Number(match[1])); return; }
  stopAudio(); showScreen('home'); document.title = 'القرآن الكريم';
}
async function boot() {
  try {
    if (!window.QuizzesHubAccessReady) throw Error('تعذر التحقق من دخول الهَب. ارجع إلى الهَب وحاول مرة أخرى.');
    const access = await window.QuizzesHubAccessReady;
    const client = window.QuizzesHubSupabaseClient;
    const {data, error} = await client.auth.getSession();
    const userId = data?.session?.user?.id;
    if (!access?.ok || error || !userId) throw Error('افتح المشروع من حسابك في الهَب.');
    bookmarkPrefix = 'quizzes-hub:quran:' + userId + ':verse:';
    client.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id !== userId) { accessGranted = false; stopAudio(); location.replace('../'); }
    });
    accessGranted = true;
    document.getElementById('main').setAttribute('aria-busy', 'false');
    const entries = await readJSON('data/surahs.json');
    const loadedEntries = await Promise.all(entries.map(async entry => ({...entry, chapter:await readJSON(entry.text)})));
    for (const entry of loadedEntries) {
      catalog.set(entry.id, entry);
      const link = document.createElement('a'); link.className = 'surah-card'; link.href = '#surah-' + entry.id;
      const title = document.createElement('span'); title.className = 'surah-name'; title.textContent = 'سورة ' + entry.chapter.name;
      const count = document.createElement('span'); count.className = 'surah-count'; count.textContent = number(entry.chapter.verses.length) + ' آية';
      link.append(title, count); $('surahList').append(link);
    }
    $('loading').hidden = true; route();
    for (const entry of catalog.values()) loadAudio(entry).catch(() => {});
  } catch (error) { $('loading').hidden = true; message(error.message); }
}
$('learnMode').onclick = () => changeMode('learn'); $('testMode').onclick = () => changeMode('test');
$('previous').onclick = () => selectVerse(selected - 1); $('next').onclick = () => selectVerse(selected + 1); $('versePicker').onchange = () => selectVerse($('versePicker').value);
$('listen').onclick = () => listen(); $('listenUntil').onclick = () => listen(true);
$('reveal').onclick = () => { stopAudio(); revealed = true; draw(); };
$('hideAgain').onclick = () => { stopAudio(); revealed = false; draw(); };
window.addEventListener('hashchange', route);
window.addEventListener('pagehide', () => stopAudio());
document.addEventListener('visibilitychange', () => { if (document.hidden) stopAudio(); });
window.addEventListener('unhandledrejection', event => { message(event.reason?.message || 'تعذر إكمال الخطوة.'); event.preventDefault(); });
let fitFrame = 0;
function queueVerseFit() { cancelAnimationFrame(fitFrame); fitFrame = requestAnimationFrame(fitVerse); }
function fitVerse() {
  if (currentScreen !== 'reader') return;
  const text = $('verseLine'), stage = $('verseStage');
  stage.style.minHeight = '';
  text.style.fontSize = '';
  if (!matchMedia('(max-width: 720px) and (orientation: portrait)').matches || text.hidden) return;
  const css = getComputedStyle(stage);
  const available = stage.clientHeight - parseFloat(css.paddingTop) - parseFloat(css.paddingBottom);
  const extras = [...stage.children].filter(el => el !== text && !el.hidden).reduce((sum,el) => {
    const style = getComputedStyle(el);
    return sum + el.getBoundingClientRect().height + parseFloat(style.marginTop) + parseFloat(style.marginBottom);
  },0);
  let size = parseFloat(getComputedStyle(text).fontSize);
  while (size > 26 && (text.getBoundingClientRect().height + extras > available + 1 || text.scrollWidth > text.clientWidth + 1)) {
    size--; text.style.fontSize = size + 'px';
  }
  // At accessibility zoom, allow the page to grow instead of cutting off Quran text.
  stage.style.minHeight = Math.ceil(text.getBoundingClientRect().height + extras + parseFloat(css.paddingTop) + parseFloat(css.paddingBottom)) + 'px';
}
new ResizeObserver(queueVerseFit).observe($('verseStage'));
window.addEventListener('resize', () => {$('verseStage').style.minHeight = ''; queueVerseFit();});
document.fonts.ready.then(queueVerseFit);

boot();
