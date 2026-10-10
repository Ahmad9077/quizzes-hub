'use strict';
const byId = id => document.getElementById(id);
let hadith, player = null, audioGeneration = 0, allowed = false;
function stopHadith() {
  audioGeneration++;
  if (player) { player.pause(); player.removeAttribute('src'); player.load(); player = null; }
  byId('hadithListen').textContent = 'استمع للحديث';
  byId('hadithListen').setAttribute('aria-pressed', 'false');
  byId('hadithStatus').textContent = '';
}
function setHadithMode(test) {
  stopHadith();
  byId('hadithText').hidden = test; byId('hadithRecall').hidden = !test;
  byId('hadithLearn').setAttribute('aria-pressed', String(!test));
  byId('hadithTest').setAttribute('aria-pressed', String(test));
}
async function listenHadith() {
  if (!allowed || !hadith) return;
  if (player) { stopHadith(); return; }
  stopHadith(); const token = audioGeneration;
  byId('hadithMessage').textContent = '';
  player = new Audio(hadith.audio);
  byId('hadithListen').textContent = 'إيقاف الصوت'; byId('hadithListen').setAttribute('aria-pressed', 'true');
  byId('hadithStatus').textContent = 'جارٍ التشغيل…';
  const fail = () => { if (token !== audioGeneration) return; stopHadith(); byId('hadithMessage').textContent = 'تعذر تشغيل الصوت. يمكنك قراءة الحديث والمحاولة مجددًا.'; };
  player.onended = () => { if (token === audioGeneration) stopHadith(); };
  player.onerror = fail;
  try { await player.play(); if (token === audioGeneration) byId('hadithStatus').textContent = ''; } catch { fail(); }
}
async function initHadith() {
  try {
    const access = await window.QuizzesHubAccessReady;
    if (!access?.ok || access.quizId !== 'quran-deema') throw Error('افتحي المجموعة من الهَب.');
    const client = window.QuizzesHubSupabaseClient;
    const {data,error} = await client.auth.getSession(); const user = data?.session?.user?.id;
    if (error || !user) throw Error('افتحي المجموعة من الهَب.');
    client.auth.onAuthStateChange((_event,session) => { if(session?.user?.id !== user) { allowed=false;stopHadith();location.replace('../'); } });
    const response=await fetch('data/hadith-deema.json?v=1');if(!response.ok)throw Error('تعذر تحميل الحديث. حاولي مرة أخرى.');
    hadith=await response.json();
    byId('hadithText').textContent=hadith.text;byId('hadithTitle').textContent=hadith.title;
    byId('hadithSource').textContent=hadith.source;byId('hadithSource').href=hadith.sourceUrl;
    byId('hadithGrade').textContent=hadith.grade;byId('hadithVoice').textContent=hadith.voiceNotice;
    allowed=true;byId('hadithMessage').textContent='';byId('hadithReader').hidden=false;byId('hadithMain').setAttribute('aria-busy','false');
  } catch { byId('hadithMessage').textContent='تعذر فتح الحديث. ارجعي إلى الهَب وحاولي مرة أخرى.'; }
}
byId('hadithLearn').onclick=()=>setHadithMode(false);byId('hadithTest').onclick=()=>setHadithMode(true);
byId('hadithReveal').onclick=()=>{stopHadith();byId('hadithText').hidden=false;byId('hadithRecall').hidden=true;};
byId('hadithListen').onclick=listenHadith;
window.addEventListener('pagehide',stopHadith);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopHadith();});
initHadith();
