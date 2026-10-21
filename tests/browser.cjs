/* Uses an existing Playwright installation; no runtime dependency or external data. */
const pw = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const C = require('../calculations.js');
const nextVersion = C.VERSION + '-update-test';
const artifacts = path.join(root, 'test-artifacts');
fs.mkdirSync(artifacts, {recursive:true});
let revision = 1;
const mime = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.json':'application/json', '.md':'text/plain', '.pdf':'application/pdf'};
const server = http.createServer((req,res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const file = pathname.startsWith('/la-calculator/') ? pathname.slice('/la-calculator/'.length) || 'index.html' : null;
  if (!file || file.includes('..')) {res.writeHead(404);res.end();return;}
  try {
    let data = fs.readFileSync(path.join(root,file));
    if(revision===2 && ['service-worker.js','calculations.js'].includes(file)) data=Buffer.from(data.toString().replaceAll(C.VERSION,nextVersion));
    res.writeHead(200, {'content-type':mime[path.extname(file)] || 'application/octet-stream','cache-control':'no-store'});res.end(data);
  } catch {res.writeHead(404);res.end();}
});
(async()=>{
  const reports=[];
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port=server.address().port;
  const base=`http://127.0.0.1:${port}/la-calculator/`;
  try {
    for (const engine of (process.env.BROWSER_ENGINES || 'chromium,webkit').split(',')) {
      revision=1;
      const browser=await pw[engine].launch({headless:true});
      try {
        const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
        const page=await context.newPage();const errors=[];const external=[];
        page.on('pageerror',e=>errors.push(e.message));
        page.on('request',req=>{if(!req.url().startsWith(base)&&!req.url().startsWith('data:'))external.push(req.url());});
        const checks=[];
        const check=(name,condition)=>{assert.ok(condition,name);checks.push(name);};
        const fill=(id,v)=>page.locator('#'+id).fill(v);
        const select=(id,v)=>page.locator('#'+id).selectOption(v);
        async function nav(name){await page.locator('#menu-button').click();await page.locator(`#app-menu [data-page="${name}"]`).click();}
        async function field(key,value,index=0){const el=page.locator(`[data-key="${key}"]`).nth(index);if(await el.evaluate(e=>e.tagName)==='SELECT')await el.selectOption(value);else await el.fill(value);}
        await page.goto(base);
        check('no calculation without age/weight',await page.locator('#la-results').innerText()==='');
        check('adult label visible',/ADULTS 18\+/.test(await page.locator('body').innerText()));
        await fill('patient-weight','70');await fill('patient-age','40');
        await page.locator('.quick-nav [data-page="fluids"]').click();
        check('70kg 110mL/hr',/110 mL\/hr/.test(await page.locator('#fluid-rate').innerText()));
        check('24h 2640mL',await page.locator('#fluid-total').innerText()==='2,640 mL');
        check('no fasting prescription',await page.locator('#fasting').count()===0);
        await page.locator('#page-fluids summary').first().click();
        check('three simple tiers',/First 10 kg: 40/.test(await page.locator('#fluid-results').innerText()));
        await page.screenshot({path:path.join(artifacts,`${engine}-fluids-mobile.png`),fullPage:true});
        await page.locator('#page-fluids summary').filter({hasText:'Compare with NICE'}).click();await select('fluid-basis','measured');
        check('separate NICE 1750–2100',/1,750–2,100/.test(await page.locator('#nice-results').innerText()));
        await select('fluid-basis','ideal');check('missing selected weight clears NICE',await page.locator('#nice-results').innerText()==='');await fill('fluid-weight','60');
        check('ideal reference does not change421',/1,500–1,800/.test(await page.locator('#nice-results').innerText())&&/110 mL\/hr/.test(await page.locator('#fluid-rate').innerText()));
        await select('patient-unit','lb');check('unit switch preserves underlying value',/110 mL\/hr/.test(await page.locator('#fluid-rate').innerText()));await select('patient-unit','kg');
        await fill('patient-weight','100');check('100kg140',/140 mL\/hr/.test(await page.locator('#fluid-rate').innerText()));
        for(const [w,r] of [['10','40'],['20','60'],['20.5','60.5']]){await fill('patient-weight',w);check(`tier ${w}`,new RegExp(`${r} mL/hr`).test(await page.locator('#fluid-rate').innerText()));}
        await fill('patient-weight','70');await fill('patient-age','17');check('under18 fluids stopped',await page.locator('#fluid-results').innerText()==='');await fill('patient-age','40');
        await nav('abl');await fill('abl-factor','75');await fill('hb-start','14');await fill('hb-min','10');check('retained adult ABL',await page.locator('#abl-total').innerText()==='1,500 mL');
        await page.locator('[name="abl-mode"][value="hct"]').check();await fill('hct-start','42');await fill('hct-min','30');check('Hb Hct comparable',await page.locator('#abl-total').innerText()==='1,500 mL');
        await fill('patient-age','17');check('ABL adult guard',await page.locator('#abl-results').innerText()==='');await fill('patient-age','40');
        await nav('local');await select('la-prior-exparel','no');await field('drug','lidocaine');await field('status','planned');await field('route','infiltration');await field('concentration','1');await field('volume','10');
        check('lidocaine dose and units',/100 mg/.test(await page.locator('#la-results').innerText()));check('qualified status',/Within the checked limits/.test(await page.locator('#la-results').innerText()));
        await page.locator('#jump-result').click();check('result reached in one tap',await page.locator('#la-results').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=60&&r.top<200;}));
        await field('volume','30.001');check('overdose STOP',/STOP/.test(await page.locator('#la-results').innerText())&&await page.locator('#copy-summary').isDisabled());
        await field('volume','');check('missing dose clears stale result',await page.locator('#la-results').innerText()==='');await field('volume','10');
        await select('la-prior-exparel','unknown');check('unknown96h blocked',await page.locator('#copy-summary').isDisabled());await select('la-prior-exparel','no');
        await page.screenshot({path:path.join(artifacts,`${engine}-local-mobile.png`),fullPage:true});
        await field('drug','exparel');check('drug change clears old dose and status',await page.locator('[data-key="volume"]').inputValue()===''&&await page.locator('[data-key="status"]').inputValue()==='');await field('status','planned');await field('indication','interscalene');await field('volume','10');
        check('missing EXPAREL checks fail closed',await page.locator('#copy-summary').isDisabled());
        await select('la-pregnancy','no');await select('exp-prior-local','none');await select('exp-bupi-timing','none');await select('exp-diluent','none');await fill('exp-diluent-volume','0');
        check('EXPAREL133mg',/133 mg/.test(await page.locator('#la-results').innerText()));check('EXPAREL dose limit is not zero',!/Route dose limit\s*0 mg/.test(await page.locator('#la-results').innerText()));check('EXPAREL checked status',/Within the checked limits/.test(await page.locator('#la-results').innerText()));check('actionable cautions visible',await page.locator('#la-results > aside.info-warn').isVisible());
        await field('volume','10.001');check('EXPAREL excess blocked',await page.locator('#copy-summary').isDisabled());await field('volume','10');
        await field('indication','unsupported');check('unsupported block stops',await page.locator('#copy-summary').isDisabled());await field('indication','interscalene');
        await select('exp-prior-local','lidocaine');await fill('exp-lidocaine-minutes','19.99');check('lidocaine timing blocked',await page.locator('#copy-summary').isDisabled());await fill('exp-lidocaine-minutes','20');check('20minute boundary',!await page.locator('#copy-summary').isDisabled());await select('exp-prior-local','none');
        await select('exp-diluent','other');await fill('exp-diluent-volume','10');check('invalid diluent stopped',await page.locator('#copy-summary').isDisabled());await select('exp-diluent','none');await fill('exp-diluent-volume','0');
        await page.locator('[data-add-bupi]').click();await field('status','planned',1);await field('route','peripheral',0);await field('concentration','0.5',0);await field('volume','13.31',1);await field('selectedLimit','175');await select('exp-bupi-timing','admix');
        check('1:2 ratio exceed blocked',await page.locator('#copy-summary').isDisabled());
        await page.locator('#jump-result').click();await page.screenshot({path:path.join(artifacts,`${engine}-exparel-stop-mobile.png`)});
        await field('volume','10',1);await field('indication','adductor');
        check('exact adductor regimen',!await page.locator('#copy-summary').isDisabled());check('HCl dose and ratio in EXPAREL overview',await page.locator('#la-results .result-card').first().evaluate(e=>/Added HCl dose\s*50 mg/.test(e.innerText)&&/66.5 mg/.test(e.innerText)));
        await page.locator('#exparel-checks summary').click();await page.locator('#la-results').scrollIntoViewIfNeeded();
        await page.locator('#jump-result').click();await page.screenshot({path:path.join(artifacts,`${engine}-exparel-mobile.png`)});
        // Clipboard is mocked only to check content; native permission behavior is not claimed.
        await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.copied=text;}},configurable:true}));await page.locator('#copy-summary').click();
        check('copied review includes both doses and caveat',await page.evaluate(()=>/Bupivacaine HCl.*50 mg/.test(window.copied)&&/does not establish safety/.test(window.copied)&&/pregnancy: no/.test(window.copied)&&/Final syringe: 20 mL/.test(window.copied)));
        await fill('patient-age','17.99');check('drug adult guard',await page.locator('#la-results').innerText()==='');await fill('patient-age','40');
        await nav('profile');await select('profile-sex','male');await fill('profile-height','170');check('body-size retained',/65.9 kg/.test(await page.locator('#profile-results').innerText()));
        await fill('profile-height','1.7e2');check('scientific height rejected',await page.locator('#profile-results').innerText()==='');await fill('profile-height','170');
        await nav('burns');await select('burn-protocol','aba-adult');await fill('burn-tbsa','30');await fill('burn-elapsed','2');await fill('burn-prior','500');check('adult burn retained',/4,200 mL/.test(await page.locator('#burn-results').innerText()));
        await nav('last');check('adult LAST arithmetic retained',/105 mL/.test(await page.locator('#lipid-results').innerText()));
        for(const width of [320,375,390,430,768]) {
          await page.setViewportSize({width,height:844});
          for(const name of ['local','fluids','abl','profile','burns','last','settings']) {
            await nav(name);
            check(`no overflow ${name}/${width}`,!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1));
            const small=await page.locator('button:visible, select:visible, summary:visible, input[type=number]:visible, label.checkbox-row:visible').evaluateAll(els=>els.filter(e=>{const r=e.getBoundingClientRect();return r.width<43.9||r.height<43.9;}).map(e=>e.id||e.textContent));
            assert.deepEqual(small,[],`touch targets ${name}/${width}`);
          }
        }
        await page.setViewportSize({width:390,height:844});
        await page.locator('#reset-patient').click();check('clear resets age and history',await page.locator('#patient-age').inputValue()===''&&await page.locator('#la-prior-exparel').inputValue()==='');
        check('no patient persistence',await page.evaluate(()=>localStorage.length===0&&sessionStorage.length===0));
        await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
        await page.evaluate(async()=>{const c=await caches.open('unrelated-cache');await c.put('/marker',new Response('keep'));});
        // WebKit setOffline has upstream issue42775. Stop the actual owned origin for both engines.
        await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});
        check('origin unavailable during offline checks',await new Promise(resolve=>{const req=http.get(base,res=>{res.resume();resolve(false);});req.on('error',()=>resolve(true));}));
        if(engine==='chromium')await context.setOffline(true);await page.close();const offline=await context.newPage();offline.on('pageerror',e=>errors.push(e.message));await offline.goto(base);await offline.locator('#patient-weight').fill('70');await offline.locator('#patient-age').fill('40');await offline.locator('.quick-nav [data-page="fluids"]').click();check('cold offline calculation',/110 mL\/hr/.test(await offline.locator('#fluid-rate').innerText()));
        await offline.goto(base+'references.html');check('offline clinical rules',/13.3 mg\/mL/.test(await offline.locator('body').innerText()));
        check('offline full LAST checklist',await offline.evaluate(async()=>{const r=await fetch('./references/asra-last-2020.pdf');return r.ok&&(await r.text()).startsWith('%PDF-');}));
        await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));if(engine==='chromium')await context.setOffline(false);await offline.goto(base);
        const cacheAfterCold=await offline.evaluate(async()=>({keys:await caches.keys(),marker:!!await caches.match('/marker')}));
        console.log(JSON.stringify({engine,cacheAfterCold}));
        // Seed on this page to isolate update behavior from browser eviction when the last tab closes.
        await offline.evaluate(async()=>{const c=await caches.open('unrelated-cache');await c.put('/marker',new Response('keep'));});
        check('unrelated cache exists before update',await offline.evaluate(async()=>!!await caches.match('/marker')));
        revision=2;
        await offline.locator('#menu-button').click();await offline.locator('#app-menu [data-page="settings"]').click();await offline.locator('#check-update').click();await offline.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting);await offline.waitForFunction(()=>!document.getElementById('apply-update').hidden);
        check('update waits for choice',await offline.locator('#version').innerText()===C.VERSION);
        await offline.locator('#patient-weight').fill('70');await offline.locator('#apply-update').click();await offline.waitForFunction(v=>window.BlockCalc?.VERSION===v,nextVersion);
        check('update clears entries',await offline.locator('#patient-weight').inputValue()==='');check('unrelated cache retained',await offline.evaluate(async()=>!!(await caches.match('/marker'))));
        assert.deepEqual(errors,[]);assert.deepEqual(external,[]);reports.push({engine,browserVersion:browser.version(),playwrightVersion:require((process.env.PLAYWRIGHT_MODULE||'playwright')+'/package.json').version,nodeVersion:process.version,passed:true,checks:checks.length,names:checks,pageErrors:errors,externalRequests:external,cacheAfterCold,offlineMode:engine==='chromium'?'Origin stopped plus browser offline emulation':'Origin stopped; setOffline emulation blocked by Playwright issue42775'});
        await context.close();
      } finally {await browser.close();}
    }
    fs.writeFileSync(path.join(artifacts,`browser-results-${process.env.BROWSER_ENGINES || 'all'}.json`),JSON.stringify(reports,null,2));console.log(JSON.stringify(reports.map(({engine,passed,checks})=>({engine,passed,checks}))));
  } finally {if(server.listening)await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}
})().catch(error=>{console.error(error);process.exitCode=1;});
