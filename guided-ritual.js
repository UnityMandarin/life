(() => {
  'use strict';

  const TOTAL_MS = 20 * 60 * 1000;
  const SESSION_KEY = 'life-routine-session-v2';
  const DAYS_KEY = 'life-routine-days-v1';
  const PREFERENCES_KEY = 'life-routine-preferences-v1';
  const HANDOFF_KEY = 'life-return-handoff-v1';
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const elements = {
    metaTheme: document.querySelector('meta[name="theme-color"]'),
    morningView: document.getElementById('morning-view'),
    nightView: document.getElementById('night-view'),
    timerCard: document.getElementById('guided-player'),
    timerValue: document.getElementById('timer-value'),
    timerPhase: document.getElementById('timer-phase'),
    timerToggle: document.getElementById('timer-toggle'),
    timerReset: document.getElementById('timer-reset'),
    timerJump: document.getElementById('timer-jump'),
    ring: document.getElementById('ring-progress'),
    rail: document.getElementById('phase-rail'),
    guidanceKicker: document.getElementById('guidance-kicker'),
    guidanceAction: document.getElementById('guidance-action'),
    guidanceNext: document.getElementById('guidance-next'),
    cueToggle: document.getElementById('cue-toggle'),
    routineReset: document.getElementById('routine-reset'),
    routineResetStatus: document.getElementById('routine-reset-status'),
    note: document.getElementById('daily-note'),
    saveState: document.getElementById('save-state'),
    dock: document.getElementById('ritual-dock'),
    dockPhase: document.getElementById('dock-phase'),
    dockAction: document.getElementById('dock-action'),
    dockPhaseTime: document.getElementById('dock-phase-time'),
    dockTotalTime: document.getElementById('dock-total-time'),
    dockToggle: document.getElementById('dock-toggle'),
    dockJump: document.getElementById('dock-jump'),
    completion: document.getElementById('ritual-complete'),
    completionSummary: document.getElementById('completion-summary'),
    completionPhases: document.getElementById('completion-phases'),
    completionTasks: document.getElementById('completion-tasks'),
    completionClose: document.getElementById('completion-close'),
    startWork: document.getElementById('start-the-work')
  };

  const phases = {
    morning: [
      { title: 'Body ignition', end: 4 * 60 },
      { title: 'Mind activation', end: 8 * 60 },
      { title: 'Recall check', end: 12 * 60 },
      { title: 'Daily plan', end: 17 * 60 },
      { title: 'Mental ignition', end: 20 * 60 }
    ],
    night: [
      { title: 'Wind down', end: 3 * 60 },
      { title: 'Memory blurt', end: 7 * 60 },
      { title: 'Keep · Improve · Start · Stop', end: 13 * 60 },
      { title: 'Consolidate', end: 16 * 60 },
      { title: 'Tomorrow, clearly', end: 19 * 60 },
      { title: 'Sleep prep', end: 20 * 60 }
    ]
  };

  const pageCopy = {
    morning: {
      eyebrow: 'Your morning, protected',
      title: 'Own the first <span class="gradient-word">20 minutes.</span>',
      hero: 'Before messages, feeds, and everyone else\'s priorities—wake your body, focus your mind, and choose the day you want to have.',
      timer: 'Morning guided ritual', kicker: 'Begin deliberately',
      routineTitle: 'A small ritual.<br>A different day.',
      routineIntro: 'Move from body to mind to plan. The guide keeps the next useful action visible while you work.',
      noteKicker: 'Set your intention', noteTitle: 'One thought is enough.',
      noteCopy: 'Write the first action you will take today. Keep it concrete, short, and easy to begin.',
      noteLabel: 'Today\'s first action', placeholder: 'At 9:00, I will…', theme: '#f5f5f7'
    },
    night: {
      eyebrow: 'Your evening, reclaimed',
      title: 'Close today.<span class="gradient-word">Clear tomorrow.</span>',
      hero: 'Dim the noise. Retrieve what mattered, learn from what happened, and let tomorrow begin before you fall asleep.',
      timer: 'Night guided ritual', kicker: 'End with intention',
      routineTitle: 'Keep the lesson.<br>Release the day.',
      routineIntro: 'Reflect, consolidate, and make tomorrow obvious. The guide keeps each step small and specific.',
      noteKicker: 'Leave a clear signal', noteTitle: 'Tomorrow starts here.',
      noteCopy: 'Capture the most important lesson from today or the first task waiting for you tomorrow.',
      noteLabel: 'Tonight\'s closing thought', placeholder: 'Today I learned…', theme: '#000000'
    }
  };

  const generalCopy = {
    'morning-sun': 'Step into daylight or stand at a bright window for two minutes.',
    'morning-water': 'Drink a full glass of water before opening messages.',
    'morning-move': 'Move your body gently enough to feel more awake.',
    'morning-breathe': 'Take six slow breaths and let your attention settle.',
    'morning-recall': 'Name yesterday\'s most useful lesson without checking notes.',
    'morning-anki': 'Write down one thought that deserves your attention today.',
    'morning-retained': '<b>Working:</b> name what is already moving in the right direction.',
    'morning-degraded': '<b>Friction:</b> name what feels harder than it should.',
    'morning-connected': '<b>Opportunity:</b> notice one useful connection or opening.',
    'morning-gap': '<b>Unknown:</b> name the question that would create clarity.',
    'morning-frog': 'Choose the hardest high-value task. Make it today\'s anchor.',
    'morning-block': 'Give the anchor a start time and a realistic finish line.',
    'morning-scope': 'Remove or defer one task that does not need to happen today.',
    'morning-contract': 'Say: “At [time], I will [action] for [duration].”',
    'morning-visualize': 'Open the tool or place where that first action begins.',
    'night-light': 'Lower the lights and make the room feel quieter.',
    'night-phone': 'Put the phone out of reach for the rest of this ritual.',
    'night-breathe': 'Take one slow box breath: in, hold, out, hold.',
    'night-blurt': 'Write what is still occupying your mind. Do not organize it yet.',
    'night-compare': 'Circle the one open loop that matters most.',
    'night-feynman': 'Explain today\'s hardest moment in plain, neutral language.',
    'night-keep': '<b>Keep:</b> what moved the needle today?',
    'night-improve': '<b>Improve:</b> what deserves a better approach?',
    'night-start': '<b>Start:</b> what useful behavior will you add?',
    'night-stop': '<b>Stop:</b> what stole focus or time?',
    'night-cards': 'Turn one lesson into a short rule you can reuse.',
    'night-schedule': 'Choose when you will revisit the open loop.',
    'night-insight': 'Write today\'s most important insight in one sentence.',
    'night-goal': 'Write one specific result that would make tomorrow meaningful.',
    'night-list': 'Choose no more than three supporting actions.',
    'night-why': 'Write one honest sentence about why the result matters.',
    'night-still': 'Close your eyes and sit completely still for one minute.',
    'night-sleep': 'Protect enough sleep for memory, energy, and tomorrow.'
  };

  const originalCopy = new Map();
  document.querySelectorAll('input[data-task]').forEach(input => {
    originalCopy.set(input.dataset.task, input.closest('.task').querySelector('.task-copy').innerHTML);
  });

  let preferences = read(PREFERENCES_KEY, { lens: 'general', cues: false });
  let days = read(DAYS_KEY, { version: 1, days: [] });
  let session = read(SESSION_KEY, null);
  let mode = validMode(session?.mode) ? session.mode : validMode(readText('life-mode')) ? readText('life-mode') : defaultMode();
  let lens = session?.lens === 'learning' || session?.lens === 'general' ? session.lens : preferences.lens === 'learning' ? 'learning' : 'general';
  let frame = 0;
  let wakeLock = null;
  let audioContext = null;
  let lastRenderedSecond = -1;
  let lastDispatchedSecond = -1;
  let timerVisible = true;
  let saveMessageTimer = 0;
  const circumference = 2 * Math.PI * 110;

  function read(key, fallback) {
    try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; }
    catch (error) { return fallback; }
  }

  function readText(key) {
    try { return localStorage.getItem(key); }
    catch (error) { return null; }
  }

  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (error) { /* Local-only features degrade to the current tab. */ }
  }

  function writeText(key, value) {
    try { localStorage.setItem(key, value); }
    catch (error) { /* Local-only features degrade to the current tab. */ }
  }

  function remove(key) {
    try { localStorage.removeItem(key); }
    catch (error) { /* Nothing else to clean up. */ }
  }

  function validMode(value) { return value === 'morning' || value === 'night'; }
  function defaultMode() { const hour = new Date().getHours(); return hour >= 5 && hour < 18 ? 'morning' : 'night'; }
  function dateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function currentDay() {
    if (!days || !Array.isArray(days.days)) days = { version: 1, days: [] };
    const key = dateKey();
    let day = days.days.find(item => item.date === key);
    if (!day) {
      day = { date: key, modes: {}, completions: [] };
      days.days.unshift(day);
      days.days = days.days.slice(0, 90);
      write(DAYS_KEY, days);
    }
    return day;
  }

  function currentSlot(targetMode = mode, targetLens = lens) {
    const day = currentDay();
    day.modes[targetMode] ||= {};
    if (!day.modes[targetMode][targetLens]) {
      const prefix = targetLens === 'learning' ? 'life-task-' : 'life-task-general-';
      const ids = [...document.querySelectorAll(`#${targetMode}-view input[data-task]`)]
        .map(input => input.dataset.task)
        .filter(id => readText(prefix + id) === 'true');
      day.modes[targetMode][targetLens] = {
        tasks: ids,
        note: readText(`life-note-${targetMode}`) || ''
      };
      write(DAYS_KEY, days);
    }
    return day.modes[targetMode][targetLens];
  }

  function setText(id, value, html = false) {
    const element = document.getElementById(id);
    if (!element) return;
    if (html) element.innerHTML = value;
    else element.textContent = value;
  }

  function activeSession() { return session && (session.status === 'running' || session.status === 'paused'); }

  function elapsed(now = Date.now()) {
    if (!session) return 0;
    const anchored = session.status === 'running' ? Math.max(0, now - session.startedAt) : 0;
    return Math.min(TOTAL_MS, Math.max(0, (session.elapsedMs || 0) + anchored));
  }

  function phaseIndex(ms) {
    const seconds = ms / 1000;
    const index = phases[mode].findIndex(phase => seconds < phase.end);
    return index < 0 ? phases[mode].length - 1 : index;
  }

  function phaseStart(index) { return index === 0 ? 0 : phases[mode][index - 1].end * 1000; }
  function format(ms) {
    const seconds = Math.max(0, Math.ceil(ms / 1000));
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }

  function visibleTasks() { return [...document.querySelectorAll(`#${mode}-view input[data-task]`)]; }

  function phaseCard(index) {
    return document.querySelector(`#${mode}-view [data-life-phase="${index + 1}"]`);
  }

  function phaseTasks(index) {
    return [...(phaseCard(index)?.querySelectorAll('input[data-task]') || [])];
  }

  function currentInstruction(index) {
    const firstOpen = phaseTasks(index).find(input => !input.checked);
    if (firstOpen) return firstOpen.closest('.task').querySelector('.task-copy').textContent.trim();
    const next = phases[mode][index + 1];
    return next ? `Phase clear. Use the remaining time to review, then move to ${next.title}.` : 'Every action is checked. Use the remaining moment to breathe and commit.';
  }

  function updateTaskCopy() {
    document.querySelectorAll('input[data-task]').forEach(input => {
      const copy = input.closest('.task').querySelector('.task-copy');
      copy.innerHTML = lens === 'general' ? (generalCopy[input.dataset.task] || originalCopy.get(input.dataset.task)) : originalCopy.get(input.dataset.task);
    });
  }

  function restoreTasks() {
    const slot = currentSlot();
    document.querySelectorAll('input[data-task]').forEach(input => {
      input.checked = mode === input.dataset.task.split('-')[0] && slot.tasks.includes(input.dataset.task);
    });
    elements.note.value = slot.note || '';
    updateProgress();
  }

  function persistTask(input) {
    const slot = currentSlot();
    const taskSet = new Set(slot.tasks || []);
    if (input.checked) taskSet.add(input.dataset.task);
    else taskSet.delete(input.dataset.task);
    slot.tasks = [...taskSet];
    const key = (lens === 'learning' ? 'life-task-' : 'life-task-general-') + input.dataset.task;
    if (input.checked) writeText(key, 'true'); else remove(key);
    write(DAYS_KEY, days);
    updateProgress();
    render(true);
  }

  function updateProgress() {
    const tasks = visibleTasks();
    const done = tasks.filter(task => task.checked).length;
    const percent = tasks.length ? done / tasks.length * 100 : 0;
    setText('progress-copy', `${done} of ${tasks.length} complete`);
    document.getElementById('progress-fill').style.width = `${percent}%`;
  }

  function applyMode(nextMode, persist = true) {
    mode = nextMode;
    const copy = pageCopy[mode];
    root.dataset.mode = mode;
    root.dataset.lifeState = mode;
    elements.metaTheme.content = copy.theme;
    elements.morningView.hidden = mode !== 'morning';
    elements.nightView.hidden = mode !== 'night';
    document.querySelectorAll('[data-set-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.setMode === mode)));
    setText('hero-eyebrow', copy.eyebrow);
    setText('hero-title', copy.title, true);
    setText('hero-copy', copy.hero);
    setText('phase-count', `${phases[mode].length} guided phases`);
    setText('timer-label', copy.timer);
    setText('routine-kicker', copy.kicker);
    setText('routine-title', copy.routineTitle, true);
    setText('routine-intro', copy.routineIntro);
    setText('note-kicker', copy.noteKicker);
    setText('reflection-title', copy.noteTitle);
    setText('note-copy', copy.noteCopy);
    setText('note-label', copy.noteLabel);
    elements.note.placeholder = copy.placeholder;
    elements.routineReset.textContent = `Reset ${mode === 'morning' ? 'Morning' : 'Night'}`;
    if (persist) writeText('life-mode', mode);
    updateTaskCopy();
    restoreTasks();
    buildRail();
    document.dispatchEvent(new CustomEvent('life:statechange', { detail: { page: 'home', state: mode, mode } }));
    render(true);
  }

  function changeMode(nextMode) {
    if (nextMode === mode) return;
    if (activeSession() && !window.confirm('End the active ritual and switch modes? Your checked actions will stay saved.')) return;
    resetSession(false);
    applyMode(nextMode);
  }

  function applyLens(nextLens, persist = true) {
    lens = nextLens;
    preferences.lens = lens;
    if (persist) write(PREFERENCES_KEY, preferences);
    document.querySelectorAll('[data-set-lens]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.setLens === lens)));
    updateTaskCopy();
    restoreTasks();
    render(true);
  }

  function changeLens(nextLens) {
    if (nextLens === lens) return;
    if (activeSession() && !window.confirm('End the active ritual and change guidance lens? Your checked actions will stay saved.')) return;
    resetSession(false);
    applyLens(nextLens);
  }

  function buildRail() {
    elements.rail.replaceChildren();
    phases[mode].forEach((phase, index) => {
      const segment = document.createElement('span');
      const duration = phase.end * 1000 - phaseStart(index);
      segment.style.flexGrow = String(duration);
      segment.title = phase.title;
      elements.rail.appendChild(segment);
    });
  }

  function updateRail(ms, index) {
    [...elements.rail.children].forEach((segment, segmentIndex) => {
      const start = phaseStart(segmentIndex);
      const end = phases[mode][segmentIndex].end * 1000;
      const fill = Math.min(1, Math.max(0, (ms - start) / (end - start)));
      segment.classList.toggle('is-complete', fill >= 1);
      segment.style.setProperty('--phase-fill', fill.toFixed(4));
      segment.setAttribute('aria-current', segmentIndex === index ? 'step' : 'false');
    });
  }

  function dispatchTimer(ms, index, phaseRemaining) {
    const second = Math.floor(ms / 1000);
    if (second === lastDispatchedSecond && session?.status === 'running') return;
    lastDispatchedSecond = second;
    document.dispatchEvent(new CustomEvent('life:timerchange', {
      detail: { page: 'home', mode, lens, status: session?.status || 'idle', elapsedMs: ms, remainingMs: TOTAL_MS - ms, phaseIndex: index, phaseRemainingMs: phaseRemaining }
    }));
  }

  function render(force = false) {
    const now = Date.now();
    const ms = elapsed(now);
    if (session?.status === 'running' && ms >= TOTAL_MS) {
      completeSession();
      return;
    }
    const currentSecond = Math.floor(ms / 1000);
    if (!force && currentSecond === lastRenderedSecond) return;
    lastRenderedSecond = currentSecond;
    const index = phaseIndex(ms);
    const phase = phases[mode][index];
    const remaining = TOTAL_MS - ms;
    const phaseRemaining = Math.max(0, phase.end * 1000 - ms);
    const instruction = currentInstruction(index);
    const next = phases[mode][index + 1];
    const idle = !session || session.status === 'idle';
    const complete = session?.status === 'complete';

    elements.timerValue.textContent = format(remaining);
    elements.timerValue.setAttribute('aria-label', `${Math.ceil(remaining / 60000)} minutes remaining`);
    elements.timerPhase.textContent = idle ? 'Ready when you are' : complete ? 'Ritual complete' : `${phase.title} · ${format(phaseRemaining)} in phase`;
    elements.guidanceKicker.textContent = idle ? 'Your first move' : complete ? 'Complete' : `Phase ${String(index + 1).padStart(2, '0')} · do this now`;
    elements.guidanceAction.textContent = idle ? 'Start when you are ready. We will guide each step.' : complete ? 'Carry one clear action into the rest of your day.' : instruction;
    elements.guidanceNext.textContent = idle
      ? `Next: ${phases[mode][0].title}`
      : complete
        ? 'Your momentum is saved on this device.'
        : next
          ? `Next: ${next.title}`
          : 'Next: commit to the first visible move';
    elements.timerToggle.textContent = session?.status === 'running' ? 'Pause' : session?.status === 'paused' ? 'Resume ritual' : complete ? 'Start another ritual' : 'Start 20-minute ritual';
    elements.dockToggle.textContent = session?.status === 'running' ? 'Ⅱ' : '▶';
    elements.dockToggle.setAttribute('aria-label', session?.status === 'running' ? 'Pause ritual' : 'Resume ritual');
    elements.dockPhase.textContent = complete ? 'Ritual complete' : phase.title;
    elements.dockAction.textContent = complete ? 'See your completion recap' : instruction;
    elements.dockPhaseTime.textContent = format(phaseRemaining);
    elements.dockTotalTime.textContent = format(remaining);
    elements.ring.style.strokeDasharray = String(circumference);
    elements.ring.style.strokeDashoffset = String(circumference * (ms / TOTAL_MS));
    root.dataset.lifePhase = String(index + 1);
    document.body.classList.toggle('has-active-ritual', Boolean(activeSession()));
    document.querySelectorAll('.phase-card').forEach(card => card.classList.remove('is-current-phase'));
    if (!idle && !complete) phaseCard(index)?.classList.add('is-current-phase');
    updateRail(ms, index);
    updateDock();
    document.title = activeSession() ? `${format(remaining)} · ${phase.title} — MasterClock Tech` : 'MasterClock Tech — Morning & Night';
    dispatchTimer(ms, index, phaseRemaining);
  }

  function updateDock() {
    const shouldShow = Boolean(activeSession() || session?.status === 'complete') && (!timerVisible || session?.status === 'complete');
    elements.dock.hidden = !shouldShow;
  }

  function loop() {
    frame = 0;
    if (session?.status !== 'running' || document.hidden) return;
    render();
    frame = requestAnimationFrame(loop);
  }

  function startLoop() {
    cancelAnimationFrame(frame);
    frame = 0;
    render(true);
    if (session?.status === 'running' && !document.hidden) frame = requestAnimationFrame(loop);
  }

  async function requestWakeLock() {
    if (!('wakeLock' in navigator) || session?.status !== 'running' || document.hidden) return;
    try { wakeLock = await navigator.wakeLock.request('screen'); }
    catch (error) { wakeLock = null; }
  }

  function releaseWakeLock() {
    if (wakeLock) wakeLock.release().catch(() => {});
    wakeLock = null;
  }

  function ensureAudio() {
    if (!preferences.cues) return null;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return null;
    audioContext ||= new Audio();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    return audioContext;
  }

  function cue(kind = 'phase') {
    if (!preferences.cues) return;
    const context = ensureAudio();
    if (context) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(kind === 'complete' ? 660 : 520, context.currentTime);
      if (kind === 'complete') oscillator.frequency.exponentialRampToValueAtTime(880, context.currentTime + .18);
      gain.gain.setValueAtTime(.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(.08, context.currentTime + .025);
      gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .32);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(); oscillator.stop(context.currentTime + .34);
    }
    if ('vibrate' in navigator) navigator.vibrate(kind === 'complete' ? [28, 40, 50] : 24);
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      const index = phaseIndex(elapsed());
      new Notification(kind === 'complete' ? 'Ritual complete' : phases[mode][index].title, {
        body: kind === 'complete' ? 'Twenty intentional minutes are complete.' : currentInstruction(index),
        icon: 'masterclock-mark.svg', tag: 'masterclock-ritual'
      });
    }
  }

  function announce(message) {
    elements.routineResetStatus.textContent = '';
    requestAnimationFrame(() => { elements.routineResetStatus.textContent = message; });
  }

  function startSession() {
    elements.completion.hidden = true;
    session = { version: 2, mode, lens, status: 'running', startedAt: Date.now(), elapsedMs: 0, lastPhase: 0, completedAt: null };
    write(SESSION_KEY, session);
    ensureAudio();
    requestWakeLock();
    announce(`${mode === 'morning' ? 'Morning' : 'Night'} ritual started. ${phases[mode][0].title}.`);
    startLoop();
  }

  function pauseSession() {
    if (session?.status !== 'running') return;
    session.elapsedMs = elapsed();
    session.startedAt = null;
    session.status = 'paused';
    write(SESSION_KEY, session);
    releaseWakeLock();
    announce(`Ritual paused with ${format(TOTAL_MS - session.elapsedMs)} remaining.`);
    startLoop();
  }

  function resumeSession() {
    if (session?.status !== 'paused') return;
    session.status = 'running';
    session.startedAt = Date.now();
    write(SESSION_KEY, session);
    requestWakeLock();
    announce(`Ritual resumed. ${format(TOTAL_MS - elapsed())} remaining.`);
    startLoop();
  }

  function resetSession(ask = true) {
    if (ask && elapsed() > 10000 && !window.confirm('Restart this ritual from 20:00? Your checked actions will stay saved.')) return false;
    releaseWakeLock();
    cancelAnimationFrame(frame);
    session = { version: 2, mode, lens, status: 'idle', startedAt: null, elapsedMs: 0, lastPhase: 0, completedAt: null };
    write(SESSION_KEY, session);
    elements.completion.hidden = true;
    if (ask) announce('Timer restarted. Your checked actions are still here.');
    startLoop();
    return true;
  }

  function toggleTimer() {
    if (!session || session.status === 'idle' || session.status === 'complete') startSession();
    else if (session.status === 'running') pauseSession();
    else resumeSession();
  }

  function completeSession() {
    if (session?.status === 'complete') return;
    releaseWakeLock();
    session.elapsedMs = TOTAL_MS;
    session.startedAt = null;
    session.status = 'complete';
    session.completedAt = Date.now();
    write(SESSION_KEY, session);
    const day = currentDay();
    day.completions ||= [];
    day.completions.push({ timestamp: session.completedAt, mode, lens, minutes: 20 });
    write(DAYS_KEY, days);
    const done = visibleTasks().filter(task => task.checked).length;
    elements.completionPhases.textContent = String(phases[mode].length);
    elements.completionTasks.textContent = String(done);
    elements.completionSummary.textContent = done
      ? `You completed ${done} actions and protected a clear next move.`
      : 'You protected the full twenty minutes. Carry one clear next move forward.';
    elements.completion.hidden = false;
    cue('complete');
    announce('Ritual complete. Twenty intentional minutes protected.');
    updateMomentum();
    render(true);
  }

  function jumpToCurrent() {
    const target = session?.status === 'complete' ? elements.completion : phaseCard(phaseIndex(elapsed()));
    target?.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'center' });
  }

  function resetRoutine() {
    const slot = currentSlot();
    slot.tasks = [];
    visibleTasks().forEach(input => {
      input.checked = false;
      remove((lens === 'learning' ? 'life-task-' : 'life-task-general-') + input.dataset.task);
    });
    write(DAYS_KEY, days);
    updateProgress();
    render(true);
    announce(`${mode === 'morning' ? 'Morning' : 'Night'} ${lens} actions reset.`);
  }

  function updateMomentum() {
    const completions = (days.days || []).flatMap(day => day.completions || []);
    const returns = read('life-return-history-v1', []);
    setText('momentum-rituals', String(completions.length));
    setText('momentum-minutes', String(completions.reduce((sum, item) => sum + (item.minutes || 20), 0)));
    setText('momentum-returns', String(Array.isArray(returns) ? returns.length : 0));
  }

  function toggleCues() {
    preferences.cues = !preferences.cues;
    write(PREFERENCES_KEY, preferences);
    elements.cueToggle.setAttribute('aria-pressed', String(preferences.cues));
    elements.cueToggle.lastChild.textContent = preferences.cues ? ' Gentle phase cues on' : ' Gentle phase cues off';
    if (preferences.cues) {
      ensureAudio();
      cue();
      if ('Notification' in window && Notification.permission === 'default') Promise.resolve(Notification.requestPermission()).catch(() => {});
    }
  }

  function checkPhaseChange() {
    if (session?.status !== 'running') return;
    if (elapsed() >= TOTAL_MS) {
      completeSession();
      return;
    }
    const index = phaseIndex(elapsed());
    if (Number.isInteger(session.lastPhase) && index !== session.lastPhase) {
      session.lastPhase = index;
      write(SESSION_KEY, session);
      cue('phase');
      announce(`Phase ${index + 1}: ${phases[mode][index].title}. ${currentInstruction(index)}`);
    }
  }

  function prepareHandoff() {
    const note = elements.note.value.trim();
    const index = Math.min(phases[mode].length - 1, phaseIndex(elapsed()));
    const task = note || currentInstruction(index);
    write(HANDOFF_KEY, { task, source: `${mode} ${lens} ritual`, createdAt: Date.now() });
  }

  document.querySelectorAll('[data-set-mode]').forEach(button => button.addEventListener('click', () => changeMode(button.dataset.setMode)));
  document.querySelectorAll('[data-set-lens]').forEach(button => button.addEventListener('click', () => changeLens(button.dataset.setLens)));
  document.querySelectorAll('input[data-task]').forEach(input => input.addEventListener('change', () => persistTask(input)));
  elements.timerToggle.addEventListener('click', toggleTimer);
  elements.dockToggle.addEventListener('click', toggleTimer);
  elements.timerReset.addEventListener('click', () => resetSession(true));
  elements.timerJump.addEventListener('click', jumpToCurrent);
  elements.dockJump.addEventListener('click', jumpToCurrent);
  elements.routineReset.addEventListener('click', resetRoutine);
  elements.cueToggle.addEventListener('click', toggleCues);
  elements.completionClose.addEventListener('click', () => elements.completion.hidden = true);
  elements.startWork.addEventListener('click', prepareHandoff);
  elements.note.addEventListener('input', () => {
    const slot = currentSlot();
    slot.note = elements.note.value;
    write(DAYS_KEY, days);
    writeText(`life-note-${mode}`, elements.note.value);
    elements.saveState.textContent = 'Saving…';
    clearTimeout(saveMessageTimer);
    saveMessageTimer = setTimeout(() => { elements.saveState.textContent = 'Saved automatically'; }, 450);
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      timerVisible = entries[0]?.isIntersecting ?? true;
      updateDock();
    }, { threshold: .2 }).observe(elements.timerCard);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(frame); frame = 0; releaseWakeLock();
    } else {
      if (session?.status === 'running') requestWakeLock();
      startLoop();
    }
  });

  window.setInterval(checkPhaseChange, 500);
  document.getElementById('nav-date').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  elements.cueToggle.setAttribute('aria-pressed', String(Boolean(preferences.cues)));
  elements.cueToggle.lastChild.textContent = preferences.cues ? ' Gentle phase cues on' : ' Gentle phase cues off';
  applyMode(mode, false);
  applyLens(lens, false);
  updateMomentum();

  if (!session || session.version !== 2 || !['idle', 'running', 'paused', 'complete'].includes(session.status)) resetSession(false);
  else {
    if (session.status === 'running' && elapsed() >= TOTAL_MS) completeSession();
    else startLoop();
  }
})();
