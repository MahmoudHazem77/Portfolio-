/* =====================================================================
   main.js — preloader, smooth scroll, galleries, scroll choreography,
   cursor, magnetic buttons, theme switching, lightbox.
   Every animation is progressive: content is fully readable if this
   file fails, and prefers-reduced-motion gets a static document.
   ===================================================================== */
(function () {
  'use strict';

  var d = document, html = d.documentElement;
  var C = window.PORTFOLIO_CONFIG || {};
  var L = C.layout || {};
  var MEDIA = window.PFMedia;
  var G = window.gsap, ST = window.ScrollTrigger;
  if (!G || !ST) html.classList.add('rm'); else G.registerPlugin(ST);
  var RM = html.classList.contains('rm');
  var FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var Stage = window.Stage || { ok: false, ready: Promise.resolve(), init: function () { return false; }, measure: function () {}, intro: function () {}, setBackdrop: function () {} };

  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var el = function (tag, cls) { var e = d.createElement(tag); if (cls) e.className = cls; return e; };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var seg = function (v, a, b) { return clamp((v - a) / (b - a), 0, 1); };
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) window.scrollTo(0, 0);

  /* ====================================================================
     GALLERIES — every slot is built from config.js
     ==================================================================== */
  var SIZES = {
    stack: '(max-width: 767px) 88vw, 74vh',
    reel: '(max-width: 767px) 78vw, 62vh',
    archive: '(max-width: 767px) 50vw, 42vw',
    performance: '(max-width: 1024px) 90vw, 36vw',
    preview: '340px'
  };
  var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); loadMedia(e.target); } });
  }, { rootMargin: '70% 70%' }) : null;
  var vio = ('IntersectionObserver' in window) ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause();
    });
  }, { threshold: 0.2 }) : null;

  function slotHTML(c) {
    var num = pad(c.n);
    var hint = C.showSlotHints !== false
      ? '<span class="slot__file">' + esc(c.src || 'assets/creatives/creative-' + num + '.webp') + '</span>' : '';
    var state = c.src && C.assetsAvailable !== false ? 'pending' : 'empty';
    return '<div class="slot" data-state="' + state + '" data-kind="' + c.kind + '">' +
      '<div class="slot__ph" aria-hidden="true"><span class="slot__brand">VELVRA</span>' +
      '<span class="slot__no">' + (c.kind === 'video' ? 'Motion ' : 'Creative ') + num + '</span>' +
      '<span class="slot__msg">Asset to be added</span>' + hint + '</div>' +
      (c.kind === 'video' ? '<span class="slot__badge" aria-hidden="true">Motion</span>' : '') +
      '</div>';
  }
  function figure(id, cls, sizes) {
    var c = MEDIA && MEDIA.byId[id];
    if (!c) return null;
    var open = !c.src;
    var f = el('figure', 'fig' + (cls ? ' ' + cls : ''));
    f.dataset.id = id;
    f.dataset.sizes = sizes || '';
    f.innerHTML = slotHTML(c) +
      '<figcaption class="cap"><span class="cap__t">' + (open ? 'Open frame' : esc(c.title)) + '</span>' +
      '<span class="cap__m">' + pad(c.n) + ' / ' + (open ? 'Next cycle' : esc(c.world)) + '</span></figcaption>';
    if (c.src && C.assetsAvailable !== false) { if (io) io.observe(f); else loadMedia(f); }
    return f;
  }
  function altFor(c) { return 'VELVRA campaign creative: ' + c.title.replace(' — ', ', ') + ' laptop sleeve'; }
  function markReady(f, c) {
    var slot = $('.slot', f);
    slot.dataset.state = 'ready';
    if (!f.classList.contains('fig')) return;
    f.classList.add('is-ready');
    f.tabIndex = 0;
    f.setAttribute('role', 'button');
    f.setAttribute('aria-label', 'View ' + c.title + ' full size');
  }
  function loadMedia(f) {
    var c = MEDIA.byId[f.dataset.id], slot = $('.slot', f);
    if (!c || !c.src || (slot.dataset.state !== 'pending' && slot.dataset.state !== 'empty')) return;
    slot.dataset.state = 'loading';
    if (c.kind === 'video') {
      var v = el('video');
      v.muted = true; v.loop = true; v.playsInline = true;
      v.setAttribute('playsinline', ''); v.setAttribute('muted', '');
      v.preload = 'metadata';
      v.setAttribute('aria-label', 'VELVRA motion creative ' + pad(c.n));
      if (RM) v.controls = true;
      slot.insertBefore(v, slot.firstChild);
      MEDIA.video(c.id, v).then(function () {
        markReady(f, c);
        if (!RM && vio) vio.observe(v);
      }, function () { v.remove(); slot.dataset.state = 'empty'; });
      return;
    }
    MEDIA.image(c.id).then(function (r) {
      var img = new Image();
      img.alt = altFor(c);
      img.decoding = 'async';
      if (r.w && r.h) { img.width = r.w; img.height = r.h; }
      if (r.srcset) { img.srcset = r.srcset; img.sizes = f.dataset.sizes || '50vw'; }
      img.src = r.url;
      slot.insertBefore(img, slot.firstChild);
      var done = function () { markReady(f, c); };
      var fail = function () {
        if (img.complete && img.naturalWidth) { done(); return; }
        img.remove(); slot.dataset.state = 'empty';
      };
      if (img.decode) img.decode().then(done, fail);
      else { img.onload = done; img.onerror = fail; }
    }, function () { slot.dataset.state = 'empty'; });
  }

  function buildGalleries() {
    if (!MEDIA) return;
    var perf = $('[data-gallery="performance"]');
    (L.performance || []).forEach(function (id) { var f = figure(id, '', SIZES.performance); if (f && perf) perf.appendChild(f); });

    var stack = $('[data-gallery="stack"]');
    (L.stack || []).forEach(function (id) {
      var f = figure(id, '', SIZES.stack);
      if (!f || !stack) return;
      var card = el('div', 'stack__card'), out = el('div', 'stack__out'), inn = el('div', 'stack__in');
      inn.appendChild(f); out.appendChild(inn); out.appendChild(el('div', 'stack__shade')); card.appendChild(out);
      stack.appendChild(card);
    });

    var reel = $('[data-gallery="reel"]');
    (L.reel || []).forEach(function (id) { var f = figure(id, 'reel__item', SIZES.reel); if (f && reel) reel.appendChild(f); });

    var arch = $('[data-gallery="archive"]');
    (L.archive || []).forEach(function (id) { var f = figure(id, '', SIZES.archive); if (f && arch) arch.appendChild(f); });

    var pv = $('.row-preview'), c = L.workPreview && MEDIA.byId[L.workPreview];
    if (pv && c) {
      pv.innerHTML = '<div class="row-preview__in" data-id="' + c.id + '" data-sizes="' + SIZES.preview + '">' + slotHTML(c) + '</div>';
    }
  }
  buildGalleries();

  /* ====================================================================
     STAGE + SMOOTH SCROLL
     ==================================================================== */
  var stageOk = !RM && Stage.init() === true;
  if (!stageOk) html.classList.add('no-webgl');

  var lenis = null;
  if (!RM && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true });
    lenis.on('scroll', ST.update);
    G.ticker.add(function (t) { lenis.raf(t * 1000); });
    G.ticker.lagSmoothing(0);
    lenis.stop();
  }
  if (ST) ST.config({ ignoreMobileResize: true });

  /* ====================================================================
     THEME — backdrop crossfades when a light/dark section takes over
     ==================================================================== */
  var themed = $$('main > section[data-theme]');
  var marks = [], currentTheme = null;
  var backdrop = $('.backdrop'), metaTheme = $('meta[name="theme-color"]');
  var COL = { light: '#F3F0EA', dark: '#090909' };
  function measureThemes() {
    var y = window.scrollY, vh = innerHeight;
    marks = themed.map(function (s) {
      var at = s.hasAttribute('data-theme-at') && !RM ? parseFloat(s.getAttribute('data-theme-at')) : -0.5;
      return { y: s.getBoundingClientRect().top + y + at * vh, t: s.getAttribute('data-theme') };
    });
  }
  function themeAt(y) {
    var t = marks.length ? marks[0].t : 'light';
    for (var i = 0; i < marks.length; i++) { if (y >= marks[i].y) t = marks[i].t; else break; }
    return t;
  }
  function applyTheme(t, instant) {
    if (t === currentTheme) return;
    currentTheme = t;
    html.classList.toggle('theme-dark', t === 'dark');
    html.classList.toggle('theme-light', t !== 'dark');
    if (metaTheme) metaTheme.setAttribute('content', COL[t]);
    if (instant || !G || RM) {
      backdrop.style.backgroundColor = COL[t];
      Stage.setBackdrop(COL[t]);
      return;
    }
    G.to(backdrop, {
      backgroundColor: COL[t], duration: 0.9, ease: 'power2.inOut', overwrite: true,
      onUpdate: function () { Stage.setBackdrop(backdrop.style.backgroundColor); }
    });
  }

  /* ====================================================================
     NAV + MENU + ANCHORS
     ==================================================================== */
  var nav = $('.nav'), menuBtn = $('.nav__menu'), menu = $('#menu');
  function onScroll() {
    var y = window.scrollY;
    var s = y > 40;
    if (nav.classList.contains('is-scrolled') !== s) { nav.classList.toggle('is-scrolled', s); html.classList.toggle('is-scrolled', s); }
    applyTheme(themeAt(y));
  }
  addEventListener('scroll', onScroll, { passive: true });

  function setMenu(open) {
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.textContent = open ? 'Close' : 'Menu';
    menu.hidden = !open;
    html.classList.toggle('menu-open', open);
    if (lenis) { if (open) lenis.stop(); else lenis.start(); }
    if (open) { var a = $('a', menu); if (a) a.focus(); }
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () { setMenu(menu.hidden); });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); }
    });
  }

  function goTo(target, hash) {
    var off = target.matches('.xp') ? -Math.round(innerHeight * 0.12) : 0;
    var top = hash === '#top' ? 0 : target.getBoundingClientRect().top + window.scrollY + off;
    if (lenis) lenis.scrollTo(top, { duration: 1.5, easing: function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); } });
    else window.scrollTo({ top: top, behavior: RM ? 'auto' : 'smooth' });
    if (target.hasAttribute('tabindex')) setTimeout(function () { target.focus({ preventScroll: true }); }, lenis ? 900 : 50);
  }
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var hash = a.getAttribute('href');
    if (hash.length < 2) return;
    var t = d.querySelector(hash);
    if (!t) return;
    e.preventDefault();
    if (menu && !menu.hidden) setMenu(false);
    goTo(t, hash);
  });

  /* ====================================================================
     COUNTERS — the real value stays in the accessibility tree
     ==================================================================== */
  function counter(node, opts) {
    var finalText = node.textContent.trim();
    var o = opts || {};
    var dec = o.dec !== undefined ? o.dec : parseInt(node.getAttribute('data-dec') || '0', 10);
    var pre = o.pre !== undefined ? o.pre : (node.getAttribute('data-prefix') || '');
    var suf = o.suf !== undefined ? o.suf : (node.getAttribute('data-suffix') || '');
    var to = o.to !== undefined ? o.to : parseFloat(node.getAttribute('data-count'));
    node.innerHTML = '<span class="cnt" aria-hidden="true"></span><span class="visually-hidden">' + esc(finalText) + '</span>';
    var out = node.firstChild;
    var sufHTML = esc(suf).replace('+', '<span class="plus">+</span>').replace('%', '<span class="pct">%</span>');
    function set(v) {
      out.innerHTML = esc(pre + v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })) + sufHTML;
    }
    set(0);
    return { set: set, to: to, dec: dec };
  }
  function countOnEnter(node) {
    var c = counter(node), o = { v: 0 };
    ST.create({
      trigger: node, start: 'top 88%', once: true,
      onEnter: function () {
        G.to(o, { v: c.to, duration: 1.8, ease: 'power3.out', onUpdate: function () { c.set(o.v); }, onComplete: function () { c.set(c.to); } });
      }
    });
  }

  /* ====================================================================
     SCROLL SCENES
     ==================================================================== */
  function pinTL(section, fromTop) {
    var pinH = parseFloat(section.style.getPropertyValue('--pin')) / 100 || section.offsetHeight / innerHeight;
    var off = fromTop ? 0 : 1;
    var tl = G.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: section, start: fromTop ? 'top top' : 'top bottom', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true }
    });
    tl.set({}, {}, pinH - 1 + off);
    return { tl: tl, at: function (v) { return Math.max(0, v + off); }, len: pinH };
  }
  function reveal(targets, trigger, vars, start) {
    var nodes = typeof targets === 'string' ? $$(targets) : targets;
    if (!nodes.length) return;
    var v = { y: 40, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: 0.07 };
    for (var k in vars) v[k] = vars[k];
    v.scrollTrigger = { trigger: trigger || nodes[0], start: start || 'top 86%', once: true };
    G.from(nodes, v);
  }
  function splitWords(node) {
    var words = node.textContent.trim().split(/\s+/);
    node.textContent = '';
    words.forEach(function (w, i) {
      var o = el('span', 'w'), inn = el('span');
      inn.textContent = w; o.appendChild(inn); node.appendChild(o);
      if (i < words.length - 1) node.appendChild(d.createTextNode(' '));
    });
    return $$('.w > span', node);
  }

  function heroScroll() {
    var h = pinTL($('#top'), true);
    var len = h.len - 1;
    h.tl.to('.hw--1', { x: function () { return -innerWidth * 0.04; }, duration: len }, 0)
      .to('.hw--2', { x: function () { return innerWidth * 0.04; }, duration: len }, 0)
      .to('.hw--3', { y: function () { return -innerHeight * 0.2; }, duration: len }, 0)
      .to('.hw--4', { opacity: 0, y: function () { return innerHeight * 0.1; }, duration: 0.9 }, 0.35)
      .to('.hero__intro', { opacity: 0, y: -40, duration: 0.55 }, 0)
      .to('.hero__first', { x: function () { return -innerWidth * 0.03; }, duration: len }, 0)
      .to('.hero__last', { x: function () { return innerWidth * 0.03; }, duration: len }, 0);
  }

  function scenes() {
    var mm = G.matchMedia();

    heroScroll();

    /* chapter labels */
    $$('.sec > .chapter, .work-intro .chapter').forEach(function (c) { reveal([c], c, { y: 16, duration: 0.9 }, 'top 92%'); });

    /* 02 about */
    var st = $('[data-words]');
    if (st) {
      var words = splitWords(st);
      G.from(words, { yPercent: 108, duration: 1.3, ease: 'expo.out', stagger: 0.03, scrollTrigger: { trigger: st, start: 'top 82%', once: true } });
    }
    reveal('.about__copy > p, .profile > div', '.about__copy', { y: 24, stagger: 0.06 });

    /* 03 work intro + index */
    var wi = $('.work-intro');
    G.fromTo('.work-intro__title .mask > span', { yPercent: 108 }, {
      yPercent: 0, ease: 'none', stagger: 0.12,
      scrollTrigger: { trigger: wi, start: 'top 78%', end: 'top 8%', scrub: true }
    });
    var w = pinTL(wi);
    w.tl.fromTo('.work-intro__note', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.25 }, w.at(0.02))
      .to('.work-intro__title', { scale: 0.94, opacity: 0.14, duration: 0.3 }, w.at(0.5))
      .to('.work-intro__note', { opacity: 0, duration: 0.2 }, w.at(0.55));
    reveal('.rows > li', '.rows', { y: 36, stagger: 0.08 });

    /* 04 VELVRA opening */
    var vi = pinTL($('.vi')), shift = stageOk ? 0 : -0.6;
    var letters = $$('.vi__word span');
    vi.tl.fromTo(letters, {
      opacity: 0, yPercent: 30,
      x: function (i) { return (i - (letters.length - 1) / 2) * innerWidth * 0.07; }
    }, { opacity: 1, yPercent: 0, x: 0, duration: 0.38, stagger: 0.035, ease: 'power2.out' }, vi.at(0.75 + shift))
      .fromTo('.vi__label', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.25 }, vi.at(1.0 + shift))
      .fromTo('.vi__statement', { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.32, ease: 'power2.out' }, vi.at(1.12 + shift))
      .fromTo('.vi__support', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.25 }, vi.at(1.35 + shift))
      .fromTo('.vi__facts > div', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.22, stagger: 0.06 }, vi.at(1.5 + shift));

    /* operating model */
    var m = pinTL($('.model'));
    m.tl.fromTo('.model__title', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4 }, m.at(-0.4));
    if (!stageOk) m.tl.fromTo('.op', { opacity: 0, y: 40 }, { opacity: 1, y: 0, stagger: 0.12, duration: 0.35 }, m.at(0.1));

    /* KPI hero */
    var kNum = $('.kpi__num'), kc = counter(kNum, { to: 1.1, dec: 1, pre: '', suf: 'M' });
    G.set('.kpi__big', { yPercent: -50 });
    var k = pinTL($('.kpi'));
    k.tl.fromTo('.kpi__big', { y: function () { return innerHeight * 0.16; } }, { y: function () { return -innerHeight * 0.12; }, duration: k.len - 0.4 }, k.at(-0.6))
      .fromTo(kNum, { scale: 1.06 }, { scale: 1, duration: 1.2 }, k.at(-0.6))
      .fromTo(['.kpi__cur', '.kpi__label'], { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.06 }, k.at(-0.35))
      .fromTo(['.kpi__period', '.kpi__exact'], { opacity: 0 }, { opacity: 1, duration: 0.3 }, k.at(0));
    ST.create({
      trigger: '.kpi', start: 'top bottom', end: 'bottom bottom',
      onUpdate: function (s) { var v = s.progress * k.len - 1; kc.set(kc.to * seg(v, -0.55, 0.15)); }
    });

    /* KPI grid + performance */
    reveal('.kpis__grid > li', '.kpis__grid', { y: 50, stagger: 0.08 });
    reveal('.ledger-strip > div', '.ledger-strip', { y: 20, stagger: 0.06 });
    reveal('.perf__text > *', '.perf__text', { y: 36, stagger: 0.08 });
    $$('[data-count]').forEach(countOnEnter);
    $$('.perf__feed .fig').forEach(function (f, i) {
      G.fromTo(f, { y: function () { return innerHeight * (0.05 + i * 0.04); } }, {
        y: function () { return -innerHeight * (0.03 + i * 0.04); }, ease: 'none',
        scrollTrigger: { trigger: '.perf', start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true }
      });
    });

    /* worlds — stack of sleeves separates, headline arrives */
    var wd = pinTL($('.worlds')), ws = stageOk ? 0 : -0.4;
    wd.tl.fromTo('.worlds__title .mask > span', { yPercent: 108 }, { yPercent: 0, duration: 0.3, stagger: 0.1, ease: 'power2.out' }, wd.at(0.5 + ws))
      .fromTo('.worlds__note', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.25 }, wd.at(0.8 + ws));

    /* stacked cards */
    var cards = $$('.stack__card');
    cards.forEach(function (card, i) {
      var inn = $('.stack__in', card), out = $('.stack__out', card), shade = $('.stack__shade', card), next = cards[i + 1];
      G.fromTo(inn, { scale: 0.86, yPercent: 10 }, {
        scale: 1, yPercent: 0, ease: 'none',
        scrollTrigger: { trigger: card, start: 'top bottom', end: 'top top', scrub: true }
      });
      if (next) {
        var sc = { trigger: next, start: 'top bottom', end: 'top top', scrub: true };
        G.to(out, { scale: 0.88, yPercent: -5, ease: 'none', scrollTrigger: sc });
        G.to(shade, { opacity: 0.6, ease: 'none', scrollTrigger: { trigger: next, start: 'top bottom', end: 'top top', scrub: true } });
      }
    });

    /* horizontal reel — desktop only; mobile gets a snap carousel from CSS */
    mm.add('(min-width: 768px)', function () {
      var reel = $('.reel'), track = $('.reel__track');
      var dist = function () { return Math.max(0, track.scrollWidth - innerWidth); };
      var setH = function () { reel.style.height = (dist() + innerHeight) + 'px'; };
      setH();
      ST.addEventListener('refreshInit', setH);
      G.to(track, {
        x: function () { return -dist(); }, ease: 'none',
        scrollTrigger: { trigger: reel, start: 'top top', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true }
      });
      return function () { ST.removeEventListener('refreshInit', setH); reel.style.height = ''; };
    });

    /* 30+ artifacts */
    var art = $('.artifacts__num'), ac = counter(art, { to: 30, dec: 0, pre: '', suf: '+' });
    var ar = pinTL($('.artifacts'));
    ar.tl.fromTo(art, { scale: 0.82, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: 'power2.out' }, ar.at(-0.5))
      .fromTo('.artifacts__cap', { opacity: 0, letterSpacing: '.42em' }, { opacity: 1, letterSpacing: '.16em', duration: 0.4 }, ar.at(-0.2))
      .fromTo('.artifacts__note', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3 }, ar.at(0.2))
      .to(art, { scale: 1.06, duration: 0.8 }, ar.at(0.1));
    ST.create({
      trigger: '.artifacts', start: 'top bottom', end: 'bottom bottom',
      onUpdate: function (s) { ac.set(Math.round(30 * seg(s.progress * ar.len - 1, -0.5, 0.2))); }
    });

    /* archive — simple clip reveals, the quiet part of the gallery */
    $$('.archive__grid .fig').forEach(function (f) {
      G.from($('.slot', f), { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: f, start: 'top 92%', once: true } });
      G.from($('.cap', f), { opacity: 0, y: 10, duration: 0.8, delay: 0.25, scrollTrigger: { trigger: f, start: 'top 92%', once: true } });
    });
    reveal('.archive__head > *', '.archive__head', { y: 24 });

    /* CRO journey */
    var cro = $('.cro'), jr = $('.journey'), jn = $$('.jn');
    var c1 = pinTL(cro);
    c1.tl.fromTo('.cro__head', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.35 }, c1.at(-0.45));
    ST.create({
      trigger: cro, start: 'top top', end: 'bottom bottom',
      onUpdate: function (s) {
        var p = seg(s.progress * (c1.len - 1), 0.15, 1.25);
        jr.style.setProperty('--p', p.toFixed(4));
        jn.forEach(function (n, i) { n.classList.toggle('is-on', p >= i / (jn.length - 1) - 0.001); });
      }
    });
    jn[0] && jn[0].classList.add('is-on');

    /* COD — the order was not the finish line */
    var cod = pinTL($('.cod'));
    cod.tl.fromTo('.cod__title span', { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.4, stagger: 0.12, ease: 'power3.out' }, cod.at(-0.55))
      .fromTo('.cm--1', { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.3 }, cod.at(0.15))
      .fromTo('.cm--2', { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.3 }, cod.at(0.55))
      .fromTo('.cm--2 .bar i', { scaleX: 0 }, { scaleX: 1, duration: 0.4 }, cod.at(0.65))
      .fromTo('.cm--3', { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.3 }, cod.at(0.95))
      .fromTo('.cm--3 .cmp b', { scaleX: 0 }, { scaleX: 1, duration: 0.35, stagger: 0.1 }, cod.at(1.05));
    var cv = $$('.cod .cm__v');
    var cc = [counter(cv[0], { to: 427, dec: 0, pre: 'EGP ', suf: 'K' }), counter(cv[1], { to: 38.8, dec: 1, pre: '', suf: '%' }), counter(cv[2], { to: 1.83, dec: 2, pre: '', suf: '%' })];
    ST.create({
      trigger: '.cod', start: 'top bottom', end: 'bottom bottom',
      onUpdate: function (s) {
        var v = s.progress * cod.len - 1;
        cc[0].set(427 * seg(v, 0.15, 0.55)); cc[1].set(38.8 * seg(v, 0.55, 0.95)); cc[2].set(1.83 * seg(v, 0.95, 1.3));
      }
    });

    var steps = $('.codj__steps'), lis = $$('.codj__steps > li:not(.codj__line)');
    ST.create({
      trigger: steps, start: 'top 72%', end: 'bottom 60%',
      onUpdate: function (s) {
        steps.style.setProperty('--p', s.progress.toFixed(4));
        lis.forEach(function (l, i) { l.classList.toggle('is-on', s.progress >= i / (lis.length - 1) - 0.02); });
      }
    });
    reveal('.codj__note', '.codj__note', { y: 24 });

    /* insight + AI */
    G.from('.insight .bar i', { scaleX: 0, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.insight .bar', start: 'top 88%', once: true } });
    reveal('.insight__cap, .flow li', '.insight__side', { y: 24, stagger: 0.08 });
    reveal('.ai__title', '.ai', { y: 50 });
    reveal('.ai__num span, .ai__num small', '.ai__grid', { y: 40, stagger: 0.1 });
    reveal('.ai__copy p, .ai__tools li', '.ai__copy', { y: 20, stagger: 0.06 });

    /* 05–08 editorial sections — quiet reveals only */
    $$('.xp').forEach(function (x) { reveal([x], x, { y: 50 }); });
    reveal('.fin__title', '.fin__title', { y: 50 });
    reveal('.ledger li', '.ledger', { x: -24, y: 0, stagger: 0.09 });
    reveal('.fin__side > *, .fin__areas li', '.fin__side', { y: 18, stagger: 0.05 });
    reveal('.stackrows > div', '.stackrows', { y: 30, stagger: 0.07 });
    reveal('.edu__degree > *', '.edu__grid', { y: 30, stagger: 0.08 });
    reveal('.certs li', '.certs', { y: 24, stagger: 0.08 });

    /* 09 contact */
    G.from('.contact__title span', { yPercent: 60, opacity: 0, duration: 1.3, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: '.contact', start: 'top 62%', once: true } });
    reveal('.contact__foot > *', '.contact__foot', { y: 24, stagger: 0.1 }, 'top 96%');
  }

  /* ====================================================================
     HERO INTRO + PRELOADER
     ==================================================================== */
  function heroInitial() {
    G.set('.hero__name .mask > span', { yPercent: 105 });
    G.set('.hw', { yPercent: 110, clipPath: 'inset(0% 0% 100% 0%)' });
    G.set(['.hero__lede', '.hero__cred'], { opacity: 0, y: 24 });
    G.set('.nav', { opacity: 0, y: -12 });
    G.set('.hero__cue', { opacity: 0 });
  }
  function heroIn() {
    var tl = G.timeline({ defaults: { ease: 'expo.out' } });
    tl.to('.hero__name .mask > span', { yPercent: 0, duration: 1.5, stagger: 0.1 }, 0)
      .to('.hw', { yPercent: 0, clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, stagger: 0.07 }, 0.3)
      .to(['.hero__lede', '.hero__cred'], { opacity: 1, y: 0, duration: 1.1, stagger: 0.08 }, 0.5)
      .to('.nav', { opacity: 1, y: 0, duration: 1 }, 0.55)
      .to('.hero__cue', { opacity: 1, duration: 0.8 }, 1.0);
    tl.eventCallback('onComplete', function () { G.set('.hw', { clearProps: 'clipPath' }); });
  }
  function preloader() {
    var pl = $('.preloader');
    if (RM || !G || !pl) {
      if (pl) pl.remove();
      html.classList.remove('is-loading');
      return Promise.resolve();
    }
    return new Promise(function (done) {
      var chars = [];
      $$('.pl__line[data-split]', pl).forEach(function (line) {
        var t = line.textContent; line.textContent = '';
        t.split('').forEach(function (ch) { var s = el('span', 'pl__char'); s.textContent = ch; line.appendChild(s); chars.push(s); });
      });
      G.set(chars, { y: 0, yPercent: 108 });
      var count = $('.pl__count', pl), bar = $('.pl__bar i', pl), prog = { v: 0 };
      var ready = Promise.race([
        Promise.all([d.fonts ? d.fonts.ready : null, Stage.ready]),
        wait(3200)
      ]);
      var tl = G.timeline();
      tl.to(chars, { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: 0.03 }, 0.12)
        .to(['.pl__meta', '.pl__sub', '.pl__progress'], { opacity: 1, duration: 0.6, stagger: 0.08, ease: 'power2.out' }, 0.35)
        .to(prog, {
          v: 100, duration: 1.2, ease: 'power2.inOut',
          onUpdate: function () { var n = Math.round(prog.v); count.textContent = pad(n); bar.style.transform = 'scaleX(' + (prog.v / 100) + ')'; }
        }, 0.15);
      var intro = new Promise(function (r) { tl.eventCallback('onComplete', r); });
      Promise.all([intro, ready]).then(function () {
        var out = G.timeline({ onComplete: function () { pl.remove(); } });
        out.to('.pl__name', { scale: 1.05, duration: 0.6, ease: 'power2.inOut' }, 0)
          .to(['.pl__meta', '.pl__sub', '.pl__progress'], { opacity: 0, duration: 0.3 }, 0)
          .add(function () {
            pl.classList.add('is-out');
            html.classList.remove('is-loading');
            if (lenis) lenis.start();
            Stage.intro(2.0);
            heroIn();
            done();
          }, 0.2)
          .to('.pl__panel--top', { yPercent: -100, duration: 0.95, ease: 'expo.inOut' }, 0.2)
          .to('.pl__panel--bottom', { yPercent: 100, duration: 0.95, ease: 'expo.inOut' }, 0.2)
          .to('.pl__inner', { yPercent: -16, opacity: 0, duration: 0.7, ease: 'power3.in' }, 0.18);
      });
    });
  }

  /* ====================================================================
     CURSOR, MAGNETIC, ROW PREVIEW, LIGHTBOX
     ==================================================================== */
  function cursor() {
    if (!FINE) return;
    var cur = $('.cursor'), lab = $('.cursor__label');
    if (!cur) return;
    html.classList.add('has-cursor');
    var qx = G ? G.quickTo(cur, 'x', { duration: RM ? 0.01 : 0.35, ease: 'power3' }) : function (v) { cur.style.left = v + 'px'; };
    var qy = G ? G.quickTo(cur, 'y', { duration: RM ? 0.01 : 0.35, ease: 'power3' }) : function (v) { cur.style.top = v + 'px'; };
    var shown = false;
    addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      if (!shown) { shown = true; cur.style.opacity = 1; if (G) { G.set(cur, { x: e.clientX, y: e.clientY }); } }
      qx(e.clientX); qy(e.clientY);
    }, { passive: true });
    html.addEventListener('pointerleave', function () { shown = false; cur.style.opacity = 0; });
    d.addEventListener('pointerover', function (e) {
      var t = e.target.closest && e.target.closest('[data-cursor], a, button, .fig.is-ready, .fig');
      var text = '', link = false;
      if (t) {
        if (t.classList.contains('fig')) text = t.classList.contains('is-ready') ? 'View' : '';
        else if (t.hasAttribute('data-cursor')) text = t.getAttribute('data-cursor');
        else if (t.matches('a[target="_blank"]')) text = '↗';
        if (!text && t.matches('a, button')) link = true;
      }
      lab.textContent = text;
      cur.classList.toggle('is-label', !!text);
      cur.classList.toggle('is-arrow', text === '↗');
      cur.classList.toggle('is-link', link);
    });
  }
  function magnetic() {
    if (!FINE || RM || !G) return;
    $$('[data-magnetic]').forEach(function (b) {
      var xTo = G.quickTo(b, 'x', { duration: 0.6, ease: 'power3' }), yTo = G.quickTo(b, 'y', { duration: 0.6, ease: 'power3' });
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.28); yTo((e.clientY - r.top - r.height / 2) * 0.4);
      });
      b.addEventListener('pointerleave', function () { xTo(0); yTo(0); });
    });
  }
  function rowPreview() {
    var pv = $('.row-preview'), inn = pv && $('.row-preview__in', pv);
    if (!FINE || !pv || !inn) return;
    var loaded = false;
    var qx = G ? G.quickTo(pv, 'x', { duration: RM ? 0.01 : 0.55, ease: 'power3' }) : null;
    var qy = G ? G.quickTo(pv, 'y', { duration: RM ? 0.01 : 0.55, ease: 'power3' }) : null;
    $$('[data-preview]').forEach(function (row) {
      row.addEventListener('pointerenter', function (e) {
        if (!loaded) { loaded = true; if (C.assetsAvailable !== false) loadMedia(inn); }
        if (G) { G.set(pv, { x: e.clientX, y: e.clientY }); }
        pv.classList.add('is-on');
      });
      row.addEventListener('pointermove', function (e) { if (qx) { qx(e.clientX); qy(e.clientY); } });
      row.addEventListener('pointerleave', function () { pv.classList.remove('is-on'); });
    });
  }

  var lb = null, lbCur = null;
  function lightbox() {
    if (!('HTMLDialogElement' in window)) return;
    lb = el('dialog', 'lb');
    lb.setAttribute('aria-label', 'Creative viewer');
    lb.innerHTML = '<div class="lb__bar"><p class="lb__cap"></p><button class="lb__btn lb__close" type="button">Close</button></div>' +
      '<div class="lb__media"></div>' +
      '<div class="lb__nav"><button class="lb__btn" type="button" data-dir="-1">Previous</button><button class="lb__btn" type="button" data-dir="1">Next</button></div>';
    d.body.appendChild(lb);
    var media = $('.lb__media', lb), cap = $('.lb__cap', lb);
    function show(f) {
      lbCur = f;
      var c = MEDIA.byId[f.dataset.id], src = $('.slot img, .slot video', f);
      media.innerHTML = '';
      if (!src) return;
      if (src.tagName === 'IMG') {
        var im = new Image(); im.alt = src.alt; im.src = src.currentSrc || src.src; media.appendChild(im);
      } else {
        var v = el('video'); v.src = src.currentSrc || src.src; v.controls = true; v.muted = true; v.loop = true; v.playsInline = true;
        if (src.poster) v.poster = src.poster;
        if (!RM) v.autoplay = true;
        v.setAttribute('aria-label', src.getAttribute('aria-label') || 'Motion creative');
        media.appendChild(v);
      }
      cap.innerHTML = esc(c.title) + '<small>' + pad(c.n) + ' / ' + esc(c.world) + '</small>';
    }
    function step(dir) {
      var all = $$('.fig.is-ready'), i = all.indexOf(lbCur);
      if (!all.length) return;
      show(all[(i + dir + all.length) % all.length]);
    }
    function open(f) {
      show(f);
      lb.showModal();
      html.classList.add('lb-open');
      if (lenis) lenis.stop();
    }
    lb.addEventListener('close', function () {
      media.innerHTML = '';
      html.classList.remove('lb-open');
      if (lenis) lenis.start();
      if (lbCur) lbCur.focus({ preventScroll: true });
    });
    lb.addEventListener('click', function (e) {
      if (e.target === lb || e.target.closest('.lb__close')) { lb.close(); return; }
      var b = e.target.closest('[data-dir]');
      if (b) step(parseInt(b.getAttribute('data-dir'), 10));
    });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    });
    d.addEventListener('click', function (e) {
      var f = e.target.closest && e.target.closest('.fig.is-ready');
      if (f) open(f);
    });
    d.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('is-ready') && e.target.classList.contains('fig')) {
        e.preventDefault(); open(e.target);
      }
    });
  }

  /* ====================================================================
     BOOT
     ==================================================================== */
  function refreshAll() {
    Stage.measure();
    measureThemes();
    onScroll();
  }
  measureThemes();
  applyTheme(themeAt(window.scrollY), true);

  if (!RM) {
    heroInitial();
    scenes();
    ST.addEventListener('refresh', refreshAll);
  } else {
    html.classList.remove('is-loading');
  }
  cursor();
  magnetic();
  rowPreview();
  lightbox();

  preloader().then(function () {
    if (!RM) ST.refresh();
    refreshAll();
    if (location.hash) {
      var t = d.querySelector(location.hash);
      if (t) setTimeout(function () { goTo(t, location.hash); }, 60);
    }
  });
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { if (!RM) ST.refresh(); else refreshAll(); });
  addEventListener('load', function () { if (!RM) ST.refresh(); else refreshAll(); });
  if (RM) addEventListener('resize', function () { measureThemes(); });
})();
