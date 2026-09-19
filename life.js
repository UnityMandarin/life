(() => {
  'use strict';
  const KEY = 'life-daily-v1', $ = s => document.querySelector(s);
  const dayKey = (d = new Date()) => [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
  const uid = () => crypto.randomUUID?.() || String(Date.now()) + Math.random();
  const read = key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
  const text = value => typeof value === 'string' ? value.slice(0,500) : '';
  const finite = (value, fallback=0) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : fallback;
  const empty = () => ({version:1, sessions:[], routines:{}, next:'', draft:{}, levels:{}, active:null});
  const normalizeSession = s => {
    if (!s || typeof s !== 'object' || !s.task || !Number.isFinite(Date.parse(s.completedAt))) return null;
    return {id:text(s.id)||uid(), task:text(s.task),subject:text(s.subject)||'Personal',focusedMs:Math.min(finite(s.focusedMs),86400000),completedAt:new Date(s.completedAt).toISOString(),date:dayKey(new Date(s.completedAt)),note:text(s.note),difficulty:Math.min(5,Math.max(1,finite(s.difficulty,2))),returns:finite(s.returns),outcome:text(s.outcome),energy:text(s.energy)};
  };
  function load() {
    const saved=read(KEY), base=empty();
    if(saved?.version===1){
      base.sessions=Array.isArray(saved.sessions)?saved.sessions.map(normalizeSession).filter(Boolean):[];
      base.routines=saved.routines && typeof saved.routines==='object'&&!Array.isArray(saved.routines)?saved.routines:{};
      base.next=text(saved.next);
      base.draft=saved.draft&&typeof saved.draft==='object'?saved.draft:{};
      base.levels=saved.levels&&typeof saved.levels==='object'?saved.levels:{};
      const a=saved.active;
      if(a && typeof a.task==='string' && ['running','paused','recovery','reflection','timeup'].includes(a.status) && Number.isFinite(a.elapsedMs) && a.elapsedMs>=0 && Number.isFinite(a.targetMs) && a.targetMs>0 && (a.status!=='running'||Number.isFinite(a.startedAt))) base.active=a;
      return base;
    }
    base.next=text(read('life-next-action-v1')?.text);
    const signal=read('signalLab.v3');
    if(Array.isArray(signal?.sessions))base.sessions=signal.sessions.map(normalizeSession).filter(Boolean);
    const days=read('life-routine-days-v1');
    if(Array.isArray(days?.days)) for(const day of days.days){
      if(!/^\d{4}-\d{2}-\d{2}$/.test(day.date))continue;
      base.routines[day.date]={};
      for(const mode of ['morning','night']){
        const slot=day.modes?.[mode]?.general || day.modes?.[mode]?.learning;
        base.routines[day.date][mode]={checks:[],note:text(slot?.note),done:!!day.completions?.some(c=>c.mode===mode)};
      }
    }
    return base;
  }
  let state=load(), view='focus', ticker=0, toastTimeout=0;
  function notice(message){$('#notice').textContent=message;$('#notice').hidden=false;clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('#notice').hidden=true,6000);}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state));return true;}catch{notice('Storage is unavailable. Export a backup before closing this tab.');return false;}}
  function panel(id){for(const name of ['focus-form','active-panel','recovery-panel','reflection-form'])$('#'+name).hidden=name!==id;}
  function focusHeading(){const scope=view==='focus'?$('#focus-view'):$('#routine-view');const h=view==='focus'?scope.querySelector('section:not([hidden]) h2, form:not([hidden]) h2'):scope.querySelector('h2');if(h){h.tabIndex=-1;h.focus({preventScroll:true});}}
  function elapsed(){const a=state.active;return a?Math.min(a.targetMs,a.elapsedMs+(a.status==='running'?Math.max(0,Date.now()-a.startedAt):0)):0;}
  function stop(){clearInterval(ticker);ticker=0;}
  function checkpoint(){if(state.active?.status==='running'){state.active.elapsedMs=elapsed();state.active.startedAt=Date.now();}}
  function startTicker(){stop();if(state.active?.status==='running'&&!document.hidden)ticker=setInterval(tick,1000);}
  function tick(){
    const a=state.active;if(!a)return stop();
    const ms=elapsed(),secs=Math.floor(ms/1000);
    $('#elapsed').textContent=String(Math.floor(secs/60)).padStart(2,'0')+':'+String(secs%60).padStart(2,'0');
    $('#timer-progress').value=ms/a.targetMs*100;
    if(a.status==='running'&&ms>=a.targetMs){a.elapsedMs=a.targetMs;a.startedAt=null;a.status='timeup';stop();save();renderActive();notice('Your focus block is complete. Take a break or add five minutes.');}
  }
  function renderActive(){
    const a=state.active;
    if(!a){panel('focus-form');stop();return;}
    if(a.status==='reflection'){
      panel('reflection-form');$('#next-step').value=a.reflection||'';$('#outcome').value=a.outcome||'right';$('#session-summary').textContent=Math.floor(a.elapsedMs/60000)+' minutes of focus · '+a.returns+' returns. A useful next step beats a perfect session.';stop();return;
    }
    if(a.status==='recovery'){panel('recovery-panel');$('#tiny-action').value=a.tiny||'';stop();return;}
    panel('active-panel');$('#active-task').textContent=a.task;$('#active-detail').textContent=[a.subject,a.hardPart].filter(Boolean).join(' · ');
    $('#session-label').textContent=a.status==='timeup'?'BLOCK COMPLETE':a.status==='paused'?'PAUSED':'FOCUS';
    $('#pause').textContent=a.status==='running'?'Pause':'Resume';$('#pause').hidden=a.status==='timeup';$('#stuck').hidden=a.status==='timeup';$('#extend').hidden=a.status!=='timeup';
    $('#timer-note').textContent=a.status==='timeup'?'A good place to stop.':a.status==='paused'?'Take your time. Resume when you’re ready.':'One small piece at a time.';
    tick();startTicker();
  }
  const routines={
    morning:{title:'Start with a little space.',copy:'About 2 minutes. Settle in, then choose one thing.',steps:['Put your phone aside. Get some light and stretch.','Recall one useful thing from yesterday.','Open what you need for your first task.'],label:'Your first small action',button:'Save my start →',image:'sunrise'},
    night:{title:'Leave tomorrow a head start.',copy:'About 2 minutes. Keep the lesson. Close the day.',steps:['Lower the noise. Put the phone away.','Recall one win and one thing you learned.','Set out what you need for tomorrow.'],label:'Tomorrow’s first small action',button:'Close my day ✓',image:'moon'}
  };
  function slot(){const day=dayKey();state.routines[day] ||= {};state.routines[day][view] ||= {checks:[],note:'',done:false};return state.routines[day][view];}
  function renderRoutine(){
    const config=routines[view],s=slot();
    $('#routine-kicker').textContent=view==='morning'?'A SMALL START':'A SOFT LANDING';$('#routine-title').textContent=config.title;$('#routine-copy').textContent=config.copy;$('#routine-label').textContent=config.label;$('#routine-save').textContent=s.done?'Update my plan ✓':config.button;$('#routine-image').src='assets/'+config.image+'.svg';$('#routine-note').value=s.note||state.next;
    $('#routine-steps').replaceChildren(...config.steps.map((step,i)=>{const label=document.createElement('label');label.className='routine-step';const input=document.createElement('input');input.type='checkbox';input.checked=Array.isArray(s.checks)&&s.checks.includes(i);input.addEventListener('change',()=>{s.checks=Array.from($('#routine-steps').querySelectorAll('input')).flatMap((c,n)=>c.checked?[n]:[]);save();});label.append(input,document.createTextNode(step));return label;}));
  }
  function switchView(next,focus=false){
    view=next;$('#celebration').hidden=true;$('#focus-view').hidden=view!=='focus';$('#routine-view').hidden=view==='focus';
    document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
    if(view==='focus')renderActive();else renderRoutine();
    if(focus)focusHeading();
  }
  function draft(){state.draft={task:$('#task').value,subject:$('#subject').value,minutes:$('#minutes').value,energy:$('#energy').value,hardPart:$('#hard-part').value,difficulty:$('#difficulty').value};save();}
  function hydrate(){
    for(const [key,id]of Object.entries({task:'task',subject:'subject',minutes:'minutes',energy:'energy',hardPart:'hard-part',difficulty:'difficulty'})){const value=state.draft[key];if(value!=null)$('#'+id).value=String(value);}
    if(!$('#task').value)$('#task').value=state.next;
    if(!$('#minutes').value)$('#minutes').value='25';if(!$('#subject').value)$('#subject').value='Math';if(!$('#energy').value)$('#energy').value='steady';if(!$('#difficulty').value)$('#difficulty').value='2';
  }
  function celebrate(copy){$('#focus-view').hidden=true;$('#routine-view').hidden=true;$('#celebration').hidden=false;$('#celebration-copy').textContent=copy;$('#back-home').focus({preventScroll:true});renderWeek();}
  function renderWeek(){
    $('#today-label').textContent=new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric'}).format(new Date());
    const dates=new Set(state.sessions.map(s=>s.date));
    for(const [date,rs]of Object.entries(state.routines))if(rs?.morning?.done||rs?.night?.done)dates.add(date);
    const monday=new Date();monday.setHours(12,0,0,0);monday.setDate(monday.getDate()-(monday.getDay()+6)%7);let count=0;
    $('#week-trail').replaceChildren(...Array.from({length:7},(_,i)=>{const d=new Date(monday);d.setDate(d.getDate()+i);const key=dayKey(d),done=dates.has(key);if(done)count++;const el=document.createElement('div');el.className='day-dot'+(done?' done':'')+(key===dayKey()?' today':'')+(key>dayKey()?' future':'');const circle=document.createElement('span');circle.textContent=done?'✓':String(d.getDate());el.append(circle,document.createTextNode(new Intl.DateTimeFormat(undefined,{weekday:'short'}).format(d)));el.setAttribute('aria-label',key+(done?': completed':': no activity recorded'));return el;}));
    $('#week-count').textContent=count+' / 7 days this week';$('#week-summary').textContent=count?count+' days with a small win. Keep making room.':'Your first small win is waiting.';
    $('#morning-check').textContent=state.routines[dayKey()]?.morning?.done?'✓':'';$('#night-check').textContent=state.routines[dayKey()]?.night?.done?'✓':'';
  }
  function history(){
    $('#stats').replaceChildren(...[[state.sessions.length,'focus sessions'],[Math.floor(state.sessions.reduce((n,s)=>n+s.focusedMs,0)/60000),'minutes focused'],[state.sessions.reduce((n,s)=>n+s.returns,0),'returns']].map(([n,label])=>{const div=document.createElement('div'),strong=document.createElement('strong');strong.textContent=n;div.append(strong,document.createTextNode(label));return div;}));
    const recent=[...state.sessions].sort((a,b)=>b.completedAt.localeCompare(a.completedAt)).slice(0,30);
    $('#history').replaceChildren(...recent.map(s=>{const el=document.createElement('article');el.className='history-item';const title=document.createElement('strong');title.textContent=s.task;const meta=document.createElement('p');meta.textContent=s.subject+' · '+Math.floor(s.focusedMs/60000)+' min · '+s.date;el.append(title,meta);if(s.note){const p=document.createElement('p');p.textContent=s.note;el.append(p);}return el;}));
    if(!recent.length)$('#history').textContent='Your completed focus sessions will appear here.';
  }
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view,true)));
  $('#focus-form').addEventListener('input',draft);
  $('#energy').addEventListener('change',()=>{if($('#energy').value==='low'){$('#minutes').value='5';draft();}});
  $('#subject').addEventListener('change',()=>{const level=state.levels[$('#subject').value]||2;$('#difficulty').value=String(level);$('#suggestion').textContent='Suggested challenge: '+level+'. Adjust it to how you feel today.';draft();});
  $('#focus-form').addEventListener('submit',e=>{e.preventDefault();if(state.active)return;const task=$('#task').value.trim();if(!task){$('#task').setCustomValidity('Choose one small task.');$('#task').reportValidity();return;}state.active={id:uid(),task,subject:$('#subject').value,hardPart:$('#hard-part').value.trim(),difficulty:Number($('#difficulty').value),energy:$('#energy').value,targetMs:Number($('#minutes').value)*60000,elapsedMs:0,startedAt:Date.now(),status:'running',returns:0};save();renderActive();focusHeading();});
  $('#task').addEventListener('input',()=>$('#task').setCustomValidity(''));
  $('#pause').addEventListener('click',()=>{const a=state.active;if(a.status==='running'){checkpoint();a.status='paused';a.startedAt=null;}else{a.status='running';a.startedAt=Date.now();}save();renderActive();});
  $('#stuck').addEventListener('click',()=>{checkpoint();state.active.status='recovery';state.active.startedAt=null;state.active.recoveryAt=Date.now();save();renderActive();focusHeading();});
  const cues={confused:'Finish this sentence: “The part I don’t understand is…” Find just that answer.',overwhelmed:'Make the finish line smaller. One bar, one line, one test.',distracted:'Close one unrelated tab. Put your phone out of reach.',tired:'A break is useful too. Rest, or choose one gentle step before you stop.'};
  document.querySelectorAll('[data-reason]').forEach(b=>b.addEventListener('click',()=>{$('#recovery-cue').textContent=cues[b.dataset.reason];document.querySelectorAll('[data-reason]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));state.active.reason=b.dataset.reason;save();}));
  $('#tiny-action').addEventListener('input',()=>{state.active.tiny=$('#tiny-action').value;save();});
  $('#return-focus').addEventListener('click',()=>{const a=state.active;a.returns++;a.status='running';a.startedAt=Date.now();if($('#tiny-action').value.trim())a.hardPart=$('#tiny-action').value.trim();save();renderActive();focusHeading();});
  function finish(){checkpoint();state.active.status='reflection';state.active.startedAt=null;save();renderActive();focusHeading();}
  $('#finish').addEventListener('click',finish);$('#end-recovery').addEventListener('click',finish);
  $('#reflection-form').addEventListener('input',()=>{if(state.active){state.active.reflection=$('#next-step').value;state.active.outcome=$('#outcome').value;save();}});
  $('#extend').addEventListener('click',()=>{state.active.targetMs+=300000;state.active.status='running';state.active.startedAt=Date.now();save();renderActive();});
  $('#reflection-form').addEventListener('submit',e=>{e.preventDefault();const a=state.active;if(!a)return;const outcome=$('#outcome').value,note=$('#next-step').value.trim();state.sessions.push(normalizeSession({...a,focusedMs:a.elapsedMs,outcome,note,completedAt:new Date().toISOString()}));state.levels[a.subject]=Math.max(1,Math.min(5,a.difficulty+(outcome==='easy'?1:outcome==='hard'?-1:0)));state.active=null;state.next=note;state.draft.task=note;$('#task').value=note;$('#difficulty').value=String(state.levels[a.subject]);$('#next-step').value='';$('#outcome').value='right';save();stop();celebrate('Session saved. Step away for a little while. Your next step will be here.');});
  $('#routine-note').addEventListener('input',()=>{slot().note=$('#routine-note').value;save();});
  $('#routine-view').addEventListener('submit',e=>{e.preventDefault();const s=slot();if(!s.checks?.length){notice('Try one of the small steps, then check it off. One is enough.');$('#routine-steps input').focus();return;}s.done=true;s.note=$('#routine-note').value.trim();if(s.note){state.next=s.note;state.draft.task=s.note;$('#task').value=s.note;}save();celebrate(view==='night'?'Tomorrow has a starting point. You can close this now.':'A little space, made. Your first task is ready when you are.');});
  $('#back-home').addEventListener('click',()=>switchView('focus',true));
  $('#progress-open').addEventListener('click',()=>{history();$('#progress-dialog').showModal();});
  $('#settings-open').addEventListener('click',()=>$('#settings-dialog').showModal());
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
  $('#export').addEventListener('click',()=>{checkpoint();save();const url=URL.createObjectURL(new Blob([JSON.stringify({app:'life',...state},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='life-backup-'+dayKey()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  $('#import').addEventListener('change',async e=>{
    const file=e.target.files[0];if(!file)return;
    try{
      if(file.size>5000000)throw Error('Choose a backup smaller than 5 MB.');
      const data=JSON.parse(await file.text()),source=data.data||data.state||data;
      if(!Array.isArray(source.sessions))throw Error('This file is not a Life or Signal backup.');
      const imported=source.sessions.map(normalizeSession).filter(Boolean);
      if(source.sessions.length&&!imported.length)throw Error('No readable sessions found.');
      const ids=new Set(state.sessions.map(s=>s.id));let added=0;
      for(const s of imported)if(!ids.has(s.id)){state.sessions.push(s);ids.add(s.id);added++;}
      if(source.version===1&&data.app==='life'){
        for(const [date,modes]of Object.entries(source.routines||{})){if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!modes)continue;state.routines[date]||={};for(const mode of ['morning','night'])if(modes[mode]&&!state.routines[date][mode])state.routines[date][mode]={checks:Array.isArray(modes[mode].checks)?modes[mode].checks.filter(n=>[0,1,2].includes(n)):[],note:text(modes[mode].note),done:modes[mode].done===true};}
        if(!state.next)state.next=text(source.next);
        for(const area of ['Math','Violin','AI / Coding','School','Personal'])if(!state.levels[area]&&Number.isFinite(source.levels?.[area]))state.levels[area]=Math.max(1,Math.min(5,source.levels[area]));
        if(!state.draft.task&&source.draft&&typeof source.draft==='object'){for(const key of ['task','subject','minutes','energy','hardPart','difficulty'])state.draft[key]=text(source.draft[key]);hydrate();}
      }
      const persisted=save();renderWeek();$('#import-status').textContent=added+' sessions imported. Existing work kept.'+(persisted?'':' Export before closing; storage unavailable.');
    }catch(error){$('#import-status').textContent=error instanceof SyntaxError?'That file is not valid JSON. Choose a Life or Signal export.':error.message;}finally{e.target.value='';}
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else{tick();startTicker();renderWeek();}});
  window.addEventListener('pagehide',()=>{checkpoint();save();stop();});
  hydrate();switchView('focus');renderWeek();save();
})();
