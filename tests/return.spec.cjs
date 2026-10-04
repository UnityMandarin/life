const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const BASE=process.env.LIFE_URL||'http://127.0.0.1:8765/';
const KEY='life-return-v2';
const results=[];
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 async function scenario(name,run,seed){
  if(process.env.RETURN_MATCH&&!new RegExp(process.env.RETURN_MATCH).test(name))return;
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
  page.setDefaultTimeout(5000);page.on('dialog',dialog=>dialog.accept());
  page.on('pageerror',e=>errors.push(e.message));
  if(seed)await page.addInitScript(data=>{if(!sessionStorage.seeded){for(const [k,v]of Object.entries(data))localStorage.setItem(k,JSON.stringify(v));sessionStorage.seeded='1';}},seed);
  await page.goto(BASE);await page.clock.install();
  const state=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  const start=async(title='Math problems 1–12',finish='All 12 solved and mistakes checked')=>{
   await page.locator('#task-title').fill(title);await page.locator('#finish-condition').fill(finish);
   await page.locator('#focus-minutes').fill('1');await page.locator('#rest-minutes').fill('1');
   await page.locator('#setup-view button[type=submit]').click();assert.equal((await state()).phase,'focus');assert.equal(await page.locator('#task-view').isVisible(),true);
  };
  try{await run({page,context,state,start});assert.deepEqual(errors,[]);results.push({name,pass:true});console.log('PASS: '+name);}
  catch(e){results.push({name,pass:false,error:e.message});console.error('FAIL: '+name+'\n'+e.stack);}
  finally{await context.close();}
 }
 try{
  await scenario('required concrete endpoint and bounded duration',async({page,state,start})=>{
   await page.locator('#task-title').fill('   ');await page.locator('#finish-condition').fill('   ');
   await page.locator('#setup-view button[type=submit]').click();assert.equal((await state()).phase,'setup');
   await start();assert.equal((await state()).task.finish,'All 12 solved and mistakes checked');
   assert.equal(await page.locator('#countdown').textContent(),'01:00');assert.equal(await page.locator('#setup-view').isVisible(),false);
  });
  await scenario('timestamp countdown, fast recovery and reload',async({page,state,start})=>{
   await start();await page.clock.fastForward(12000);assert.equal(await page.locator('#countdown').textContent(),'00:48');
   await page.locator('#stuck-button').click();assert.equal((await state()).phase,'recovery');
   assert.equal(await page.locator('#recovery-next-wrap').isVisible(),false);
   await page.locator('[data-reason]').first().click();assert(await page.locator('#recovery-cue').textContent());
   assert.equal(await page.locator('#cancel-recovery').isVisible(),false);
   await page.locator('#recovery-next-step').fill('Fix the sign on line 3');
   await page.clock.fastForward(30000);assert.equal(await page.locator('#recovery-view [role=timer]').textContent(),'00:48');
   await page.reload();assert.equal((await state()).phase,'recovery');assert.equal(await page.locator('#recovery-next-step').inputValue(),'Fix the sign on line 3');
   await page.locator('#resume-focus').click();assert.equal((await state()).phase,'focus');assert.equal((await state()).task.returns,1);
   assert.equal((await state()).task.nextStep,'Fix the sign on line 3');await page.clock.fastForward(5000);assert.equal(await page.locator('#countdown').textContent(),'00:43');
   assert.match(await page.locator('#next-step-note').textContent(),/Fix the sign on line 3/);assert.equal(await page.locator('#next-step-note').isVisible(),true);
  });
  await scenario('all four recovery reasons return directly',async({page,state,start})=>{
   await start();
   for(let n=0;n<4;n++){await page.locator('#stuck-button').click();await page.locator('[data-reason]').nth(n).click();assert((await page.locator('#recovery-cue').textContent()).trim().length>10);await page.locator('#resume-focus').click();assert.equal((await state()).phase,'focus');}
   assert.equal((await state()).task.returns,4);
  });
  await scenario('real interruption saves a return point without losing time',async({page,state,start})=>{
   await start();await page.clock.fastForward(10000);await page.locator('#pause-button').click();
   assert.equal((await state()).phase,'paused');assert.equal(await page.locator('#paused-view [role=timer]').textContent(),'00:50');
   await page.locator('#pause-draft').fill('Continue problem 3');await page.reload();assert.equal(await page.locator('#pause-draft').inputValue(),'Continue problem 3');
   await page.locator('#save-pause').click();await page.clock.fastForward(600000);assert.equal((await state()).phase,'paused');
   await page.locator('#resume-paused').click();assert.equal((await state()).phase,'focus');assert.equal(await page.locator('#countdown').textContent(),'00:50');assert.equal((await state()).task.nextStep,'Continue problem 3');
  });
  await scenario('focus block earns full rest without completing task',async({page,state,start})=>{
   await start();const id=(await state()).task.id;
   await page.clock.fastForward(61000);assert.equal((await state()).phase,'block-complete');assert.equal((await state()).task.id,id);assert.equal((await state()).task.blocks,1);
   await page.clock.fastForward(3600000);await page.reload();assert.equal((await state()).phase,'block-complete');assert.equal((await state()).task.blocks,1);
   await page.locator('#start-rest').click();assert.equal((await state()).phase,'rest');
   assert.equal(await page.locator('#task-heading').isVisible(),false);assert.equal(await page.locator('#stuck-button').isVisible(),false);
   assert.equal(await page.locator('#start-next-block').isVisible(),false);
   await page.clock.fastForward(20000);await page.reload();assert.equal((await state()).phase,'rest');
   await page.clock.fastForward(41000);assert.equal((await state()).phase,'ready');assert.equal((await state()).task.id,id);assert.equal((await state()).task.finish,'All 12 solved and mistakes checked');
   await page.clock.fastForward(600000);assert.equal((await state()).phase,'ready');
   await page.locator('#start-next-block').click();assert.equal((await state()).phase,'focus');assert.equal((await state()).task.id,id);assert.equal(await page.locator('#countdown').textContent(),'01:00');
  });
  await scenario('navigation, away signal and app suspension retain task',async({page,state,start})=>{
   await start();const task=(await state()).task;
   await page.clock.fastForward(10000);
   await page.goto(new URL('menu.html',BASE).href);await page.clock.fastForward(20000);await page.goto(BASE);
   assert.equal((await state()).task.id,task.id);assert.equal((await state()).phase,'focus');
   assert.equal(await page.locator('#countdown').textContent(),'00:30');
   const now=await page.evaluate(()=>Date.now());await page.clock.setSystemTime(now+120000);
   await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pageshow')));
   assert.equal((await state()).phase,'block-complete');assert.equal((await state()).task.id,task.id);assert.equal((await state()).task.blocks,1);
  });
  await scenario('explicit completion closes task and grants rest',async({page,state,start})=>{
   await start();await page.clock.fastForward(15000);
   await page.locator('#task-finished-button').click();assert.equal(await page.locator('#completion-dialog').isVisible(),true);
   assert((await page.locator('#completion-dialog').textContent()).includes('All 12 solved and mistakes checked'));
   await page.locator('#keep-working').click();assert.equal((await state()).phase,'focus');
   await page.locator('#task-finished-button').click();await page.locator('#confirm-complete').click();
   assert.equal((await state()).task,null);assert.equal((await state()).phase,'rest');assert.equal((await state()).history.length,1);assert.equal((await state()).history[0].blocks,0);
   await page.reload();assert.equal((await state()).task,null);await page.clock.fastForward(61000);assert.equal((await state()).phase,'setup');
  });
  await scenario('completion dialog spanning deadline does not double-credit',async({page,state,start})=>{
   await start();await page.locator('#task-finished-button').click();await page.clock.fastForward(61000);
   await page.locator('#confirm-complete').click();const s=await state();assert.equal(s.task,null);assert.equal(s.phase,'rest');assert.equal(s.history[0].blocks,1);
  });
  await scenario('legacy Return unfinished timer migrates safely',async({page,state})=>{
   const s=await state();assert(s.task);assert.equal(s.task.title,'Legacy proof');assert.equal(s.phase,'setup');
   assert.equal(await page.evaluate(()=>!!localStorage.getItem('life-return-session-v1')),true);
   await page.locator('#finish-condition').fill('Every proof line checked');await page.locator('#setup-view button[type=submit]').click();
   const resumed=await state();assert.equal(resumed.phase,'focus');assert.equal(resumed.task.id,s.task.id);assert.equal(resumed.task.returns,2);assert(Math.abs(resumed.remainingMs-s.remainingMs)<2000);assert(resumed.remainingMs<1500000);
  },{'life-return-session-v1':{task:'Legacy proof',state:'focus',sessionStartedAt:Date.now(),durationMs:1500000,focusAnchor:Date.now()-60000,focusedMs:0,returns:2}});
  await scenario('legacy homepage active work migrates without pretending done',async({page,state})=>{
   const s=await state();assert.equal(s.task.title,'Old task');assert.notEqual(s.phase,'rest');
   await page.locator('#finish-condition').fill('All problems checked');await page.locator('#setup-view button[type=submit]').click();assert.equal((await state()).phase,'block-complete');assert.equal((await state()).task.id,'old');assert.equal((await state()).task.blocks,1);
  },{'life-daily-v1':{version:1,active:{id:'old',task:'Old task',status:'timeup',targetMs:300000,elapsedMs:300000,startedAt:null,returns:1},sessions:[],draft:{},routines:{}}});
  await scenario('two open tabs follow one task and completion',async({page,context,state,start})=>{
   await start();const other=await context.newPage();await other.goto(BASE);await other.clock.install();
   await page.locator('#stuck-button').click();await other.waitForFunction(()=>document.querySelector('#app').dataset.phase==='recovery');
   await other.locator('[data-reason]').last().click();await other.locator('#resume-focus').click();
   await page.waitForFunction(()=>document.querySelector('#app').dataset.phase==='focus');
   await other.locator('#task-finished-button').click();await other.locator('#confirm-complete').click();
   await page.waitForFunction(()=>document.querySelector('#app').dataset.phase==='rest');assert.equal((await state()).task,null);
   await page.goto(new URL('menu.html',BASE).href);await other.reload();assert.equal(await other.locator('#app').getAttribute('data-phase'),'rest');await other.close();
  });
  await scenario('backup recovers unfinished work paused and never overwrites live task',async({page,state,start})=>{
   await start();await page.clock.fastForward(10000);await page.locator('#tools-open').click();
   const downloaded=page.waitForEvent('download');await page.locator('#export-backup').click();const download=await downloaded;
   const chunks=[];for await(const part of await download.createReadStream())chunks.push(part);const buffer=Buffer.concat(chunks),backup=JSON.parse(buffer.toString());
   assert(backup.state.task);assert.equal(backup.state.task.title,'Math problems 1–12');
   await page.locator('#import-backup').setInputFiles({name:'backup.json',mimeType:'application/json',buffer});await page.waitForFunction(()=>document.querySelector('#import-backup').value==='');
   assert.equal((await state()).phase,'focus');assert.equal((await state()).task.title,'Math problems 1–12');
   const restored=await browser.newPage();await restored.goto(BASE);await restored.clock.install();await restored.locator('#tools-open').click();
   await restored.locator('#import-backup').setInputFiles({name:'backup.json',mimeType:'application/json',buffer});await restored.waitForFunction(()=>document.querySelector('#import-backup').value==='');
   const s=await restored.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);assert.equal(s.phase,'paused');assert.equal(s.task.finish,'All 12 solved and mistakes checked');assert(s.remainingMs>=49000&&s.remainingMs<=50000);
   await restored.keyboard.press('Escape');await restored.locator('#resume-paused').click();assert.equal(await restored.locator('#app').getAttribute('data-phase'),'focus');await restored.close();
   await page.locator('#import-backup').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{bad')});await page.waitForFunction(()=>document.querySelector('#import-backup').value==='');assert.match(await page.locator('#import-status').textContent(),/not valid JSON/);
  });
  await scenario('mobile, desktop, long task and rest have no overflow',async({page,start})=>{
   await start('A'.repeat(160),'An observable endpoint with a long description '.repeat(4));
   for(const width of [304,320,390,768,1024,1440]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),'focus overflow '+width);await page.locator('#stuck-button').click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),'recovery overflow '+width);await page.locator('[data-reason]').first().click();await page.locator('#resume-focus').click();}
   await page.clock.fastForward(61000);await page.locator('#start-rest').click();
   for(const width of [304,320,390,1440]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),'rest overflow '+width);}
  });
  await scenario('tools retain 27 links, favorites, search and calm reminder',async({page})=>{
   await page.goto(new URL('menu.html',BASE).href);assert.equal(await page.locator('.bookmark').count(),27);
   await page.locator('.favorite').first().click();await page.locator('[data-filter=favorites]').click();assert.equal(await page.locator('.tool-wrap:visible').count(),1);
   await page.locator('#bookmark-search').fill('not-a-tool');assert.equal(await page.locator('.tool-wrap:visible').count(),0);
   await page.locator('#clear-search').click();assert.equal(await page.locator('.tool-wrap:visible').count(),1);await page.reload();await page.locator('[data-filter=favorites]').click();assert.equal(await page.locator('.tool-wrap:visible').count(),1);
   await page.goto(new URL('stoplook.html',BASE).href);assert((await page.locator('h1').textContent()).includes('Look'));assert.equal(await page.locator('canvas').count(),0);
  });
  await scenario('blocked browser storage warns while app remains usable',async({page,start})=>{
   await page.addInitScript(()=>{Storage.prototype.setItem=function(){throw Error('blocked');};});await page.reload();
   await page.locator('#task-title').fill('Check proof');await page.locator('#finish-condition').fill('Each line checked');await page.locator('#setup-view button[type=submit]').click();
   assert.equal(await page.locator('#storage-warning').isVisible(),true);assert.match(await page.locator('#save-status').textContent(),/Not saved/);assert.equal(await page.locator('#app').getAttribute('data-phase'),'focus');
  });
  require('node:fs').writeFileSync(process.env.RETURN_REPORT||'../return-tests.json',JSON.stringify(results,null,2));
  if(results.some(x=>!x.pass))process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
