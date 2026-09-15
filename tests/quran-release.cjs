// Run against a local HTTP server; credentials and writes are replaced with isolated fixtures.
const {chromium, webkit} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs'), assert=require('node:assert/strict');
const base=process.env.QURAN_TEST_BASE || 'http://127.0.0.1:8871';
const verses=JSON.parse(fs.readFileSync('quran/data/90.json')).verses;
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
 for(const [name,type,w,h] of [['iphone-small',webkit,375,548],['iphone',webkit,390,664],['ipad',webkit,820,1180],['desktop',chromium,1440,1000]]) {
  const browser=await type.launch(), context=await browser.newContext({viewport:{width:w,height:h},isMobile:w<721,hasTouch:w<1000}), page=await context.newPage(),errors=[];
  await fixture(page);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/quran/');await page.locator('.surah-card').waitFor();await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('#backHub').getAttribute('href'),'../');
  await page.locator('.surah-card').click();
  for(let id=1;id<=20;id++) {
   await page.evaluate(id=>selectVerse(id),id);await page.waitForTimeout(40);
   assert.equal(await page.locator('#verseText').textContent(),verses[id-1].text);
   const box=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:innerHeight,scrollHeight:document.documentElement.scrollHeight}));
   assert(box.scrollWidth<=box.width);if(w<721)assert(box.scrollHeight<=box.height+1,JSON.stringify(box));
  }
  await page.locator('#previous').click();assert.equal(await page.locator('#versePicker').inputValue(),'19');
  await page.locator('#next').click();assert.equal(await page.locator('#versePicker').inputValue(),'20');assert(await page.locator('#next').isDisabled());
  assert.equal(await page.locator('#previous svg').count(),1);assert.equal(await page.locator('#next svg').count(),1);
  await page.locator('#testMode').click();assert(await page.locator('#verseText').isHidden());await page.locator('#reveal').click();assert(await page.locator('#verseText').isVisible());
  await page.reload();await page.locator('#reader').waitFor({state:'visible'});assert.equal(await page.locator('#versePicker').inputValue(),'20');assert(await page.locator('#verseText').isHidden());
  const saved=await page.evaluate(()=>Object.keys(localStorage));assert.deepEqual(saved,['quizzes-hub:quran:test-a:verse:90']);
  await page.screenshot({path:'/tmp/quran-release-'+name+'.png',fullPage:true});
  await page.evaluate(()=>fixtureAuthChange('SIGNED_OUT',null));await page.waitForURL(base+'/');
  assert.deepEqual(errors,[]);
  out.push({name,all20Verses:true,noHorizontalOverflow:true,noScroll:w<721,bookmarkRestored:true,signoutLeavesApp:true,physicalDevice:false});await browser.close();
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
 await b.close();fs.writeFileSync('docs/quran-release-tests.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
