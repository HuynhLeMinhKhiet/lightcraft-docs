// Spark sidebar: collapsible groups, and the open page's H2 headings under its link (Jim, 2026-10-29).
// Mintlify runs this on every page, so it acts on /spark paths only. If it fails, the normal sidebar and "On this page" stay.
(function () {
  const roots = ['#sidebar-content', '#mobile-nav'];
  const opened = new Set();
  let lastPath = null;
  let timer = null;
  let ticking = false;

  const isSpark = () => location.pathname.startsWith('/spark');
  const cleanPath = (p) => p.replace(/\\/g, '/').replace(/\/$/, '');
  const clean = (s) => s.replace(/​/g, '').trim();
  // Card titles are H2s too, and a heading over nothing but cards is only a list of links.
  const heads = () => [...document.querySelectorAll('#content > h2[id]')].filter((h) => h.getClientRects().length && !h.nextElementSibling?.matches('.columns'));

  function currentLink(root) {
    const path = cleanPath(location.pathname);
    return [...root.querySelectorAll('a[href]')].find((a) => cleanPath(a.getAttribute('href').split('#')[0]) === path);
  }

  function setGroup(header, name, isOpen) {
    const group = header.parentElement;
    group.dataset.spkGroup = '';
    if (isOpen) delete group.dataset.spkClosed;
    else group.dataset.spkClosed = '';
    header.setAttribute('role', 'button');
    header.setAttribute('tabindex', '0');
    header.setAttribute('aria-expanded', String(isOpen));
    header.dataset.spkName = name;
  }

  function setHeadings(root, link, list) {
    const key = list.map((h) => h.id).join('|');
    const item = link && link.closest('li');
    root.querySelectorAll('.spk-heads').forEach((ul) => {
      if (ul.parentElement !== item || ul.dataset.key !== key) ul.remove();
    });
    if (!item || !list.length || item.querySelector('.spk-heads')) return;
    const ul = document.createElement('ul');
    ul.className = 'spk-heads';
    ul.dataset.key = key;
    for (const h of list) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = clean(h.textContent);
      li.append(a);
      ul.append(li);
    }
    item.append(ul);
  }

  function reset() {
    delete document.documentElement.dataset.spark;
    document.querySelectorAll('.spk-heads').forEach((ul) => ul.remove());
    document.querySelectorAll('[data-spk-group]').forEach((g) => {
      delete g.dataset.spkGroup;
      delete g.dataset.spkClosed;
    });
    document.querySelectorAll('[data-spk-name]').forEach((h) => {
      delete h.dataset.spkName;
      h.removeAttribute('role');
      h.removeAttribute('tabindex');
      h.removeAttribute('aria-expanded');
    });
  }

  function apply() {
    if (!isSpark()) {
      if (document.documentElement.dataset.spark !== undefined) reset();
      lastPath = null;
      return;
    }
    document.documentElement.dataset.spark = '';
    const moved = location.pathname !== lastPath;
    const list = heads();
    let found = false;
    for (const selector of roots) {
      const root = document.querySelector(selector);
      if (!root) continue;
      const link = currentLink(root);
      found = found || Boolean(link);
      for (const header of root.querySelectorAll('.sidebar-group-header')) {
        const name = clean(header.textContent);
        if (moved && link && header.parentElement.contains(link)) opened.add(name);
        setGroup(header, name, opened.has(name));
      }
      setHeadings(root, link, list);
    }
    if (found) lastPath = location.pathname;
    mark();
  }

  // Marks the section you're reading, as "On this page" did.
  function mark() {
    ticking = false;
    let at = null;
    for (const h of heads()) {
      if (h.getBoundingClientRect().top > 160) break;
      at = h.id;
    }
    document.querySelectorAll('.spk-heads a').forEach((a) => {
      if (a.hash === '#' + at) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
  }

  function toggle(header) {
    const name = header.dataset.spkName;
    const isOpen = !opened.has(name);
    if (isOpen) opened.add(name);
    else opened.delete(name);
    document.querySelectorAll('.sidebar-group-header').forEach((h) => {
      if (h.dataset.spkName === name) setGroup(h, name, isOpen);
    });
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(apply, 80);
  }

  document.addEventListener('click', (e) => {
    if (!isSpark() || !(e.target instanceof Element)) return;
    const header = e.target.closest('[data-spk-name]');
    if (header) return toggle(header);
    const head = e.target.closest('.spk-heads a');
    if (!head) return;
    e.preventDefault();
    const target = document.getElementById(decodeURIComponent(head.hash.slice(1)));
    if (!target) return;
    history.replaceState(history.state, '', head.hash);
    document.querySelector('#mobile-nav button[aria-label*="lose"]')?.click();
    target.scrollIntoView();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (!(e.target instanceof Element) || !e.target.matches('[data-spk-name]')) return;
    e.preventDefault();
    toggle(e.target);
  });

  window.addEventListener('scroll', () => {
    if (ticking || !isSpark()) return;
    ticking = true;
    requestAnimationFrame(mark);
  }, { passive: true });

  document.addEventListener('mintlify:navigate', schedule);
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  apply();
})();
