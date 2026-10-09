const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch(),page=await browser.newPage();
 await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({contentType:'application/javascript',body:'window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}})}})};'}));
 await page.goto('http://127.0.0.1:8871/');await page.locator('#loginForm').waitFor();
 const proof=await page.evaluate(()=>{
  const field=document.createElement('fieldset');document.body.append(field);
  renderAssignmentCheckboxes(field,[{quiz_id:'quran-al-balad'}]);
  const names=[...field.querySelectorAll('label')].filter(l=>l.querySelector('input').value.startsWith('quran-')).map(l=>l.textContent);
  const before=getAssignmentConfigs(field);
  field.querySelector('input[value="quran-al-balad"]').checked=false;
  field.querySelector('input[value="quran-deema"]').checked=true;
  const after=getAssignmentConfigs(field);
  renderAssignmentCheckboxes(field,[]);const newUserDefaults=getAssignmentConfigs(field);
  return {names,before,after,newUserDefaults};
 });
 assert.deepEqual(proof.names,['ق القرآن الكريم - حمود','ق القرآن الكريم - ديما']);
 assert.deepEqual(proof.before,[{quiz_id:'quran-al-balad',difficulty:'medium'}]);
 assert.deepEqual(proof.after,[{quiz_id:'quran-deema',difficulty:'medium'}]);assert.deepEqual(proof.newUserDefaults,[]);
 await page.goto('http://127.0.0.1:8871/quran/privacy.html?group=deema');
 assert.deepEqual(await page.locator('header a').evaluateAll(a=>a.map(x=>x.getAttribute('href'))),['./?group=deema','./?group=deema']);
 fs.writeFileSync('docs/quran-group-admin-tests.json',JSON.stringify({isolatedDOMFixtures:true,productionDataWritten:false,...proof,privacyReturnKeepsGroup:true},null,2));
 await browser.close();console.log('Admin names, independent selection, unchanged defaults and privacy return passed.');
})().catch(e=>{console.error(e);process.exit(1)});
