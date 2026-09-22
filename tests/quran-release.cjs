// Run against a local HTTP server; credentials and writes are replaced with isolated fixtures.
const {chromium, webkit} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs'), assert=require('node:assert/strict');
const base=process.env.QURAN_TEST_BASE || 'http://127.0.0.1:8871';
const entries=JSON.parse(fs.readFileSync('quran/data/surahs.json'));
const chapters=entries.map(entry=>JSON.parse(fs.readFileSync('quran/'+entry.text)));
const expectedIds=[90,89,88,87,86,85,84];
assert.deepEqual(entries.map(e=>e.id),expectedIds);
const out=[];
async function fixture(page, user='test-a', assigned=true) {
 await page.addInitScript(({user,assigned})=>{
  window.fixtureAuthChange=null;
  window.supabase={createClient:()=>({
   auth:{getSession:async()=>({data:{session:user?{user:{id:user}}:null}}),onAuthStateChange:cb=>{window.fixtureAuthChange=cb;return {data:{subscription:{unsubscribe(){}}}}}},
   from:table=>({select(){return this},eq(){return this},maybeSingle:async()=>({data:assigned?{quiz_id:'quran-al-balad',difficulty:'medium'}:null})})
  })};
 },{user,assigned});
 await page.route('https://ahmad9077.github.io/quizzes-hub/**', r=>r.fulfill({contentType:'text/plain',body:'Hub redirect fixture'}));
}
(async()=>{
 for(const [name,type,w,h] of [['small-phone',webkit,320,568],['iphone-small',webkit,375,548],['iphone',webkit,390,664],['ipad',webkit,820,1180],['desktop',chromium,1440,1000]]) {
  const browser=await type.launch(), context=await browser.newContext({viewport:{width:w,height:h},isMobile:w<721,hasTouch:w<1000}), page=await context.newPage(),errors=[];
  await fixture(page);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/quran/');await page.locator('.surah-card').first().waitFor();await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('#backHub').getAttribute('href'),'../');
  assert.deepEqual(await page.locator('.surah-card').evaluateAll(cards=>cards.map(c=>c.getAttribute('href'))),expectedIds.map(id=>'#surah-'+id));
  async function fit(label) {
   const box=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:innerHeight,scrollHeight:document.documentElement.scrollHeight}));
   assert(box.scrollWidth<=box.width, name+' '+label+' horizontal '+JSON.stringify(box));if(w<721)assert(box.scrollHeight<=box.height+1,name+' '+label+' scroll '+JSON.stringify(box));
  }
  await fit('home');
  await page.screenshot({path:'/tmp/quran-seven-'+name+'-home.png',fullPage:true});
  let checked=0;
  for(const surah of chapters) {
   await page.locator('.surah-card[href="#surah-'+surah.chapter+'"]').click();await page.locator('#reader').waitFor({state:'visible'});
   assert.equal(await page.locator('#chapterTitle').textContent(),'سورة '+surah.name);
   assert(await page.locator('#previous').isDisabled());
   for(const verse of surah.verses) {
    await page.evaluate(id=>selectVerse(id),verse.id);await page.waitForTimeout(35);
    assert.equal(await page.locator('#verseText').textContent(),verse.text);
    assert.equal(await page.locator('#verseMarker').getAttribute('aria-label'),'الآية '+new Intl.NumberFormat('ar-KW').format(verse.id));
    await fit(surah.chapter+':'+verse.id);
    const bounds=await page.evaluate(()=>{const e=document.getElementById('verseLine'),s=document.getElementById('verseStage'),r=document.createRange();r.selectNodeContents(e);const t=r.getBoundingClientRect(),c=s.getBoundingClientRect();return {top:t.top,bottom:t.bottom,left:t.left,right:t.right,cardTop:c.top,cardBottom:c.bottom,cardLeft:c.left,cardRight:c.right};});
    assert(bounds.top>=bounds.cardTop-1&&bounds.bottom<=bounds.cardBottom+1&&bounds.left>=bounds.cardLeft-1&&bounds.right<=bounds.cardRight+1, name+' clipped '+surah.chapter+':'+verse.id+' '+JSON.stringify(bounds));checked++;
   }
   assert(await page.locator('#next').isDisabled());
   await page.locator('#previous').click();assert.equal(await page.locator('#versePicker').inputValue(),String(surah.verses.length-1));
   await page.locator('#next').click();assert.equal(await page.locator('#versePicker').inputValue(),String(surah.verses.length));
   await page.locator('#testMode').click();assert(await page.locator('#verseText').isHidden());assert(await page.locator('#verseMarker').isHidden());
   await page.locator('#reveal').click();assert(await page.locator('#verseText').isVisible());await page.waitForTimeout(40);await fit('revealed '+surah.chapter);
   await page.reload();await page.locator('#reader').waitFor({state:'visible'});assert.equal(await page.locator('#versePicker').inputValue(),String(surah.verses.length));assert(await page.locator('#verseText').isHidden());
   await page.locator('#backHome').click();await page.locator('#home').waitFor({state:'visible'});
  }
  const saved=await page.evaluate(()=>Object.keys(localStorage).sort());assert.deepEqual(saved,expectedIds.map(id=>'quizzes-hub:quran:test-a:verse:'+id).sort());
  await page.locator('.surah-card[href="#surah-90"]').click();await page.waitForFunction(()=>chapter.chapter===90&&currentScreen==='reader');assert.equal(await page.locator('#versePicker').inputValue(),'20');assert(await page.locator('#verseText').isHidden());
  await page.locator('#learnMode').click();await page.evaluate(()=>selectVerse(17));await page.waitForTimeout(50);
  await page.screenshot({path:'/tmp/quran-seven-'+name+'-reader.png',fullPage:true});
  await page.evaluate(()=>fixtureAuthChange('SIGNED_OUT',null));await page.waitForURL(base+'/');
  assert.deepEqual(errors,[]);
  out.push({name,surahs:chapters.length,versesChecked:checked,noClippedText:true,noHorizontalOverflow:true,noScroll:w<721,bookmarkPerSurahRestored:true,signoutLeavesApp:true,physicalDevice:false});await browser.close();console.log(name+' passed '+checked+' verses');
 }
 const b=await chromium.launch();
 // Same origin storage from another account must not become this account's bookmark.
 const p=await b.newPage();await fixture(p,'test-b');await p.addInitScript(()=>localStorage.setItem('quizzes-hub:quran:test-a:verse:90',JSON.stringify({verse:17,mode:'test'})));
 await p.goto(base+'/quran/#surah-90');await p.locator('#reader').waitFor({state:'visible'});assert.equal(await p.locator('#versePicker').inputValue(),'1');
 await p.evaluate(async()=>{const e=catalog.get(90);await loadAudio(e);e.audioData.expires='2000-01-01';await loadAudio(e)});
 const refreshed=await p.evaluate(()=>({ids:catalog.get(90).audioData.verses.map(v=>v.id),retrieved:catalog.get(90).audioData.retrieved}));assert.deepEqual(refreshed.ids,Array.from({length:20},(_,i)=>i+1));
 await p.route('https://api.quran.com/**',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({audio_files:[{verse_key:'90:1',url:'other.mp3'}]})}));
 await p.evaluate(()=>{catalog.get(90).audioData.expires='2000-01-01'});await p.locator('#listen').click();await p.waitForFunction(()=>!playing&&document.getElementById('message').textContent.length>0);assert(await p.locator('#verseText').isVisible());
 out.push({perAccountIsolation:true,expiredMetadataRefreshedFromRealProvider:true,refreshed,wrongMetadataRejected:true});await p.close();
 for(const [name,user,assigned,reason] of [['signed-out',null,true,'signin'],['unassigned','test-a',false,'unauthorized']]) {
  const page=await b.newPage();await fixture(page,user,assigned);await page.goto(base+'/quran/');await page.waitForURL('https://ahmad9077.github.io/quizzes-hub/**');assert.equal(new URL(page.url()).searchParams.get('access'),reason);out.push({name,redirect:reason});await page.close();
 }
 // Exercise the actual Hub tile/assignment renderers with isolated DOM fixtures.
 const hub=await b.newPage();await hub.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({contentType:'application/javascript',body:'window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}})}})};'}));
 await hub.goto(base+'/');await hub.locator('#loginForm').waitFor();
 const tiles=await hub.evaluate(()=>{renderTemplate('dashboardTemplate');renderAssignedQuizzes([{quiz_id:'prophets-stories'},{quiz_id:'quran-al-balad'}]);const links=[...document.querySelectorAll('#assignedQuizGrid a')].map(x=>x.getAttribute('href'));const graded=getAllowedQuizzes([{quiz_id:'quran-al-balad'}]).length;const field=document.createElement('fieldset');renderAssignmentCheckboxes(field,[]);const count=field.querySelectorAll('input[value="quran-al-balad"]').length;renderAssignedQuizzes([{quiz_id:'prophets-stories'}]);return {links,graded,count,unassignedCount:document.querySelectorAll('.quran-tile').length}});
 assert.deepEqual(tiles,{links:['prophets-stories.html','quran/'],graded:0,count:1,unassignedCount:0});out.push({hubCatalog:tiles});
 await b.close();fs.writeFileSync('docs/quran-seven-surahs-tests.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
