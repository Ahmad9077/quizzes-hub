// Real Alafasy media; isolated Hub auth only. No child account or microphone.
const {webkit}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const base=process.env.QURAN_TEST_BASE || 'http://127.0.0.1:8871';
(async()=>{
 const browser=await webkit.launch(),page=await browser.newPage({viewport:{width:390,height:664}});
 await page.addInitScript(()=>{
  window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{user:{id:'fatiha-audio-fixture'}}}}),onAuthStateChange(){}},from:()=>({select(){return this},eq(){return this},maybeSingle:async()=>({data:{quiz_id:'quran-al-balad'}})})})};
  window.proof={played:[],ended:[],hidden:[],active:0,max:0};
  const play=HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play=function(){
   const file=this.src.split('/').at(-1);proof.played.push(file);proof.hidden.push(document.getElementById('verseText').hidden);
   let active=false;this.addEventListener('playing',()=>{if(!active){active=true;proof.active++;proof.max=Math.max(proof.max,proof.active)}});
   const stop=()=>{if(active){active=false;proof.active--}};
   this.addEventListener('pause',stop);this.addEventListener('ended',()=>{proof.ended.push(file);stop()});return play.call(this);
  };
 });
 await page.goto(base+'/quran/#surah-1');await page.locator('#reader').waitFor({state:'visible'});await page.evaluate(()=>document.fonts.ready);
 assert(await page.locator('#basmala').isHidden());assert.equal(await page.locator('#verseText').textContent(),JSON.parse(fs.readFileSync('quran/data/1.json')).verses[0].text);
 await page.screenshot({path:'/tmp/quran-fatiha-first-verse.png',fullPage:true});
 // Cumulative playback to verse 1 must play the basmala only once.
 await page.locator('#listenUntil').click();await page.waitForFunction(()=>!playing&&proof.ended.length>0,{},{timeout:30000});
 assert.deepEqual(await page.evaluate(()=>proof.played),['001001.mp3']);
 assert.deepEqual(await page.evaluate(()=>proof.ended),['001001.mp3']);
 await page.locator('#testMode').click();await page.evaluate(()=>{selectVerse(7);proof.played=[];proof.ended=[];proof.hidden=[]});
 await page.locator('#listenUntil').click();await page.waitForFunction(()=>!playing&&proof.ended.length===7,{},{timeout:90000});
 const full=await page.evaluate(()=>structuredClone(proof)),expected=Array.from({length:7},(_,i)=>'00100'+(i+1)+'.mp3');
 assert.deepEqual(full.played,expected);assert.deepEqual(full.ended,expected);assert(full.hidden.every(Boolean));assert.equal(full.max,1);assert(await page.locator('#basmala').isHidden());
 await page.locator('#reveal').click();await page.screenshot({path:'/tmp/quran-fatiha-last-verse.png',fullPage:true});
 // Other Surahs still have the separate introductory basmala.
 await page.locator('#backHome').click();await page.locator('.surah-card[href="#surah-90"]').click();await page.waitForFunction(()=>chapter.chapter===90&&currentScreen==='reader');
 await page.evaluate(()=>{selectVerse(1);proof.played=[];proof.ended=[];proof.hidden=[]});assert(await page.locator('#basmala').isVisible());
 await page.locator('#listenUntil').click();await page.waitForFunction(()=>!playing&&proof.ended.length===2,{},{timeout:40000});assert.deepEqual(await page.evaluate(()=>proof.ended),['001001.mp3','090001.mp3']);
 // An unavailable Fatiha audio file must not produce a successful playback state.
 await page.locator('#backHome').click();await page.locator('.surah-card[href="#surah-1"]').click();await page.waitForFunction(()=>chapter.chapter===1&&currentScreen==='reader');
 await page.evaluate(()=>selectVerse(2));await page.route('**/001002.mp3',r=>r.abort());await page.locator('#listen').click();await page.waitForFunction(()=>!playing&&document.getElementById('message').textContent.length>0);
 assert(await page.locator('#reveal').isVisible());await page.locator('#reveal').click();assert(await page.locator('#verseText').isVisible());
 const result={engine:'WebKit',physicalDevice:false,realChildAccount:false,realMediaPlayback:true,basmalaNumberedVerse1:true,noDuplicateBasmala:true,fullFatihaPlayback:full.ended,textStayedHidden:true,maxConcurrentPlayback:full.max,otherSurahIntroBasmalaPreserved:true,audioFailureKeepsReading:true};
 fs.writeFileSync('docs/quran-fatiha-audio-tests.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
