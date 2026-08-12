(() => {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  const scene = document.createElement('div');
  scene.className = 'life-depth-scene';
  scene.setAttribute('aria-hidden', 'true');
  scene.innerHTML = '<i class="life-depth-orb"></i><i class="life-depth-ring"></i><i class="life-depth-plane"></i>';
  body.prepend(scene);

  const progress = document.createElement('div');
  progress.className = 'life-progress';
  progress.setAttribute('aria-hidden', 'true');
  body.append(progress);

  const page = root.dataset.lifePage || 'home';
  const nav = document.querySelector('.site-nav, .topbar');
  const hero = document.querySelector('.hero, .intro');
  let scrollFrame = 0;

  function renderScroll() {
    scrollFrame = 0;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progressValue = Math.min(1, Math.max(0, scrollTop / scrollRange));
    root.style.setProperty('--life-scroll-progress', progressValue.toFixed(4));
    root.style.setProperty('--life-scroll-y', scrollTop.toFixed(1) + 'px');
    root.style.setProperty('--life-scroll', progressValue.toFixed(4));
    nav?.classList.toggle('is-scrolled', scrollTop > 36);

    if (hero) {
      const bounds = hero.getBoundingClientRect();
      const heroProgress = Math.min(1, Math.max(0, -bounds.top / Math.max(1, bounds.height)));
      hero.style.setProperty('--hero-progress', heroProgress.toFixed(4));
    }
  }

  function requestScrollRender() {
    if (!scrollFrame) scrollFrame = window.requestAnimationFrame(renderScroll);
  }

  function revealTargets() {
    const selectors = {
      home: '.hero-text > *, .timer-card, .section-heading > *, .progress-panel, .phase-card, .reflection-card',
      menu: '.intro > *, .controls, .section-head, .bookmark, .empty, .footer',
      return: '.intro > *, .app-card, .history-card',
      security: '.stage .panel'
    };

    const targets = [...document.querySelectorAll(selectors[page] || selectors.home)];
    targets.forEach((target, index) => {
      target.classList.add('life-reveal');
      if (index % 3 === 1) target.classList.add('life-from-left');
      if (index % 3 === 2) target.classList.add('life-from-right');
      target.style.setProperty('--life-delay', Math.min(index % 6, 4) * 55 + 'ms');
    });

    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      targets.forEach(target => target.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .1 });

    targets.forEach(target => observer.observe(target));
  }

  function setupPointerDepth() {
    if (!finePointer.matches || reduceMotion.matches) return;

    let pointerFrame = 0;
    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;

    window.addEventListener('pointermove', event => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (pointerFrame) return;
      pointerFrame = window.requestAnimationFrame(() => {
        pointerFrame = 0;
        root.style.setProperty('--life-pointer-x', (pointerX - window.innerWidth / 2).toFixed(1) + 'px');
        root.style.setProperty('--life-pointer-y', (pointerY - window.innerHeight / 2).toFixed(1) + 'px');
      });
    }, { passive: true });

    const tiltSelectors = {
      home: '.timer-card, .phase-card, .reflection-card',
      menu: '.bookmark',
      return: '.app-card, .history-card',
      security: ''
    };

    const selector = tiltSelectors[page];
    if (selector) {
      document.querySelectorAll(selector).forEach(card => {
        card.classList.add('life-tilt');
        card.addEventListener('pointermove', event => {
          const bounds = card.getBoundingClientRect();
          const x = (event.clientX - bounds.left) / bounds.width - .5;
          const y = (event.clientY - bounds.top) / bounds.height - .5;
          card.style.setProperty('--life-tilt-x', (-y * 5.5).toFixed(2) + 'deg');
          card.style.setProperty('--life-tilt-y', (x * 6.5).toFixed(2) + 'deg');
        }, { passive: true });
        card.addEventListener('pointerleave', () => {
          card.style.setProperty('--life-tilt-x', '0deg');
          card.style.setProperty('--life-tilt-y', '0deg');
        });
      });
    }

    document.querySelectorAll('.primary-button, .button-primary, .continue-button').forEach(button => {
      button.classList.add('life-magnetic');
      button.addEventListener('pointermove', event => {
        const bounds = button.getBoundingClientRect();
        button.style.setProperty('--life-magnet-x', ((event.clientX - bounds.left - bounds.width / 2) * .1).toFixed(1) + 'px');
        button.style.setProperty('--life-magnet-y', ((event.clientY - bounds.top - bounds.height / 2) * .13).toFixed(1) + 'px');
      }, { passive: true });
      button.addEventListener('pointerleave', () => {
        button.style.setProperty('--life-magnet-x', '0px');
        button.style.setProperty('--life-magnet-y', '0px');
      });
    });
  }

  function syncCurrentNavigation() {
    const currentFile = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.life-nav-links a').forEach(link => {
      const linkFile = new URL(link.href, window.location.href).pathname.split('/').pop() || 'index.html';
      if (linkFile === currentFile) link.setAttribute('aria-current', 'page');
    });
  }

  revealTargets();
  setupPointerDepth();
  syncCurrentNavigation();
  renderScroll();

  window.addEventListener('scroll', requestScrollRender, { passive: true });
  window.addEventListener('resize', requestScrollRender, { passive: true });
})();
