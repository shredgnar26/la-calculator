/* Run with Playwright installed, or PLAYWRIGHT_MODULE pointing to a provisioned package. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
let revision=1;
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.md':'text/plain'};
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(!pathname.startsWith('/la-calculator/')){res.writeHead(404);res.end();return;}
  const file=pathname.slice('/la-calculator/'.length)||'index.html';
  if(file.includes('..')){res.writeHead(400);res.end();return;}
  try{let data=fs.readFileSync(path.join(root,file));
    if(revision===2&&['service-worker.js','calculations.js'].includes(file))data=Buffer.from(data.toString().replaceAll('2.0.0-review.1','2.0.0-review.2'));
    res.writeHead(200,{'content-type':mime[path.extname(file)]||'text/plain','cache-control':'no-store'});res.end(data);
  }catch{res.writeHead(404);res.end();}
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}/la-calculator/`;
  const browser=await chromium.launch({headless:true});
  try{
    const context=await browser.newContext({viewport:{width:768,height:1100},permissions:['clipboard-read','clipboard-write']});
    const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base);assert.ok((await page.locator('body').innerText()).includes('Local anesthetics'));
    async function nav(name){await page.locator('#menu-button').click();await page.locator(`#app-menu [data-page="${name}"]`).click();assert.equal(await page.locator(`#page-${name}`).isVisible(),true);}
    await page.locator('#patient-weight').fill('70');await page.locator('#patient-age').fill('40');
    await nav('abl');await page.locator('#abl-factor').selectOption('75');await page.locator('#hb-start').fill('14');await page.locator('#hb-min').fill('10');
    assert.equal(await page.locator('#abl-total').innerText(),'1,500 mL');
    fs.mkdirSync(path.join(root,'test-artifacts'),{recursive:true});
    await page.screenshot({path:path.join(root,'test-artifacts/abl-hemoglobin.png'),fullPage:true});
    await page.locator('[name="abl-mode"][value="hct"]').check();
    assert.equal(await page.locator('#abl-results').innerText(),'');
    await page.locator('#hct-start').fill('42');await page.locator('#hct-min').fill('30');assert.equal(await page.locator('#abl-total').innerText(),'1,500 mL');
    await page.screenshot({path:path.join(root,'test-artifacts/abl-hematocrit.png'),fullPage:true});
    await page.locator('[name="abl-mode"][value="hb"]').check();assert.equal(await page.locator('#hb-start').inputValue(),'14');assert.equal(await page.locator('#abl-total').innerText(),'1,500 mL');
    await page.locator('#hb-min').fill('15');assert.equal(await page.locator('#abl-results').innerText(),'');assert.match(await page.locator('#abl-error').innerText(),/exceeds/);await page.locator('#hb-min').fill('10');
    await page.locator('#patient-unit').selectOption('lb');assert.equal(await page.locator('#abl-total').innerText(),'1,500 mL');await page.locator('#patient-unit').selectOption('kg');assert.equal(await page.locator('#patient-weight').inputValue(),'70');
    await nav('fluids');await page.locator('#fasting').fill('8');await page.locator('#duration').fill('2');assert.equal(await page.locator('#fluid-total').innerText(),'880 mL');await page.locator('#duration').fill('4');assert.equal(await page.locator('#fluid-total').innerText(),'1,320 mL');
    await page.screenshot({path:path.join(root,'test-artifacts/fluids.png'),fullPage:true});
    await page.locator('#fasting').fill('-1');assert.equal(await page.locator('#fluid-results').innerText(),'');await page.locator('#fasting').fill('8');
    await nav('local');await page.locator('[data-key="drug"]').selectOption('lidocaine');await page.locator('[data-key="concentration"]').selectOption('1');await page.locator('[data-key="volume"]').fill('10');assert.match(await page.locator('#la-results').innerText(),/100 mg/);
    await page.locator('#add-medication').click();assert.equal(await page.locator('#la-results').innerText(),'');assert.equal(await page.locator('#copy-summary').isDisabled(),true);
    await page.locator('[data-remove]').last().click();await page.locator('#copy-summary').click();assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/100 mg/);
    await page.locator('[data-key="drug"]').selectOption('exparel');await page.locator('[data-key="indication"]').selectOption('interscalene');assert.match(await page.locator('#la-results').innerText(),/133 mg/);
    await page.locator('[data-add-bupi]').click();await page.locator('[data-key="concentration"]').selectOption('0.5');await page.locator('[data-key="volume"]').last().fill('10');await page.locator('[data-key="selectedLimit"]').fill('175');await page.locator('#copy-summary').click();assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/Bupivacaine HCl.*50 mg/);
    await page.screenshot({path:path.join(root,'test-artifacts/exparel.png'),fullPage:true});
    await nav('profile');await page.locator('#profile-sex').selectOption('male');await page.locator('#profile-height').fill('170');assert.match(await page.locator('#profile-results').innerText(),/65.9 kg/);await page.locator('#height-unit').selectOption('in');assert.match(await page.locator('#profile-results').innerText(),/65.9 kg/);
    await nav('burns');await page.locator('#burn-protocol').selectOption('aba-adult');await page.locator('#burn-tbsa').fill('30');await page.locator('#burn-elapsed').fill('2');await page.locator('#burn-prior').fill('500');assert.match(await page.locator('#burn-results').innerText(),/4,200 mL/);await page.locator('#burn-tbsa').fill('101');assert.equal(await page.locator('#burn-results').innerText(),'');await page.locator('#burn-tbsa').fill('30');
    await nav('last');assert.match(await page.locator('#lipid-results').innerText(),/105 mL/);
    for(const width of [320,390,768]){await page.setViewportSize({width,height:1100});for(const name of ['local','fluids','abl','profile','burns','last','settings']){await nav(name);const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);assert.equal(overflow,false,`${name} overflow at ${width}`);}}
    await page.setViewportSize({width:390,height:1100});await nav('abl');await page.screenshot({path:path.join(root,'test-artifacts/abl-mobile.png'),fullPage:true});
    // Install at a project subpath, then prove a cold offline navigation loads cached assets.
    await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
    await page.evaluate(async()=>{const cache=await caches.open('unrelated-app-cache');await cache.put('/unrelated-marker',new Response('keep'));});
    await context.setOffline(true);await page.reload();assert.ok((await page.locator('body').innerText()).includes('BlockCalc'));await page.locator('#patient-weight').fill('70');await nav('abl');await page.locator('#abl-factor').selectOption('75');await page.locator('#hb-start').fill('14');await page.locator('#hb-min').fill('10');assert.equal(await page.locator('#abl-total').innerText(),'1,500 mL');
    await context.setOffline(false);revision=2;await nav('settings');await page.locator('#check-update').click();await page.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting);await page.waitForFunction(()=>!document.getElementById('apply-update').hidden);
    assert.equal(await page.locator('#version').innerText(),'2.0.0-review.1');
    await page.locator('#apply-update').click();await page.waitForFunction(()=>window.BlockCalc?.VERSION==='2.0.0-review.2');assert.equal(await page.locator('#patient-weight').inputValue(),'');
    assert.equal(await page.evaluate(async()=>!!(await caches.match('/unrelated-marker'))),true);
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({passed:true,checks:['Hb/HCT modes and preservation','comparison and validation','lossless unit switching','fluid totals','complete medication validation','Exparel and copied bupivacaine','profile','burns','lipid','21 responsive screen checks','offline project-subpath load','explicit update activation','unrelated cache preserved'],pageErrors:errors}));
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
