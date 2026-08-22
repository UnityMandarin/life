(() => {
  'use strict';

  const SESSION_KEY = 'life-return-session-v1';
  const HANDOFF_KEY = 'life-return-handoff-v1';
  const setupPanel = document.getElementById('setup-panel');
  const focusPanel = document.getElementById('focus-panel');
  const taskInput = document.getElementById('task-input');
  const taskForm = document.getElementById('task-form');
  const focusTask = document.getElementById('focus-task');
  const focusTimer = document.getElementById('focus-timer');
  const timerGoal = document.getElementById('timer-goal');
  const mini = document.getElementById('return-mini-player');
  const miniTask = document.getElementById('return-mini-task');
  const miniTime = document.getElementById('return-mini-time');
  const miniLabel = document.getElementById('return-mini-label');
  const miniJump = document.getElementById('return-mini-jump');
  let focusVisible = true;

  function read(key, fallback) {
    try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; }
    catch (error) { return fallback; }
  }

  function remove(key) {
    try { localStorage.removeItem(key); }
    catch (error) { /* The handoff can safely expire in place. */ }
  }

  function consumeHandoff() {
    const handoff = read(HANDOFF_KEY, null);
    const current = read(SESSION_KEY, null);
    if (!handoff || typeof handoff.task !== 'string' || Date.now() - handoff.createdAt > 24 * 60 * 60 * 1000 || current) return;
    taskInput.value = handoff.task.slice(0, 120);
    const banner = document.createElement('div');
    banner.className = 'focus-entry';
    banner.innerHTML = '<p class="focus-entry-label">Prepared by your ritual</p><p class="focus-entry-action"></p><p class="focus-entry-context">Choose a timer length, then begin with this one visible move.</p>';
    banner.querySelector('.focus-entry-action').textContent = handoff.task;
    taskForm.insertAdjacentElement('beforebegin', banner);
    remove(HANDOFF_KEY);
    window.setTimeout(() => taskInput.focus({ preventScroll: true }), 120);
  }

  function finishTime(session) {
    if (!session || session.state !== 'focus') return '';
    const focused = (session.focusedMs || 0) + (session.focusAnchor ? Math.max(0, Date.now() - session.focusAnchor) : 0);
    const remaining = Math.max(0, (session.durationMs || 0) - focused);
    if (!remaining) return 'Target reached';
    return `Stay here until ${new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(Date.now() + remaining))}`;
  }

  function renderMini() {
    const session = read(SESSION_KEY, null);
    const active = session && session.state === 'focus' && !focusPanel.hidden;
    mini.hidden = !active || focusVisible;
    if (!active) return;
    miniTask.textContent = focusTask.textContent || session.task || 'Current task';
    miniTime.textContent = focusTimer.textContent;
    miniLabel.textContent = finishTime(session) || 'Stay with this';
    const guidance = finishTime(session);
    let finish = document.getElementById('return-finish-at');
    if (!finish) {
      finish = document.createElement('div');
      finish.id = 'return-finish-at';
      finish.style.cssText = 'margin-top:8px;color:var(--secondary);font-size:12px;font-weight:700';
      timerGoal.insertAdjacentElement('afterend', finish);
    }
    finish.textContent = guidance;
  }

  miniJump.addEventListener('click', () => focusPanel.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' }));
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      focusVisible = entries[0]?.isIntersecting ?? true;
      renderMini();
    }, { threshold: .15 }).observe(focusPanel);
  }
  document.addEventListener('life:statechange', renderMini);
  consumeHandoff();
  renderMini();
  window.setInterval(renderMini, 500);
})();
