(() => {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  const page = root.dataset.lifePage || 'home';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const nav = document.querySelector('.site-nav, .topbar');
  const sceneTrack = document.querySelector('[data-life-scene]');
  const progressTrack = document.querySelector('[data-life-progress-track]') || sceneTrack;
  const sceneCanvas = document.querySelector('.life-product-canvas');
  const progressBar = document.querySelector('.life-scroll-progress');
  const stepElements = [...document.querySelectorAll('[data-life-step], html[data-life-page="menu"] [data-section]')];
  const phaseElements = [...document.querySelectorAll('[data-life-phase]')];
  const spatialCards = [...document.querySelectorAll('.life-spatial-card, html[data-life-page="menu"] .bookmark')];

  let sceneController = null;
  let scrollFrame = 0;
  let resizeFrame = 0;
  let sceneVisible = true;
  let lastPhase = -1;

  const clamp = (value, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));

  function currentMode() {
    return root.dataset.mode === 'night' ? 'night' : 'morning';
  }

  function currentFlowState() {
    if (page === 'return') {
      return root.dataset.lifeState || document.querySelector('.app-card')?.dataset.state || 'setup';
    }
    if (page === 'security') {
      return root.dataset.lifeState || body.dataset.unlockStep || '1';
    }
    return root.dataset.lifeState || currentMode();
  }

  function sceneProgress() {
    if (!progressTrack || reducedMotion.matches) return 0;
    const bounds = progressTrack.getBoundingClientRect();
    const range = Math.max(1, bounds.height - window.innerHeight);
    return clamp(-bounds.top / range);
  }

  function documentProgress() {
    const range = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    return clamp((window.scrollY || document.documentElement.scrollTop) / range);
  }

  function syncSteps() {
    if (!stepElements.length || reducedMotion.matches) return;
    const viewportCenter = window.innerHeight * .53;
    stepElements.forEach(element => {
      if (element.hidden || element.offsetParent === null) return;
      const bounds = element.getBoundingClientRect();
      const center = bounds.top + bounds.height / 2;
      const offset = clamp((center - viewportCenter) / window.innerHeight, -1.5, 1.5);
      const presence = clamp(1 - Math.abs(offset) * 1.12);
      element.style.setProperty('--life-step-offset', offset.toFixed(4));
      element.style.setProperty('--life-step-presence', presence.toFixed(4));
      element.classList.toggle('is-life-current', presence > .72);
    });
  }

  function syncActivePhase() {
    if (!phaseElements.length) return;
    const visible = phaseElements.filter(element => !element.hidden && element.offsetParent !== null);
    if (!visible.length) return;
    const viewportCenter = window.innerHeight * .53;
    let closest = null;
    let closestDistance = Infinity;
    visible.forEach(element => {
      const bounds = element.getBoundingClientRect();
      const distance = Math.abs(bounds.top + bounds.height / 2 - viewportCenter);
      if (distance < closestDistance) {
        closest = element;
        closestDistance = distance;
      }
    });
    const phase = Math.max(0, Number(closest?.dataset.lifePhase || 1) - 1);
    if (phase === lastPhase) return;
    lastPhase = phase;
    root.dataset.lifeActivePhase = String(phase + 1);
    sceneController?.setActivePhase(phase);
  }

  function renderScroll() {
    scrollFrame = 0;
    const pageProgress = documentProgress();
    const storyProgress = sceneProgress();
    root.style.setProperty('--life-page-progress', pageProgress.toFixed(4));
    root.style.setProperty('--life-story-progress', storyProgress.toFixed(4));
    root.style.setProperty('--life-scroll-y', `${(window.scrollY || 0).toFixed(1)}px`);
    progressBar?.style.setProperty('--life-progress', pageProgress.toFixed(4));
    nav?.classList.toggle('is-scrolled', window.scrollY > 34);
    syncSteps();
    syncActivePhase();
    sceneController?.setProgress(storyProgress);
  }

  function requestScrollRender() {
    if (!scrollFrame) scrollFrame = window.requestAnimationFrame(renderScroll);
  }

  function renderResize() {
    resizeFrame = 0;
    sceneController?.resize();
    renderScroll();
  }

  function requestResizeRender() {
    if (!resizeFrame) resizeFrame = window.requestAnimationFrame(renderResize);
  }

  function syncState(detail = {}) {
    const mode = detail.mode || currentMode();
    const flowState = detail.state || currentFlowState();
    root.dataset.lifeState = String(flowState);
    sceneController?.setMode(mode);
    sceneController?.setFlowState(flowState);
    requestScrollRender();
  }

  function setupReveals() {
    const targets = [...new Set([
      ...stepElements,
      ...document.querySelectorAll('.hero-copy, .hero-meta, .section-heading, .reflection-card, .controls, .app-card, .history-card, .stage .panel')
    ])];
    targets.forEach((target, index) => {
      target.classList.add('life-reveal');
      target.style.setProperty('--life-delay', `${Math.min(index % 5, 3) * 60}ms`);
    });
    if (reducedMotion.matches || !('IntersectionObserver' in window)) {
      targets.forEach(target => target.classList.add('is-life-visible'));
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-life-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -7% 0px', threshold: .08 });
    targets.forEach(target => observer.observe(target));
  }

  function setupSceneVisibility() {
    if (!sceneTrack || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      sceneVisible = entries.some(entry => entry.isIntersecting);
      root.classList.toggle('is-life-scene-visible', sceneVisible);
      sceneController?.setVisible(sceneVisible);
    }, { rootMargin: '60% 0px 60% 0px', threshold: 0 });
    observer.observe(sceneTrack);
    root.classList.add('is-life-scene-visible');
  }

  function setupSpatialCards() {
    if (!finePointer.matches || reducedMotion.matches) return;
    spatialCards.forEach(card => {
      card.addEventListener('pointermove', event => {
        const bounds = card.getBoundingClientRect();
        const x = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
        const y = clamp((event.clientY - bounds.top) / bounds.height, 0, 1);
        card.style.setProperty('--life-card-rx', `${((.5 - y) * 4.2).toFixed(2)}deg`);
        card.style.setProperty('--life-card-ry', `${((x - .5) * 5.2).toFixed(2)}deg`);
        card.style.setProperty('--life-card-light-x', `${(x * 100).toFixed(1)}%`);
        card.style.setProperty('--life-card-light-y', `${(y * 100).toFixed(1)}%`);
      }, { passive: true });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--life-card-rx', '0deg');
        card.style.setProperty('--life-card-ry', '0deg');
        card.style.setProperty('--life-card-light-x', '50%');
        card.style.setProperty('--life-card-light-y', '0%');
      });
    });
  }

  function setupPointer() {
    if (!finePointer.matches || reducedMotion.matches) return;
    window.addEventListener('pointermove', event => {
      const x = event.clientX / Math.max(1, window.innerWidth);
      const y = event.clientY / Math.max(1, window.innerHeight);
      root.style.setProperty('--life-light-x', `${(x * 100).toFixed(2)}%`);
      root.style.setProperty('--life-light-y', `${(y * 100).toFixed(2)}%`);
      sceneController?.setPointer(x * 2 - 1, y * 2 - 1);
    }, { passive: true });
  }

  function syncCurrentNavigation() {
    const currentFile = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.life-nav-links a, .site-nav a').forEach(link => {
      const linkFile = new URL(link.href, window.location.href).pathname.split('/').pop() || 'index.html';
      if (linkFile === currentFile) link.setAttribute('aria-current', 'page');
    });
  }

  async function initializeScene() {
    if (!sceneCanvas) {
      root.classList.add('no-life-webgl');
      return;
    }
    try {
      const { createLifeScene } = await import('./life-scene.js?v=20260822a');
      sceneController = createLifeScene({
        canvas: sceneCanvas,
        page,
        mode: currentMode(),
        reducedMotion: reducedMotion.matches
      });
      root.classList.remove('no-life-webgl');
      root.classList.add('has-life-webgl');
      sceneController.setVisible(sceneVisible);
      sceneController.setProgress(sceneProgress());
      sceneController.setFlowState(currentFlowState());
      sceneController.setActivePhase(Math.max(0, Number(root.dataset.lifeActivePhase || 1) - 1));
    } catch (error) {
      root.classList.remove('has-life-webgl');
      root.classList.add('no-life-webgl');
      console.warn('MasterClock Tech 3D scene unavailable; using the static presentation.', error);
    }
  }

  function handleVisibility() {
    sceneController?.setRunning(!document.hidden);
    if (!document.hidden) requestScrollRender();
  }

  const attributeObserver = new MutationObserver(mutations => {
    if (mutations.some(mutation => mutation.attributeName === 'data-mode' || mutation.attributeName === 'data-state' || mutation.attributeName === 'data-unlock-step')) {
      syncState();
    }
  });
  attributeObserver.observe(root, { attributes: true, attributeFilter: ['data-mode', 'data-life-state'] });
  const appCard = document.querySelector('.app-card');
  if (appCard) attributeObserver.observe(appCard, { attributes: true, attributeFilter: ['data-state'] });
  if (page === 'security') attributeObserver.observe(body, { attributes: true, attributeFilter: ['data-unlock-step'] });

  document.addEventListener('life:statechange', event => syncState(event.detail || {}));
  document.addEventListener('life:timerchange', event => {
    const detail = event.detail || {};
    const phase = Math.max(0, Number(detail.phaseIndex) || 0);
    root.dataset.lifeActivePhase = String(phase + 1);
    sceneController?.setActivePhase(phase);
    sceneController?.setFlowState(detail.status === 'running' ? 'focus' : detail.status);
  });
  document.addEventListener('visibilitychange', handleVisibility, { passive: true });
  window.addEventListener('scroll', requestScrollRender, { passive: true });
  window.addEventListener('resize', requestResizeRender, { passive: true });

  setupReveals();
  setupSceneVisibility();
  setupSpatialCards();
  setupPointer();
  syncCurrentNavigation();
  syncState();
  renderScroll();
  initializeScene();
})();
