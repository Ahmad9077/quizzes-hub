const $ = (id) => document.getElementById(id);
const audio = $('narration');
const displayNumber = (n) => String(n);
const englishDigits = (text) => String(text).replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
const allowedStories = new Set(['sulayman', 'nuh', 'musa', 'yunus', 'ibrahim', 'ismail', 'yaqub', 'yusuf', 'ayyub', 'dawud', 'zakariya', 'isa', 'hud', 'salih', 'shuayb']);
const requestedStory = new URLSearchParams(location.search).get('story');
const storySlug = allowedStories.has(requestedStory) ? requestedStory : 'sulayman';
const dataDirectory = `data/${storySlug}/`;
const defaultHubURL = 'https://ahmad9077.github.io/quizzes-hub/prophets-stories.html';
const state = { story: null, manifest: [], index: 0, paragraph: 0, interactionMode: false, started: false, playing: false, wantsAudio: true, muted: false, version: 0, pendingSeek: null, completed: false, audioFailed: false, interactions: new Map(), references: null };
const artworkDescriptions = {
  valley: 'رسم توضيحي لوادٍ واسع مع نمل صغير في مقدمة المشهد',
  birds: 'طيور بين أغصان الأشجار وفوق الوادي',
  passage: 'ممرّ بين مرتفعات الوادي في ضوء الشمس',
  warning: 'نملة قرب نمل آخر ومدخل المسكن',
  light: 'ضوء هادئ ينير أرض الوادي وأوراقه',
  canopy: 'أغصان وأوراق مضاءة فوق الوادي',
  home: 'نمل قرب مسكنه في أرض الوادي',
};

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function currentScene() { return state.story?.scenes[state.index]; }
function interactionState() {
  const id = currentScene().id;
  if (!state.interactions.has(id)) state.interactions.set(id, { unlocked: false, done: false, skipped: false, selected: [], wrong: null });
  return state.interactions.get(id);
}
function currentTrack() { return state.manifest.find(track => track.id === currentScene()?.id) || state.manifest[state.index] || null; }
function trackURL() {
  const file = String(currentTrack()?.audio || currentScene().audio || '').replace(/^\//, '');
  if (file.startsWith('assets/audio/')) return file;
  if (file.startsWith(`${storySlug}/`)) return `assets/audio/${file}`;
  return `assets/audio/${storySlug}/${file}`;
}
function artURL(value) {
  const file = String(value || '').replace(/^\//, '');
  if (file.startsWith('assets/')) return file;
  return `assets/art/${file}${/\.(webp|png|jpe?g|avif)$/i.test(file) ? '' : '.webp'}`;
}
function renderCover() {
  const story = state.story;
  const first = story.scenes[0];
  const blessing = 'عليه السلام';
  const splitAt = story.title.indexOf(blessing);
  const title = $('cover-title');
  title.replaceChildren();
  let prophetName = '';
  if (splitAt > 0) {
    prophetName = story.title.slice(0, splitAt).trim();
    const nameLine = element('span', '', prophetName);
    nameLine.append(document.createTextNode(' '), element('small', '', blessing));
    title.append(nameLine);
    const secondLine = story.title.slice(splitAt + blessing.length).trim();
    if (secondLine) title.append(element('span', '', secondLine));
  } else title.append(element('span', '', story.title));
  $('cover-question').textContent = story.coverQuestion || story.hook || first.paragraphs[0];
  $('cover-caption').textContent = story.subtitle || '';
  $('story-wordmark').textContent = story.wordmark || story.shortTitle || (prophetName ? `قصة ${prophetName}` : story.title);
  $('cover-art').src = artURL(story.cover || first.image);
  $('cover-art').alt = story.coverAlt || first.alt || artworkDescriptions[first.image] || `رسم توضيحي لقصة ${story.title}`;
  $('cover-art').hidden = false;
  $('closing-title').textContent = story.closingTitle || 'حكايةٌ بقيت في الذاكرة';
  const hubURL = safeExternalURL(story.hubURL) || defaultHubURL;
  document.querySelectorAll('[data-hub-link]').forEach(link => { link.href = hubURL; });
  document.querySelector('meta[name="description"]').content = story.subtitle || story.title;
  document.body.dataset.story = storySlug;
}

function paragraphStart(index = state.paragraph) {
  if (index === 0) return 0;
  const track = currentTrack();
  const segment = track?.segments?.find(item => item.paragraph === index && item.language === 'ar');
  return segment?.start ?? track?.cues?.[index]?.start ?? 0;
}
function applyPendingSeek() {
  if (state.pendingSeek === null || audio.readyState < 1) return;
  const target = state.pendingSeek;
  try { audio.currentTime = target; state.pendingSeek = null; } catch { /* Retry once metadata is ready. */ }
}
function syncNavigation() {
  const scene = currentScene();
  if (!scene) return;
  const lastParagraph = state.paragraph === scene.paragraphs.length - 1;
  $('previous').disabled = state.index === 0 && state.paragraph === 0 && !state.interactionMode && !state.completed;
  $('previous').setAttribute('aria-label', state.interactionMode || state.completed ? 'ارجع إلى الفقرة الأخيرة' : state.paragraph > 0 ? 'الفقرة السابقة' : 'المشهد السابق');
  $('next').disabled = state.completed;
  let label = 'التالي';
  let accessible = lastParagraph ? 'المشهد التالي' : 'الفقرة التالية';
  if (lastParagraph && scene.interaction && !state.interactionMode) {
    label = scene.interaction.type === 'question' ? 'السؤال' : 'الترتيب';
    accessible = `انتقل إلى ${label}`;
  } else if (state.index === state.story.scenes.length - 1 && lastParagraph) {
    label = 'الخاتمة'; accessible = 'ختام القصة';
  }
  $('next-label').textContent = label;
  $('next').setAttribute('aria-label', accessible);
  const currentNumber = element('bdi', '', displayNumber(state.paragraph + 1));
  const totalNumber = element('bdi', '', displayNumber(scene.paragraphs.length));
  currentNumber.dir = 'ltr'; totalNumber.dir = 'ltr';
  $('paragraph-indicator').replaceChildren(currentNumber, document.createTextNode(' من '), totalNumber);
  $('reader').dataset.mode = state.completed ? 'closing' : state.interactionMode ? 'interaction' : 'reading';
  requestAnimationFrame(fitReadingLayout);
}
function fitReadingLayout() {
  if (!state.started) return;
  const reader = $('reader');
  const desktop = window.matchMedia('(min-width: 1000px) and (min-aspect-ratio: 6/5)').matches;
  if (desktop) { reader.style.removeProperty('--story-art-height'); return; }
  const viewport = window.innerHeight;
  const preferred = Math.min(440, viewport * (window.innerWidth >= 700 ? .47 : .45));
  const header = document.querySelector('.reader-header').offsetHeight + 3;
  const content = document.querySelector('.page-content').offsetHeight;
  const controls = document.querySelector('.story-controls').offsetHeight;
  const available = viewport - header - content - controls;
  const activeHeight = Math.min(preferred, Math.max(170, available));
  reader.style.setProperty('--story-art-height', `${state.interactionMode || state.completed ? Math.min(activeHeight, viewport * .27) : activeHeight}px`);
}
function renderParagraph() {
  const p = element('p', 'active', currentScene().paragraphs[state.paragraph]);
  p.dataset.paragraph = state.paragraph;
  $('narrative').replaceChildren(p);
  $('closing').hidden = !state.completed;
  renderInteraction();
  syncNavigation();
}
function setParagraph(index, { play = state.wantsAudio, focus = false } = {}) {
  const scene = currentScene();
  if (!scene || index < 0 || index >= scene.paragraphs.length) return;
  ++state.version;
  audio.pause();
  state.playing = false;
  state.paragraph = index;
  state.interactionMode = false;
  state.completed = false;
  state.pendingSeek = paragraphStart(index);
  applyPendingSeek();
  renderParagraph();
  syncPlayUI();
  if (play && !state.audioFailed) playNarration();
  if (focus) {
    window.scrollTo({ top: 0, behavior: 'instant' });
    $('scene-title').focus({ preventScroll: true });
  }
}

function syncPlayUI() {
  document.body.dataset.playing = String(state.playing);
  $('play-icon').setAttribute('href', state.playing ? '#i-pause' : '#i-play');
  $('play-pause').setAttribute('aria-label', state.playing ? 'إيقاف مؤقت' : 'تشغيل السرد');
  $('playback-state').textContent = state.audioFailed ? 'يمكنك قراءة الفقرات والتنقل بينها دون صوت' : state.completed ? 'يمكنك إعادة القصة متى شئت' : state.playing ? 'تستمع الآن · النص يتابع الفقرة' : state.interactionMode ? 'جرّب على مهل، أو اختر التالي للمتابعة' : 'السرد متوقف · اقرأ أو اضغط تشغيل';
}
function pauseNarration({ keepIntent = false } = {}) {
  if (!keepIntent) state.wantsAudio = false;
  state.playing = false;
  audio.pause();
  syncPlayUI();
}
function showAudioNotice(message) {
  $('audio-notice').hidden = false;
  $('audio-notice').textContent = message;
}
function onAudioFailure(message) {
  state.audioFailed = true;
  state.playing = false;
  showAudioNotice(message || 'تعذّر تحميل الصوت. يمكنك قراءة النص ومتابعة المشاهد، أو الضغط على إعادة المقطع للمحاولة.');
  syncPlayUI();
  requestAnimationFrame(fitReadingLayout);
}
function playNarration() {
  if (!state.started || state.completed) return;
  const version = state.version;
  state.wantsAudio = true;
  if (audio.ended) { state.pendingSeek = paragraphStart(); applyPendingSeek(); }
  audio.muted = state.muted;
  state.playing = true;
  syncPlayUI();
  const result = audio.play();
  if (result?.catch) result.catch(error => {
    if (version !== state.version || error.name === 'AbortError') return;
    if (error.name === 'NotAllowedError') {
      state.playing = false;
      showAudioNotice('اضغط زرّ التشغيل للاستماع. يمكنك أيضًا متابعة النص دون صوت.');
      syncPlayUI();
    } else onAudioFailure();
  });
}

function renderScene(index, { play = state.wantsAudio, focus = false, paragraph = 0 } = {}) {
  if (!state.story || index < 0 || index >= state.story.scenes.length) return;
  ++state.version;
  state.playing = false;
  audio.pause();
  audio.removeAttribute('src');
  audio.load();
  state.index = index;
  state.paragraph = paragraph;
  state.interactionMode = false;
  state.pendingSeek = paragraphStart(paragraph);
  state.completed = false;
  state.audioFailed = false;
  const scene = currentScene();
  $('cover').hidden = true;
  $('reader').hidden = false;
  $('closing').hidden = true;
  $('audio-notice').hidden = true;
  $('art-error').hidden = true;
  $('scene-title').textContent = scene.title;
  const sourceLabel = scene.source || '';
  $('source-label').textContent = englishDigits(/^(سورة|صحيح|سنن|مسند)/.test(sourceLabel) ? sourceLabel : `سورة ${sourceLabel}`);
  $('scene-number').textContent = displayNumber(index + 1);
  $('scene-total').textContent = displayNumber(state.story.scenes.length);
  $('stage-label').textContent = scene.title;
  $('scene-stage').dataset.image = scene.image;
  $('scene-art').src = artURL(scene.image);
  $('scene-art').alt = scene.alt || artworkDescriptions[scene.image] || `رسم توضيحي للمشهد: ${scene.title}`;
  $('art-backdrop').style.backgroundImage = `url("${artURL(scene.image)}")`;
  // Restart the art's own gentle movement at each new scene.
  $('scene-art').style.animation = 'none';
  void $('scene-art').offsetWidth;
  $('scene-art').style.animation = '';
  renderParagraph();
  document.querySelector('.story-progress').setAttribute('aria-valuemax', state.story.scenes.length);
  document.querySelector('.story-progress').setAttribute('aria-valuenow', index + 1);
  $('story-progress-fill').style.width = `${((index + 1) / state.story.scenes.length) * 100}%`;
  $('audio-progress-fill').style.width = '0%';
  renderInteraction();
  audio.src = trackURL();
  audio.load();
  applyPendingSeek();
  syncPlayUI();
  if (play) playNarration();
  if (focus) {
    window.scrollTo({ top: 0, behavior: 'instant' });
    $('scene-title').focus({ preventScroll: true });
  }
  // Warm only the next illustration and audio metadata; never call a speech service.
  const next = state.story.scenes[index + 1];
  if (next) { const preloadImage = new Image(); preloadImage.src = artURL(next.image); }
}

function addInteractionHeader(container, label) {
  const header = element('div', 'interaction-header');
  header.append(element('span', 'interaction-label', label), element('span', 'interaction-line'));
  container.append(header);
}
function feedbackNode(text = '') {
  const feedback = element('p', 'feedback', text);
  feedback.setAttribute('role', 'status');
  return feedback;
}
function smallButton(text, callback, className = 'text-button') {
  const button = element('button', className, text);
  button.type = 'button';
  button.addEventListener('click', callback);
  return button;
}
function addSkip(container, label = 'تابع القصة') {
  const actions = element('div', 'interaction-actions');
  actions.append(smallButton(label, () => {
    interactionState().skipped = true;
    if (state.index === state.story.scenes.length - 1) finishStory();
    else renderScene(state.index + 1, { focus: true });
  }));
  container.append(actions);
}
function revealInteraction() {
  if (!currentScene()?.interaction) return;
  pauseNarration({ keepIntent: true });
  state.paragraph = currentScene().paragraphs.length - 1;
  state.interactionMode = true;
  interactionState().unlocked = true;
  renderInteraction();
  syncNavigation();
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function renderInteraction() {
  const scene = currentScene();
  const spec = scene.interaction;
  const container = $('interaction');
  container.replaceChildren();
  if (!spec || !state.interactionMode) return;
  requestAnimationFrame(fitReadingLayout);
  const progress = interactionState();
  if (!progress.unlocked) {
    const wait = element('div', 'interaction-wait');
    wait.append(element('p', '', spec.type === 'question' ? 'بعد السرد، نتأمّل سبب التحذير.' : 'بعد السرد، نجمع أحداث القصة.'));
    wait.append(smallButton(spec.type === 'question' ? 'قرأت المشهد؛ أظهر السؤال' : 'قرأت المشهد؛ أرتّب الأحداث', () => { pauseNarration(); revealInteraction(); }));
    container.append(wait);
    return;
  }
  addInteractionHeader(container, spec.type === 'question' ? 'نتذكّر معًا' : 'ثلاث لحظات من القصة');
  container.append(element('h3', '', spec.prompt));
  if (spec.type === 'question') {
    const answers = element('div', 'answers');
    spec.options.forEach((option, index) => {
      const button = smallButton('', () => {
        if (index === spec.correct) { progress.done = true; progress.wrong = null; }
        else progress.wrong = index;
        renderInteraction();
      }, `answer-button${progress.done && index === spec.correct ? ' correct' : progress.wrong === index ? ' retry' : ''}`);
      button.append(element('span', 'answer-dot'), element('span', '', option));
      button.disabled = progress.done;
      answers.append(button);
    });
    container.append(answers, feedbackNode(progress.done ? spec.success : progress.wrong !== null ? `${spec.hint} جرّب مرة أخرى.` : ''));
    addSkip(container, progress.done ? 'تابع القصة' : 'أتجاوز السؤال وأتابع');
    return;
  }
  if (spec.type === 'order') {
    const cards = element('div', 'order-cards');
    spec.cards.forEach(card => {
      const rank = progress.selected.indexOf(card.id);
      const button = smallButton('', () => {
        if (progress.done || progress.selected.includes(card.id)) return;
        progress.selected.push(card.id);
        progress.wrong = null;
        if (progress.selected.length === spec.correct.length) {
          progress.done = progress.selected.every((id, index) => id === spec.correct[index]);
          if (!progress.done) progress.wrong = true;
        }
        renderInteraction();
      }, `order-card${rank >= 0 ? ' selected' : ''}${progress.done ? ' correct' : ''}`);
      const img = element('img');
      img.src = artURL(card.image); img.alt = ''; img.loading = 'lazy';
      button.append(img, element('span', '', card.text), element('span', 'order-number', rank >= 0 ? displayNumber(rank + 1) : ''));
      button.setAttribute('aria-label', `${card.text}${rank >= 0 ? `، اخترته في الموضع ${displayNumber(rank + 1)}` : '، اختر هذا الحدث'}`);
      button.setAttribute('aria-pressed', String(rank >= 0));
      button.disabled = progress.done || rank >= 0;
      cards.append(button);
    });
    container.append(cards, feedbackNode(progress.done ? spec.success : progress.wrong ? `${spec.hint} يمكنك ترتيبها مرة أخرى.` : progress.selected.length ? `اختر الحدث ${progress.selected.length === 1 ? 'الثاني' : 'الأخير'}.` : 'اضغط على الحدث الأول، ثم الثاني، ثم الثالث.'));
    const actions = element('div', 'interaction-actions');
    if (!progress.done) actions.append(smallButton('ابدأ الترتيب من جديد', () => { progress.selected = []; progress.wrong = null; renderInteraction(); }));
    actions.append(smallButton(progress.done ? 'إلى ختام القصة' : 'أتجاوز الترتيب إلى الخاتمة', finishStory));
    container.append(actions);
  }
}

function finishStory() {
  pauseNarration();
  state.completed = true;
  $('closing').hidden = false;
  $('closing-summary').textContent = currentScene().paragraphs[0];
  $('interaction').replaceChildren();
  syncNavigation();
  syncPlayUI();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function updateCue() {
  if (!state.started || !currentScene() || state.pendingSeek !== null || state.interactionMode || state.completed || (audio.paused && !state.playing)) return;
  const duration = audio.duration;
  const time = audio.currentTime;
  $('audio-progress-fill').style.width = `${Number.isFinite(duration) && duration > 0 ? Math.min(100, time / duration * 100) : 0}%`;
  const track = currentTrack();
  const segment = [...(track?.segments || [])].reverse().find(item => time + .025 >= item.start);
  const cues = track?.cues || [];
  if (!cues.length && !track?.segments?.length) return;
  // Both language segments share one Arabic paragraph. No translated text enters the DOM.
  let paragraphIndex = segment?.paragraph;
  if (paragraphIndex === undefined) {
    paragraphIndex = cues.findLastIndex(cue => time + .025 >= cue.start);
    if (paragraphIndex < 0) paragraphIndex = 0;
  }
  if (paragraphIndex >= currentScene().paragraphs.length) return;
  if (paragraphIndex !== state.paragraph) {
    state.paragraph = paragraphIndex;
    renderParagraph();
  }
}

audio.addEventListener('timeupdate', updateCue);
audio.addEventListener('loadedmetadata', applyPendingSeek);
audio.addEventListener('seeked', updateCue);
audio.addEventListener('play', () => { if (state.started && !state.completed) { state.playing = true; syncPlayUI(); } });
audio.addEventListener('pause', () => { state.playing = false; syncPlayUI(); });
audio.addEventListener('error', () => { if (state.started && audio.getAttribute('src')) onAudioFailure(); });
audio.addEventListener('ended', () => {
  if (!state.started || !audio.ended || state.completed) return;
  state.playing = false;
  $('audio-progress-fill').style.width = '100%';
  if (currentScene()?.interaction) { revealInteraction(); syncPlayUI(); }
  else if (state.index < state.story.scenes.length - 1) renderScene(state.index + 1, { focus: true });
  else syncPlayUI();
});
audio.addEventListener('canplay', () => {
  if (state.audioFailed) { state.audioFailed = false; $('audio-notice').hidden = true; syncPlayUI(); }
});

$('start').addEventListener('click', () => {
  state.started = true;
  state.wantsAudio = true;
  state.interactions.clear();
  $('next').disabled = false;
  renderScene(0, { focus: true });
});
$('previous').addEventListener('click', () => {
  if (state.interactionMode || state.completed) setParagraph(currentScene().paragraphs.length - 1, { focus: true });
  else if (state.paragraph > 0) setParagraph(state.paragraph - 1, { focus: true });
  else if (state.index > 0) renderScene(state.index - 1, { paragraph: state.story.scenes[state.index - 1].paragraphs.length - 1, focus: true });
});
$('next').addEventListener('click', () => {
  if (!state.interactionMode && state.paragraph < currentScene().paragraphs.length - 1) {
    setParagraph(state.paragraph + 1, { focus: true });
  } else if (!state.interactionMode && currentScene().interaction) revealInteraction();
  else if (state.index === state.story.scenes.length - 1) finishStory();
  else renderScene(state.index + 1, { focus: true });
});
$('play-pause').addEventListener('click', () => {
  if (state.interactionMode || state.completed) { setParagraph(state.paragraph, { play: true }); return; }
  if (state.playing) pauseNarration(); else playNarration();
});
$('replay').addEventListener('click', () => {
  if (state.audioFailed) renderScene(state.index, { paragraph: state.paragraph, play: true });
  else setParagraph(state.paragraph, { play: true });
});
$('mute').addEventListener('click', () => {
  state.muted = !state.muted;
  audio.muted = state.muted;
  $('mute').setAttribute('aria-pressed', String(state.muted));
  $('mute').setAttribute('aria-label', state.muted ? 'إلغاء كتم الصوت' : 'كتم الصوت');
  $('mute').title = state.muted ? 'إلغاء كتم الصوت' : 'كتم الصوت';
  $('mute-icon').setAttribute('href', state.muted ? '#i-muted' : '#i-volume');
});
$('restart').addEventListener('click', () => {
  state.wantsAudio = true;
  state.interactions.clear();
  $('next').disabled = false;
  renderScene(0, { focus: true });
});
$('scene-art').addEventListener('error', () => { $('art-error').hidden = false; });
new ResizeObserver(() => requestAnimationFrame(fitReadingLayout)).observe(document.querySelector('.page-content'));
window.addEventListener('resize', fitReadingLayout);
document.addEventListener('visibilitychange', () => { if (document.hidden && state.started) pauseNarration(); });
window.addEventListener('pagehide', pauseNarration);

function safeExternalURL(value) {
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : null; } catch { return null; }
}
async function populateReferences() {
  const body = $('references-body');
  if (state.references) return;
  try {
    const response = await fetch(`${dataDirectory}references.json`, { cache: 'no-store' });
    if (!response.ok) throw new Error('references unavailable');
    state.references = await response.json();
    const refs = state.references;
    body.replaceChildren();
    if (refs.title) body.append(element('p', '', englishDigits(refs.title)));
    body.append(element('p', 'reference-note', (refs.note ? englishDigits(refs.note) : '') || 'نسخة تجريبية للمراجعة الأبوية، وليست محتوى حاصلًا على اعتماد شرعي. السرد شرح مبسّط للمعنى، والرسوم توضيحية.'));
    for (const source of refs.sources || []) {
      const block = element('div', 'reference-source');
      const url = safeExternalURL(source.url);
      if (url) { const link = element('a', '', englishDigits(source.title)); link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; block.append(link); }
      else block.append(element('p', '', englishDigits(source.title)));
      if (source.description) block.append(element('p', '', englishDigits(source.description)));
      body.append(block);
    }
    if (refs.verses?.length) body.append(element('h3', '', 'النص القرآني'));
    for (const verse of refs.verses || []) {
      const block = element('section', 'quran-verse');
      block.append(element('p', 'quran-label', `نص قرآني · ${englishDigits(verse.key)}`), element('p', 'quran-text', verse.text));
      body.append(block);
    }
    body.append(element('p', 'reference-note', 'الصوت راويٌ خارجي يشرح المعنى، وليس تلاوةً للآيات. لا تمثّل الرسوم الشكل التاريخي الحقيقي للمكان.'));
  } catch {
    body.replaceChildren(element('p', '', 'تعذّر تحميل المراجع. تحقّق من الاتصال ثم أعد فتح هذه النافذة.'));
    const sourceURL = safeExternalURL(state.story?.sourceURL);
    if (sourceURL) {
      const link = element('a', '', 'اقرأ المصدر الأساسي');
      link.href = sourceURL; link.target = '_blank'; link.rel = 'noopener noreferrer'; body.append(link);
    }
  }
}
document.querySelectorAll('[data-open-references]').forEach(button => button.addEventListener('click', () => {
  pauseNarration();
  $('references-dialog').showModal();
  document.body.classList.add('modal-open');
  populateReferences();
}));
$('close-references').addEventListener('click', () => $('references-dialog').close());
$('references-dialog').addEventListener('close', () => document.body.classList.remove('modal-open'));
$('references-dialog').addEventListener('click', event => {
  if (event.target !== $('references-dialog')) return;
  const rect = $('references-dialog').getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('references-dialog').close();
});

async function initialize() {
  try {
    const [storyResponse, manifestResponse] = await Promise.all([fetch(`${dataDirectory}story.json`, { cache: 'no-store' }), fetch(`${dataDirectory}audio-manifest.json`, { cache: 'no-store' }).catch(() => null)]);
    if (!storyResponse.ok) throw new Error('story unavailable');
    state.story = await storyResponse.json();
    if (!state.story.scenes?.length) throw new Error('story empty');
    if (manifestResponse?.ok) {
      try { const manifest = await manifestResponse.json(); state.manifest = manifest.scenes || []; } catch { state.manifest = []; }
    }
    document.title = state.story.title;
    renderCover();
    $('start-label').textContent = 'ابدأ القصة';
    $('start').disabled = false;
    // Resolve the first source before the start gesture; play() stays inside that gesture.
    audio.src = trackURL();
    audio.load();
  } catch {
    $('start-label').textContent = 'أعد تحميل القصة';
    $('load-message').textContent = 'تعذّر تحميل بيانات القصة. تحقّق من الاتصال ثم أعد تحميل الصفحة.';
    $('start').disabled = false;
    $('start').replaceWith($('start').cloneNode(true));
    $('start').addEventListener('click', () => location.reload());
  }
}
initialize();
