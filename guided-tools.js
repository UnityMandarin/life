(() => {
  'use strict';

  const FAVORITES_KEY = 'life-tool-favorites-v1';
  const RECENTS_KEY = 'life-tool-recents-v1';
  const main = document.getElementById('bookmarks');
  const controls = document.querySelector('.controls');
  const search = document.getElementById('bookmark-search');
  const sections = [...document.querySelectorAll('[data-section]')];
  let favorites = read(FAVORITES_KEY, []);
  let recents = read(RECENTS_KEY, []);
  let activeFilter = 'all';

  function read(key, fallback) {
    try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; }
    catch (error) { return fallback; }
  }

  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (error) { /* The shelf remains usable without persistence. */ }
  }

  function slug(value) {
    return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  function normalize(url) {
    try { const parsed = new URL(url); return parsed.origin + parsed.pathname.replace(/\/$/, ''); }
    catch (error) { return url; }
  }

  function makeFavoriteButton(bookmark, wrapper) {
    const key = normalize(bookmark.href);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tool-favorite';
    button.setAttribute('aria-label', `Favorite ${bookmark.querySelector('h3')?.textContent || 'tool'}`);

    function render() {
      const selected = favorites.includes(key);
      button.setAttribute('aria-pressed', String(selected));
      button.textContent = selected ? '★' : '☆';
    }

    button.addEventListener('click', () => {
      favorites = favorites.includes(key) ? favorites.filter(item => item !== key) : [key, ...favorites].slice(0, 40);
      write(FAVORITES_KEY, favorites);
      render();
      if (activeFilter === 'favorites') applyFilter();
      renderUsefulNow();
    });
    wrapper.appendChild(button);
    render();
  }

  const wrappedBookmarks = [];
  sections.forEach(section => {
    const category = slug(section.querySelector('h2')?.textContent || 'tools');
    section.dataset.category = category;
    section.querySelectorAll('.bookmark').forEach(bookmark => {
      const wrapper = document.createElement('div');
      wrapper.className = 'tool-card-wrap';
      wrapper.dataset.category = category;
      bookmark.replaceWith(wrapper);
      wrapper.appendChild(bookmark);
      makeFavoriteButton(bookmark, wrapper);
      bookmark.addEventListener('click', () => {
        const record = { url: normalize(bookmark.href), title: bookmark.querySelector('h3')?.textContent || bookmark.href, timestamp: Date.now() };
        recents = [record, ...recents.filter(item => item.url !== record.url)].slice(0, 12);
        write(RECENTS_KEY, recents);
      });
      wrappedBookmarks.push({ bookmark, wrapper });
    });
  });

  const chips = document.createElement('div');
  chips.className = 'tool-chips';
  chips.setAttribute('role', 'group');
  chips.setAttribute('aria-label', 'Filter tool categories');
  const filters = [
    { id: 'all', label: 'All tools' },
    { id: 'favorites', label: '★ Favorites' },
    ...sections.map(section => ({ id: section.dataset.category, label: section.querySelector('h2')?.textContent || 'Tools' }))
  ];
  filters.forEach(filter => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tool-chip';
    button.dataset.filter = filter.id;
    button.textContent = filter.label;
    button.setAttribute('aria-pressed', String(filter.id === 'all'));
    button.addEventListener('click', () => {
      activeFilter = filter.id;
      chips.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      applyFilter();
    });
    chips.appendChild(button);
  });
  controls.insertAdjacentElement('afterend', chips);

  const useful = document.createElement('section');
  useful.className = 'useful-now';
  useful.innerHTML = '<h2>Useful now</h2><p>Favorites and recent tools, brought forward without hiding the full shelf.</p><div class="useful-links"></div>';
  chips.insertAdjacentElement('afterend', useful);

  function renderUsefulNow() {
    const target = useful.querySelector('.useful-links');
    const lens = read('life-routine-preferences-v1', {}).lens || 'general';
    const preferredTerms = lens === 'learning' ? ['MIT OpenCourseWare', 'myNoise', 'ChatGPT on Futurepedia'] : ['myNoise', 'Hemingway Editor', 'Squoosh'];
    const byUrl = new Map(wrappedBookmarks.map(item => [normalize(item.bookmark.href), item.bookmark]));
    const chosen = [];
    favorites.forEach(url => { if (byUrl.has(url)) chosen.push(byUrl.get(url)); });
    recents.forEach(record => { if (byUrl.has(record.url) && !chosen.includes(byUrl.get(record.url))) chosen.push(byUrl.get(record.url)); });
    preferredTerms.forEach(title => {
      const match = wrappedBookmarks.find(item => item.bookmark.querySelector('h3')?.textContent === title)?.bookmark;
      if (match && !chosen.includes(match)) chosen.push(match);
    });
    target.replaceChildren();
    chosen.slice(0, 6).forEach(bookmark => {
      const link = document.createElement('a');
      link.href = bookmark.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = `${bookmark.querySelector('h3')?.textContent || 'Open tool'} ↗`;
      target.appendChild(link);
    });
  }

  function applyFilter() {
    let visibleCount = 0;
    wrappedBookmarks.forEach(({ bookmark, wrapper }) => {
      const favorite = favorites.includes(normalize(bookmark.href));
      const visible = activeFilter === 'all' || (activeFilter === 'favorites' ? favorite : wrapper.dataset.category === activeFilter);
      wrapper.dataset.filterHidden = String(!visible);
      wrapper.dataset.searchHidden = String(bookmark.hidden);
      if (visible && !bookmark.hidden) visibleCount += 1;
    });
    sections.forEach(section => {
      const hasVisible = [...section.querySelectorAll('.tool-card-wrap')].some(wrapper => wrapper.dataset.filterHidden !== 'true' && !wrapper.querySelector('.bookmark').hidden);
      section.hidden = !hasVisible;
    });
    const count = document.getElementById('bookmark-count');
    const empty = document.getElementById('empty-state');
    if (count) count.textContent = `${visibleCount} ${visibleCount === 1 ? 'place' : 'places'}`;
    if (empty) empty.hidden = visibleCount !== 0;
  }

  renderUsefulNow();
  window.setTimeout(() => search?.addEventListener('input', applyFilter), 0);
})();
