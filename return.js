(() => {
  'use strict';

  const KEY = 'life-return-v2';
  const LEGACY_KEYS = ['life-return-session-v1','life-return-history-v1','life-return-checkpoints-v1','life-return-handoff-v1','life-daily-v1','life-next-action-v1'];
  const $ = id => document.getElementById(id);
  const views = ['setup','task','recovery','paused','block-complete','rest','ready'];
  const phases = ['setup','focus','recovery','paused','block-complete','rest','ready'];
  const clamp = (n,min,max,fallback) => Number.isFinite(Number(n)) ? Math.min(max,Math.max(min,Math.trunc(Number(n)))) : fallback;
  const clean = (v,max=500) => typeof v === 'string' ? v.trim().slice(0,max) : '';
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const safeParse = key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
  const empty = () => ({version:2,phase:'setup',task:null,draft:{title:'',finish:'',focusMinutes:25,restMinutes:5,pauseDraft:''},focusMs:0,restMs:0,remainingMs:0,deadline:null,awayAt:null,reason:null,history:[],pendingPhase:null,pauseSaved:false,restForComplete:false,updatedAt:Date.now()});
  function preferCurrent(incoming,current){
    if(current===undefined||current===null||current==='')return incoming;
    if(Array.isArray(current))return current.length?current:incoming;
    if(current&&typeof current==='object'){
      const merged={...(incoming&&typeof incoming==='object'&&!Array.isArray(incoming)?incoming:{})};
      for(const [key,value]of Object.entries(current))merged[key]=preferCurrent(merged[key],value);
      return merged;
    }
    return current;
  }
  let state;
  let timer = 0;
  let draftDue = 0;
  let dirtyDraft = false;
  let storageFailed = false;
  let allowNavigation = false;
  const lastDisplay = {focus:'',rest:'',title:'',progress:-1};

  function normalizeTask(value) {
    if (!value || typeof value !== 'object') return null;
    const title = clean(value.title || value.task,160);
    if (!title) return null;
    return {id:clean(value.id,100)||uid(),title,finish:clean(value.finish,200),nextStep:clean(value.nextStep || value.checkpoint?.nextAction || value.reflection,200),returns:clamp(value.returns,0,100000,0),blocks:clamp(value.blocks,0,100000,0),focusedMs:clamp(value.focusedMs,0,31536000000,0),focusMinutes:clamp(value.focusMinutes || Number(value.durationMs)/60000,1,120,25),restMinutes:clamp(value.restMinutes,1,30,5)};
  }
  function normalizeState(raw) {
    if (!raw || raw.version !== 2 || !phases.includes(raw.phase)) return null;
    const base=empty(), d=raw.draft && typeof raw.draft==='object' ? raw.draft : {};
    base.phase=raw.phase;base.task=normalizeTask(raw.task);
    base.draft={title:clean(d.title,160),finish:clean(d.finish,200),focusMinutes:clamp(d.focusMinutes,1,120,25),restMinutes:clamp(d.restMinutes,1,30,5),pauseDraft:clean(d.pauseDraft,200)};
    base.focusMs=clamp(raw.focusMs,0,31536000000,0);base.restMs=clamp(raw.restMs,0,31536000000,0);base.remainingMs=clamp(raw.remainingMs,0,31536000000,0);
    base.deadline=Number.isFinite(raw.deadline)?raw.deadline:null;base.awayAt=Number.isFinite(raw.awayAt)?raw.awayAt:null;base.reason=clean(raw.reason,30)||null;
    base.pendingPhase=['focus','paused','block-complete','ready'].includes(raw.pendingPhase)?raw.pendingPhase:null;base.pauseSaved=raw.pauseSaved===true;base.restForComplete=raw.restForComplete===true;
    base.history=Array.isArray(raw.history)?raw.history.filter(x=>x&&typeof x==='object').slice(-80):[];base.updatedAt=Number(raw.updatedAt)||0;
    if (['focus','recovery','paused','block-complete','rest','ready'].includes(base.phase) && !base.task && base.phase!=='rest') base.phase='setup';
    return base;
  }
  function legacyCandidate() {
    const ret=safeParse('life-return-session-v1'), daily=safeParse('life-daily-v1');
    const candidates=[];
    if (ret && typeof ret.task==='string' && ['focus','reason','action','returned','checkpoint','timeup','summary'].includes(ret.state)) {
      const focused=clamp(ret.focusedMs,0,31536000000,0)+(ret.state==='focus'&&Number.isFinite(ret.focusAnchor)?Math.max(0,Date.now()-ret.focusAnchor):0);
      const duration=clamp(Number(ret.durationMs)/60000,1,120,25), remaining=Math.max(0,Number(ret.durationMs||0)-focused);
      let next=clean(ret.checkpoint?.nextAction||ret.entryCheckpoint?.nextAction,200);
      if(!next){const checkpoints=safeParse('life-return-checkpoints-v1');const open=Array.isArray(checkpoints)?checkpoints.find(c=>c?.status==='open'&&c.task===ret.task):null;next=clean(open?.nextAction,200);}
      const timestamp=Number(ret.updatedAt||ret.lastUpdated||ret.sessionStartedAt||ret.focusAnchor||ret.createdAt)||0;
      const ended=ret.state==='timeup'||ret.timerExpired===true||(ret.state==='focus'&&remaining<=0);
      candidates.push({kind:'return',timestamp,task:{id:uid(),title:clean(ret.task,160),finish:'',nextStep:next,returns:clamp(ret.returns,0,100000,0),blocks:ended?1:0,focusedMs:ended?duration*60000:ret.state==='summary'?focused:0,focusMinutes:duration,restMinutes:5},phase:ret.state==='summary'?'ready':ended?'block-complete':'focus',focusMs:duration*60000,remaining:ret.state==='summary'||ended?0:remaining,reason:clean(ret.reasonId,30)||null});
    }
    const active=daily?.active;
    if(active&&typeof active.task==='string'&&['running','paused','recovery','reflection','timeup'].includes(active.status)){
      const duration=clamp(Number(active.targetMs)/60000,1,120,25);
      const elapsed=clamp(active.elapsedMs,0,31536000000,0)+(active.status==='running'&&Number.isFinite(active.startedAt)?Math.max(0,Date.now()-active.startedAt):0);
      const remaining=Math.max(0,Number(active.targetMs||0)-elapsed);
      const ended=active.status==='timeup'||(active.status==='running'&&remaining<=0);
      candidates.push({kind:'daily',timestamp:Number(active.startedAt||active.sessionStartedAt||active.updatedAt)||0,task:{id:clean(active.id,100)||uid(),title:clean(active.task,160),finish:'',nextStep:clean(active.reflection||daily.next,200),returns:clamp(active.returns,0,100000,0),blocks:ended?1:0,focusedMs:ended?duration*60000:active.status==='reflection'?elapsed:0,focusMinutes:duration,restMinutes:5},phase:active.status==='reflection'?'ready':ended?'block-complete':active.status==='paused'?'paused':'focus',focusMs:duration*60000,remaining:['reflection','timeup'].includes(active.status)||ended?0:remaining,reason:clean(active.reason,30)||null});
    }
    return candidates.sort((a,b)=>b.timestamp-a.timestamp)[0]||null;
  }
  function migrate() {
    const migrated=empty(), candidate=legacyCandidate();
    const draft=safeParse('life-daily-v1')?.draft;
    const handoff=safeParse('life-return-handoff-v1');
    const next=safeParse('life-next-action-v1');
    if(candidate){
      migrated.task=candidate.task;
      migrated.phase=candidate.task.finish?candidate.phase:'setup';migrated.pendingPhase=candidate.task.finish?null:candidate.phase;
      migrated.draft.title=candidate.task.title;migrated.draft.finish='';migrated.draft.focusMinutes=candidate.task.focusMinutes;
      migrated.focusMs=candidate.focusMs;migrated.remainingMs=candidate.remaining;migrated.reason=candidate.reason;
      if(candidate.phase==='paused')migrated.draft.pauseDraft=clean(draft?.nextStep||candidate.task.nextStep,200);
    } else {
      migrated.draft.title=clean(draft?.task,160)||clean(handoff?.task,160);
      migrated.draft.finish=clean(draft?.finish,200);
      migrated.draft.focusMinutes=clamp(draft?.minutes,1,120,25);
      migrated.draft.restMinutes=5;
      migrated.task=migrated.draft.title?{id:uid(),title:migrated.draft.title,finish:'',nextStep:clean(next?.text,200),returns:0,blocks:0,focusedMs:0,focusMinutes:migrated.draft.focusMinutes,restMinutes:5}:null;
      if(migrated.task)migrated.phase='setup';
    }
    migrated.updatedAt=Date.now();
    return migrated;
  }
  function load() {
    let existing=null;
    try { existing=localStorage.getItem(KEY); } catch { storageFailed=true; }
    if(existing){try{const parsed=normalizeState(JSON.parse(existing));if(parsed)return parsed;}catch{}}
    const initial=migrate();saveState(initial);return initial;
  }
  function warnStorage(failed) { storageFailed=failed; $('storage-warning').hidden=!failed; $('save-status').textContent=failed?'Not saved. Export a backup.':'Saved on this browser'; }
  function persist() {
    state.updatedAt=Math.max(Date.now(),state.updatedAt+1);
    try { localStorage.setItem(KEY,JSON.stringify(state)); warnStorage(false);return true; }
    catch { warnStorage(true);return false; }
  }
  function saveState(next) { state=next;return persist(); }
  function flushDraft() { if(dirtyDraft){dirtyDraft=false;draftDue=0;persist();} }
  function queueDraft() { dirtyDraft=true;draftDue=Date.now()+260;scheduleTick(); }
  function setPhase(phase) { if(dirtyDraft)flushDraft();clearTimer();state.phase=phase;persist();render(); }
  function remainingNow() { return state.deadline==null?state.remainingMs:Math.max(0,state.deadline-Date.now()); }
  function reconcile() {
    if(state.phase==='focus'||state.phase==='rest'){
      const left=remainingNow();state.remainingMs=left;
      if(left<=0){clearTimer();state.deadline=null;
        if(state.phase==='focus'){if(state.task){state.task.focusedMs+=state.task.focusMinutes*60000;state.task.blocks+=1;}state.focusMs=0;state.phase='block-complete';state.awayAt=null;state.reason=null;persist();render();}
        else {state.restMs=0;state.phase=state.task?'ready':'setup';persist();render();}
      } else if(!document.hidden) scheduleTick();
    } else clearTimer();
  }
  function clearTimer() { if(timer){clearTimeout(timer);timer=0;} }
  function scheduleTick() {
    clearTimer();let delay=Infinity;
    if(!document.hidden&&['focus','rest'].includes(state.phase)){const left=remainingNow(),boundary=left%1000||1000;delay=Math.min(delay,left,boundary);}
    if(dirtyDraft)delay=Math.min(delay,Math.max(1,draftDue-Date.now()));
    if(!Number.isFinite(delay))return;
    timer=setTimeout(()=>{timer=0;if(dirtyDraft&&Date.now()>=draftDue)flushDraft();if(!document.hidden&&['focus','rest'].includes(state.phase)){reconcile();renderClockOnly();}scheduleTick();},Math.max(1,delay));
  }
  function beginFocus(minutes, reuseRemaining=false) {
    const duration=clamp(minutes,1,120,25)*60000;
    if(!reuseRemaining||state.remainingMs<=0){state.focusMs=duration;state.remainingMs=duration;}
    else {state.focusMs=state.focusMs||duration;state.remainingMs=Math.min(duration,state.remainingMs);}
    state.deadline=Date.now()+state.remainingMs;state.restMs=0;state.awayAt=null;state.reason=null;
    state.task.focusMinutes=clamp(minutes,1,120,25);state.task.restMinutes=clamp(state.draft.restMinutes,1,30,5);
    setPhase('focus');scheduleTick();
  }
  function beginRest() {
    state.deadline=Date.now()+state.restMs;state.remainingMs=state.restMs;state.awayAt=null;state.reason=null;setPhase('rest');scheduleTick();
  }
  function renderBase() {
    $('app').dataset.phase=state.phase;
    const byId={setup:'setup-view',focus:'task-view',recovery:'recovery-view',paused:'paused-view','block-complete':'block-complete-view',rest:'rest-view',ready:'ready-view'};
    for(const [phase,id]of Object.entries(byId))$(id).hidden=state.phase!==phase;
    $('storage-warning').hidden=!storageFailed;
    $('save-status').textContent=storageFailed?'Not saved. Export a backup.':'Saved on this browser';
    document.body.classList.toggle('is-rest',state.phase==='rest');
    document.title=state.phase==='focus'?`${formatClock(remainingNow())} · Focus · Return`:state.phase==='rest'?`${formatClock(remainingNow())} · Rest · Return`:'Return · One task. Stay with it.';
    if(state.phase==='setup'){
      $('task-title').value=state.draft.title||state.task?.title||'';$('finish-condition').value=state.draft.finish||state.task?.finish||'';
      $('focus-minutes').value=String(state.draft.focusMinutes);$('rest-minutes').value=String(state.draft.restMinutes);
    }
    if(state.task){$('task-heading').textContent=state.task.title;$('finish-text').textContent=state.task.finish;$('then-label').textContent=`Then ${state.task.restMinutes||state.draft.restMinutes} min rest`;$('recovery-task').textContent=`${state.task.title} · ${state.task.finish}`;$('paused-task').textContent=`${state.task.title} · ${state.task.finish}`;$('block-task').textContent=`${state.task.title} · ${state.task.finish}`;$('ready-task').textContent=state.task.title;$('ready-finish').textContent=state.task.finish;}
    $('next-step-note').hidden=!state.task?.nextStep;$('next-step-note').textContent=state.task?.nextStep?`Next: ${state.task.nextStep}`:'';
    $('recovery-countdown').textContent=formatClock(remainingNow());$('paused-countdown').textContent=formatClock(remainingNow());
    $('resume-paused').hidden=!state.pauseSaved;
    $('rest-title').innerHTML=state.restForComplete?'Task complete.<br>Rest now.':'Work is paused.<br>Rest now.';
    $('rest-copy').textContent=state.restForComplete?'You can begin again when your rest is over.':'Your next step will be here when the rest is over.';
      $('phase-label').textContent=state.phase==='recovery'?'RETURN TO FOCUS':'FOCUS';
    $('away-note').hidden=!state.awayAt;$('continue-after-away').hidden=!state.awayAt;
    if(state.awayAt)$('away-note').textContent=`Back to ${state.task?.title||'your task'}. Next: ${state.task?.nextStep||state.task?.finish||'continue where you left off'}`;
    $('pause-draft').value=state.draft.pauseDraft||'';
    $('recovery-cue').hidden=!state.reason;$('recovery-next-wrap').hidden=!state.reason;$('back-reason').hidden=!state.reason;
    $('cancel-recovery').hidden=!!state.reason;
    $('resume-focus').disabled=!state.reason;
    const selected=document.querySelector(`[data-reason="${CSS.escape(state.reason||'none')}"]`);
    document.querySelectorAll('[data-reason]').forEach(b=>{b.hidden=!!state.reason;b.setAttribute('aria-pressed',String(b===selected));});
    const cues={mistake:'Find the last correct step. Fix only the next line.',next:'Write the one question you need answered next.',long:'Choose one item. Do only that piece.',leave:'Close one distraction. Put your cursor back on the task.'};
    if(state.reason)$('recovery-cue').textContent=cues[state.reason];
    $('recovery-next-step').value=state.task?.nextStep||'';
    renderClockOnly();
  }
  function formatClock(ms) { const seconds=Math.max(0,Math.ceil(ms/1000));return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`; }
  function renderClockOnly() {
    if(state.phase==='focus'){
      const left=remainingNow(),clock=formatClock(left),target=state.focusMs||((state.task?.focusMinutes||25)*60000),progress=Math.min(100,100*(1-left/target));
      if(lastDisplay.focus!==clock){$('countdown').textContent=clock;lastDisplay.focus=clock;}
      if(Math.abs(lastDisplay.progress-progress)>.15){$('countdown-progress').value=progress;lastDisplay.progress=progress;}
      $('countdown').setAttribute('aria-label','Remaining focus time');
      const title=`${formatClock(left)} · Focus · Return`;if(lastDisplay.title!==title){document.title=title;lastDisplay.title=title;}
    } else if(state.phase==='rest'){
      const clock=formatClock(remainingNow());if(lastDisplay.rest!==clock){$('rest-countdown').textContent=clock;lastDisplay.rest=clock;}
      const title=`${clock} · Rest · Return`;if(lastDisplay.title!==title){document.title=title;lastDisplay.title=title;}
    }
  }
  function render() { renderBase(); }
  function safeFocus(el) { if(el){el.focus({preventScroll:true});} }
  function focusHeading(id) { requestAnimationFrame(()=>safeFocus($(id))); }
  function snapshotDraft() {
    state.draft.title=$('task-title').value;state.draft.finish=$('finish-condition').value;
    state.draft.focusMinutes=clamp($('focus-minutes').value,1,120,25);state.draft.restMinutes=clamp($('rest-minutes').value,1,30,5);queueDraft();
  }
  function ensureTime() { if(state.phase==='focus'&&remainingNow()<=0)reconcile(); }

  state=load();
  if(state.phase==='focus'&&state.deadline==null&&state.remainingMs>0)state.deadline=Date.now()+state.remainingMs;
  if(state.phase==='rest'&&state.deadline==null&&state.remainingMs>0)state.deadline=Date.now()+state.remainingMs;
  if(state.task&&!state.task.finish&&state.phase!=='setup'){
    state.pendingPhase=state.phase==='block-complete'||state.phase==='ready'?state.phase:'focus';
    state.draft.title=state.task.title;state.draft.finish='';state.phase='setup';state.deadline=null;state.reason=null;persist();
  }
  reconcile();render();

  $('setup-form').addEventListener('input',snapshotDraft);
  $('setup-form').addEventListener('change',snapshotDraft);
  $('setup-form').addEventListener('submit',e=>{
    e.preventDefault();const title=clean($('task-title').value,160),finish=clean($('finish-condition').value,200);
    if(!title){$('task-title').setCustomValidity('Name the one task.');$('task-title').reportValidity();return;}if(!finish){$('finish-condition').setCustomValidity('Define what finished means.');$('finish-condition').reportValidity();return;}
    const mins=clamp($('focus-minutes').value,1,120,25),rest=clamp($('rest-minutes').value,1,30,5);
    if(!state.task){state.task={id:uid(),title,finish,nextStep:'',returns:0,blocks:0,focusedMs:0,focusMinutes:mins,restMinutes:rest};state.focusMs=mins*60000;state.remainingMs=mins*60000;}
    else {state.task.title=title;state.task.finish=finish;state.task.focusMinutes=mins;state.task.restMinutes=rest;if(!state.focusMs&&!state.remainingMs){state.focusMs=mins*60000;state.remainingMs=mins*60000;}}
    state.draft={title,finish,focusMinutes:mins,restMinutes:rest,pauseDraft:state.draft.pauseDraft||''};flushDraft();
    const pending=state.pendingPhase;state.pendingPhase=null;
    if(pending==='block-complete'||pending==='ready'){state.phase=pending;state.deadline=null;persist();render();focusHeading(pending==='ready'?'ready-title':'block-title');}
    else {state.phase='setup';beginFocus(mins,state.remainingMs>0&&(!!pending||state.task.focusedMs>0));focusHeading('task-heading');}
  });
  $('task-title').addEventListener('input',()=>$('task-title').setCustomValidity(''));
  $('finish-condition').addEventListener('input',()=>$('finish-condition').setCustomValidity(''));
  $('stuck-button').addEventListener('click',()=>{ensureTime();if(state.phase!=='focus')return;state.remainingMs=remainingNow();state.deadline=null;state.awayAt=null;state.reason=null;setPhase('recovery');focusHeading('recovery-title');});
  document.querySelectorAll('[data-reason]').forEach(button=>button.addEventListener('click',()=>{ensureTime();if(state.phase!=='recovery')return;state.reason=button.dataset.reason;state.draft.pauseDraft=clean($('recovery-next-step').value,200);persist();render();safeFocus($('resume-focus'));}));
  $('recovery-next-step').addEventListener('input',()=>{state.task.nextStep=$('recovery-next-step').value;queueDraft();});
  $('back-reason').addEventListener('click',()=>{state.reason=null;persist();render();safeFocus(document.querySelector('[data-reason]:not([hidden])'));});
  $('resume-focus').addEventListener('click',()=>{if(state.phase!=='recovery'||!state.reason)return;state.task.nextStep=clean($('recovery-next-step').value,200)||state.task.nextStep;state.task.returns+=1;state.draft.pauseDraft=state.task.nextStep||'';beginFocus(state.task.focusMinutes,true);focusHeading('task-heading');});
  $('cancel-recovery').addEventListener('click',()=>{if(state.phase!=='recovery')return;beginFocus(state.task.focusMinutes,true);focusHeading('task-heading');});
  $('pause-button').addEventListener('click',()=>{ensureTime();if(state.phase!=='focus')return;state.remainingMs=remainingNow();state.deadline=null;state.awayAt=null;state.pauseSaved=false;state.draft.pauseDraft=state.task.nextStep||'';setPhase('paused');focusHeading('paused-title');});
  $('pause-draft').addEventListener('input',()=>{state.draft.pauseDraft=$('pause-draft').value;$('pause-draft').setCustomValidity('');queueDraft();});
  $('pause-form').addEventListener('submit',e=>{e.preventDefault();state.draft.pauseDraft=clean($('pause-draft').value,200);if(!state.draft.pauseDraft){$('pause-draft').setCustomValidity('Add one short next step before saving your place.');$('pause-draft').reportValidity();return;}if(state.task)state.task.nextStep=state.draft.pauseDraft;state.pauseSaved=true;persist();render();safeFocus($('resume-paused'));});
  $('resume-paused').addEventListener('click',()=>{if(state.phase!=='paused')return;state.task.nextStep=clean($('pause-draft').value,200)||state.task.nextStep;beginFocus(state.task.focusMinutes,true);focusHeading('task-heading');});
  $('task-finished-button').addEventListener('click',()=>{ensureTime();if(state.phase!=='focus')return;openCompletion();});
  $('ready-task-finished').addEventListener('click',()=>{if(state.phase==='ready')openCompletion();});
  $('complete-at-end').addEventListener('click',()=>{if(state.phase==='block-complete')openCompletion();});
  function openCompletion(){if(!state.task)return;$('confirm-finish-text').textContent=state.task.finish;$('completion-dialog').showModal();safeFocus($('keep-working'));}
  $('keep-working').addEventListener('click',e=>{e.preventDefault();$('completion-dialog').close('cancel');if(state.phase==='focus')safeFocus($('task-finished-button'));});
  $('completion-form').addEventListener('submit',e=>{if(e.submitter?.value==='cancel'){e.preventDefault();$('completion-dialog').close('cancel');return;}if(e.submitter?.id!=='confirm-complete')return;e.preventDefault();
    ensureTime();const t=state.task;if(!t)return;
    const elapsedNow=state.phase==='focus'?Math.max(0,state.focusMs-remainingNow()):0;
    state.history.push({id:t.id,title:t.title,finish:t.finish,completedAt:new Date().toISOString(),focusedMs:t.focusedMs+elapsedNow,returns:t.returns,blocks:t.blocks});state.history=state.history.slice(-80);
    state.task=null;state.draft.title='';state.draft.finish='';state.focusMs=0;state.restMs=clamp(state.draft.restMinutes,1,30,5)*60000;state.remainingMs=state.restMs;state.deadline=Date.now()+state.restMs;state.awayAt=null;state.reason=null;state.restForComplete=true;$('completion-dialog').close('confirm');state.phase='rest';persist();render();scheduleTick();focusHeading('rest-title');
  });
  $('start-rest').addEventListener('click',()=>{if(state.phase!=='block-complete')return;state.restForComplete=false;state.restMs=clamp(state.task?.restMinutes||state.draft.restMinutes,1,30,5)*60000;state.remainingMs=state.restMs;beginRest();focusHeading('rest-title');});
  $('start-next-block').addEventListener('click',()=>{if(state.phase!=='ready'||!state.task)return;state.focusMs=state.task.focusMinutes*60000;state.remainingMs=state.focusMs;beginFocus(state.task.focusMinutes,false);focusHeading('task-heading');});
  $('continue-after-away').addEventListener('click',()=>{if(state.phase!=='focus')return;state.awayAt=null;persist();render();safeFocus($('stuck-button'));});
  $('tools-open').addEventListener('click',()=> $('tools-dialog').showModal());
  document.querySelectorAll('[data-close-tools]').forEach(button=>button.addEventListener('click',()=> $('tools-dialog').close()));
  for(const dialog of [ $('completion-dialog'),$('tools-dialog') ])dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
  $('export-backup').addEventListener('click',()=>{
    flushDraft();reconcile();const exportedAt=Date.now(),snapshot=JSON.parse(JSON.stringify(state));
    if(['focus','rest'].includes(snapshot.phase)){snapshot.remainingMs=remainingNow();snapshot.deadline=null;}
    snapshot.updatedAt=exportedAt;
    const data={app:'life-return',version:2,exportedAt,state:snapshot,legacy:{}};
    for(const key of LEGACY_KEYS){try{const value=localStorage.getItem(key);if(value!==null)data.legacy[key]=JSON.parse(value);}catch{}}
    try{const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`return-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('import-status').textContent='Backup exported.';}catch{$('import-status').textContent='The backup could not be created in this browser.';}
  });
  $('import-backup').addEventListener('change',async e=>{
    const file=e.target.files?.[0];if(!file)return;
    try{if(file.size>5000000)throw new Error('Choose a backup smaller than 5 MB.');const data=JSON.parse(await file.text()),source=data.data||data.state||data;
      const imported=normalizeState(data.state||source.state||source);
      const legacyIncoming={};for(const key of LEGACY_KEYS)if(data.legacy?.[key]!==undefined)legacyIncoming[key]=data.legacy[key];
      for(const key of ['life-return-history-v1','life-return-checkpoints-v1','life-daily-v1','life-next-action-v1'])if(source?.[key]!==undefined)legacyIncoming[key]=source[key];
      if(!imported&&!Array.isArray(source?.sessions)&&!Object.keys(legacyIncoming).length)throw new Error('This file does not contain a readable Life backup.');
      const ids=new Set(state.history.map(item=>item.id||`${item.title}|${item.completedAt}`));
      for(const item of imported?.history||[]){const id=item.id||`${item.title}|${item.completedAt}`;if(!ids.has(id)){state.history.push(item);ids.add(id);}}
      state.history=state.history.slice(-80);
      for(const [key,incoming]of Object.entries(legacyIncoming)){
        let current=null;try{current=JSON.parse(localStorage.getItem(key)||'null');}catch{}
        if(key==='life-daily-v1'&&incoming&&typeof incoming==='object'&&!Array.isArray(incoming)){
          const merged={...(incoming||{}),...(current||{})};
          for(const field of ['draft','routines','levels'])merged[field]=preferCurrent(incoming[field],current?.[field]);
          merged.next=preferCurrent(incoming.next,current?.next);delete merged.active;if(current?.active)merged.active=current.active;
          const old=Array.isArray(current?.sessions)?current.sessions:[],fresh=Array.isArray(incoming.sessions)?incoming.sessions:[],seen=new Set(old.map(x=>x?.id||`${x?.task}|${x?.completedAt||x?.timestamp||''}`));
          for(const item of fresh){const id=item?.id||`${item?.task}|${item?.completedAt||item?.timestamp||''}`;if(!seen.has(id)){old.push(item);seen.add(id);}}
          merged.sessions=old.slice(-500);try{localStorage.setItem(key,JSON.stringify(merged));}catch{}
        }else if(Array.isArray(incoming)){
          const old=Array.isArray(current)?current:[],seen=new Set(old.map(x=>x?.id||`${x?.task}|${x?.timestamp||x?.createdAt||''}`));
          for(const item of incoming){const id=item?.id||`${item?.task}|${item?.timestamp||item?.createdAt||''}`;if(!seen.has(id)){old.push(item);seen.add(id);}}
          try{localStorage.setItem(key,JSON.stringify(old.slice(-100)));}catch{}
        }else if(key==='life-next-action-v1'&&!current&&incoming&&typeof incoming==='object'){try{localStorage.setItem(key,JSON.stringify(incoming));}catch{}}
      }
      if(Array.isArray(source?.sessions)){
        const valid=source.sessions.filter(x=>x&&typeof x==='object'&&typeof x.task==='string'&&x.task.trim()&&Number.isFinite(Date.parse(x.completedAt||x.timestamp)));
        if(valid.length){let daily;try{daily=JSON.parse(localStorage.getItem('life-daily-v1')||'null');}catch{daily=null;}daily=daily&&typeof daily==='object'?daily:{version:1,sessions:[],routines:{},draft:{},levels:{}};const old=Array.isArray(daily.sessions)?daily.sessions:[],seen=new Set(old.map(x=>x?.id||`${x?.task}|${x?.completedAt||x?.timestamp||''}`));for(const item of valid){const id=item.id||`${item.task}|${item.completedAt||item.timestamp||''}`;if(!seen.has(id)){old.push(item);seen.add(id);}}daily.sessions=old.slice(-500);try{localStorage.setItem('life-daily-v1',JSON.stringify(daily));}catch{}}
      }
      let restored=false;
      if(imported?.task&&!state.task&&state.phase!=='rest'&&['focus','recovery','paused','block-complete','ready'].includes(imported.phase)){
        const canRestore=!!imported.task.finish&&imported.remainingMs>0;
        state.task=imported.task;state.draft={...imported.draft};state.focusMs=imported.focusMs||imported.task.focusMinutes*60000;state.remainingMs=Math.max(0,imported.remainingMs);state.deadline=null;state.restMs=0;state.awayAt=null;state.reason=null;state.phase=canRestore?'paused':imported.phase==='block-complete'?'block-complete':imported.phase==='ready'?'ready':'setup';state.pauseSaved=canRestore;state.pendingPhase=state.phase==='setup'?'paused':null;restored=true;
      }
      persist();render();$('import-status').textContent=restored?'Past work was merged and the unfinished task was restored paused.':'Past work was merged. The current task and timer stayed as they were.';
    }catch(err){$('import-status').textContent=err instanceof SyntaxError?'That file is not valid JSON.':err.message;}finally{e.target.value='';}
  });

  function markAway() { if(state.phase==='focus'&&!state.awayAt){state.awayAt=Date.now();persist();render();}clearTimer(); }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)markAway();else{reconcile();if(state.phase==='focus'&&state.awayAt)render();scheduleTick();}});
  window.addEventListener('blur',()=>{if(state.phase==='focus'&&!state.awayAt){state.awayAt=Date.now();persist();}});
  window.addEventListener('focus',()=>{if(state.phase==='focus'){reconcile();if(state.awayAt)render();scheduleTick();}});
  window.addEventListener('pageshow',()=>{reconcile();render();});
  window.addEventListener('storage',event=>{
    if(event.key!==KEY||!event.newValue)return;
    try{const incoming=normalizeState(JSON.parse(event.newValue));if(!incoming)return;
      if(incoming.updatedAt>=state.updatedAt){dirtyDraft=false;draftDue=0;state=incoming;reconcile();render();}
    }catch{}
  });
  window.addEventListener('pagehide',()=>{
    clearTimer();
    try{const latest=normalizeState(JSON.parse(localStorage.getItem(KEY)||'null'));if(latest&&latest.updatedAt>state.updatedAt){state=latest;return;}}catch{}
    if(dirtyDraft){state.updatedAt=Date.now();try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}}
  });
  document.addEventListener('click',event=>{const link=event.target.closest('a[href]');if(link){const url=new URL(link.href,location.href);if(url.origin===location.origin)allowNavigation=true;}});
  window.addEventListener('beforeunload',e=>{if(!allowNavigation&&['focus','recovery','paused','block-complete'].includes(state.phase)&&state.task){e.preventDefault();e.returnValue='';}});
})();
