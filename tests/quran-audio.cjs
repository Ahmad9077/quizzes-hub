// Real provider MP3 playback in WebKit; only Hub authentication is an isolated fixture.
const {webkit}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const base=process.env.QURAN_TEST_BASE || 'http://127.0.0.1:8871';
const entries=JSON.parse(fs.readFileSync('quran/data/surahs.json'));
(async()=>{
 const browser=await webkit.launch(),page=await browser.newPage({viewport:{width:390,height:664}}),results=[];
 await page.addInitScript(()=>{
  window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{user:{id:'audio-fixture'}}}}),onAuthStateChange(){}},from:()=>({select(){return this},eq(){return this},maybeSingle:async()=>({data:{quiz_id:'quran-al-balad'}})})})};
  window.proof={played:[],ended:[],active:0,max:0,hidden:[]};
  const play=HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play=function(){
   const file=this.src.split('/').at(-1);proof.played.push(file);proof.hidden.push(document.getElementById('verseText').hidden);
   let active=false;this.addEventListener('playing',()=>{if(!active){active=true;proof.active++;proof.max=Math.max(proof.max,proof.active)}});
   const stop=()=>{if(active){active=false;proof.active--}};
   this.addEventListener('pause',stop);this.addEventListener('ended',()=>{proof.ended.push(file);stop()});return play.call(this);
  };
 });
 await page.goto(base+'/quran/');await page.locator('.surah-card').first().waitFor();
 for(const entry of entries){
  await page.locator('.surah-card[href="#surah-'+entry.id+'"]').click();await page.locator('#reader').waitFor({state:'visible'});
  await page.evaluate(()=>{selectVerse(1);proof.played=[];proof.ended=[]});
  await page.locator('#listen').click();await page.waitForFunction(()=>proof.ended.length===1&&!playing,{},{timeout:30000});
  const played=await page.evaluate(()=>structuredClone(proof));const expected=String(entry.id).padStart(3,'0')+'001.mp3';
  assert.deepEqual(played.played,[expected]);assert.deepEqual(played.ended,[expected]);assert.equal(played.max,1);
  results.push({chapter:entry.id,singleVersePlayedOnce:expected,realMediaPlayback:true});console.log('Real playback passed '+entry.id);
  await page.locator('#backHome').click();await page.locator('#home').waitFor({state:'visible'});
 }
 await page.locator('.surah-card[href="#surah-85"]').click();await page.locator('#testMode').click();
 await page.evaluate(()=>{selectVerse(3);proof.played=[];proof.ended=[];proof.hidden=[]});await page.locator('#listenUntil').click();
 await page.waitForFunction(()=>proof.ended.length===4&&!playing,{},{timeout:60000});
 const cumulative=await page.evaluate(()=>structuredClone(proof));assert.deepEqual(cumulative.ended,['001001.mp3','085001.mp3','085002.mp3','085003.mp3']);assert(cumulative.hidden.every(Boolean));assert.equal(cumulative.max,1);assert(await page.locator('#verseText').isHidden());
 // Leaving one chapter and opening another must cancel the previous sequence.
 await page.locator('#listenUntil').click();await page.waitForFunction(()=>audioElement&&!audioElement.paused);
 await page.locator('#backHome').click();await page.locator('.surah-card[href="#surah-84"]').click();
 const count=await page.evaluate(()=>proof.played.length);await page.waitForTimeout(800);
 assert(await page.evaluate(()=>!playing&&audioElement===null));assert.equal(await page.evaluate(()=>proof.played.length),count);
 await page.locator('#listen').click();await page.waitForFunction(()=>audioElement&&!audioElement.paused);assert(await page.evaluate(()=>audioElement.src.endsWith('084001.mp3')));await page.locator('#listen').click();assert(await page.evaluate(()=>audioElement===null&&!playing));
 // A failed source must leave reading usable with a clear error.
 await page.route('**/data/audio-84.json',r=>r.abort());await page.evaluate(()=>{delete catalog.get(84).audioData;audioData=null});await page.locator('#listen').click();
 await page.waitForFunction(()=>!playing&&document.getElementById('message').textContent.length>0);assert(await page.locator('#verseText').isVisible());
 results.push({engine:'WebKit',cumulativeUntil3:cumulative.ended,textStayedHidden:true,maxConcurrentPlayback:cumulative.max,switchingSurahsStopsAudio:true,stopButtonStopsAudio:true,audioFailureKeepsReading:true,physicalDevice:false});
 await browser.close();fs.writeFileSync('docs/quran-seven-surahs-audio-tests.json',JSON.stringify(results,null,2));console.log('All real-media checks passed.');
})().catch(e=>{console.error(e);process.exit(1)});
