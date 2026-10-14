/* Romaric Segla — Portfolio interactions */
(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  // ---------------------------------------------------------------- basics
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  $('.theme-toggle').addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    $('meta[name="theme-color"]').setAttribute('content', next === 'light' ? '#f1ebe2' : '#0d0c0b');
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  initForm();

  // Without GSAP (blocked CDN, offline) fall back to the static, fully visible page.
  if (!window.gsap || !window.ScrollTrigger) {
    root.classList.remove('js');
    return;
  }

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;

  // ---------------------------------------------------------------- text splitting
  $$('[data-split]').forEach(function (el) {
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach(function (word, i) {
      var w = document.createElement('span');
      w.className = 'w';
      w.setAttribute('aria-hidden', 'true');
      word.split('').forEach(function (ch) {
        var c = document.createElement('span');
        c.className = 'c';
        c.textContent = ch;
        w.appendChild(c);
      });
      el.appendChild(w);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
    el.setAttribute('aria-label', words.join(' '));
  });

  $$('[data-words]').forEach(function (el) {
    var frag = document.createDocumentFragment();
    Array.prototype.slice.call(el.childNodes).forEach(function (node) {
      var isText = node.nodeType === 3;
      var words = node.textContent.split(/\s+/).filter(Boolean);
      words.forEach(function (word) {
        var span = isText ? document.createElement('span') : node.cloneNode(false);
        span.classList.add('word');
        span.textContent = word;
        frag.appendChild(span);
        frag.appendChild(document.createTextNode(' '));
      });
    });
    el.textContent = '';
    el.appendChild(frag);
  });

  // ---------------------------------------------------------------- smooth scroll
  var lenis = null;
  if (!reduceMotion && window.Lenis) {
    lenis = new window.Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); } });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      var target = id === '#top' ? 0 : $(id);
      if (target === null) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.6 });
      else window.scrollTo({ top: target === 0 ? 0 : target.getBoundingClientRect().top + window.scrollY, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });

  // ---------------------------------------------------------------- nav
  var nav = $('.nav');
  var lastY = 0;
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: function (self) {
      var y = self.scroll();
      nav.classList.toggle('is-scrolled', y > 40);
      nav.classList.toggle('is-hidden', y > lastY && y > window.innerHeight * 0.8);
      lastY = y;
    }
  });
  $$('.nav__links a').forEach(function (link) {
    var section = $(link.getAttribute('href'));
    if (!section) return;
    ScrollTrigger.create({
      trigger: section,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: function (self) { link.classList.toggle('is-active', self.isActive); }
    });
  });

  // ---------------------------------------------------------------- reduced motion: show everything, stop here
  if (reduceMotion) {
    gsap.set('.reveal', { opacity: 1, y: 0 });
    initHeroCanvas(false);
    return;
  }

  // ---------------------------------------------------------------- preloader + hero intro
  var heroChars = $$('.hero__title .c');
  gsap.set(heroChars, { yPercent: 110 });
  gsap.set('.hero__pill', { scale: 0, rotate: -12 });
  gsap.set(['.hero__meta', '.hero__star', '.scroll-cue'], { opacity: 0 });
  gsap.set('.hero__bottom', { opacity: 0, y: 30 });
  if (lenis) lenis.stop();

  var counter = { v: 0 };
  var countEl = $('[data-count]');
  var intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
  intro
    .to('.loader__mark rect', { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut' }, 0)
    .to(counter, {
      v: 100, duration: 1.6, ease: 'power2.inOut',
      onUpdate: function () { countEl.textContent = Math.round(counter.v); }
    }, 0)
    .to('.loader__inner', { scale: 0.8, opacity: 0, duration: 0.5, ease: 'power2.in' }, 1.65)
    .to('.loader', { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, 1.8)
    .set('.loader', { display: 'none' })
    .to(heroChars, { yPercent: 0, duration: 1.4, stagger: 0.035 }, 2.25)
    .to('.hero__pill', { scale: 1, rotate: 0, duration: 1.4 }, 2.5)
    .to(['.hero__meta', '.hero__star', '.scroll-cue'], { opacity: 1, duration: 1 }, 2.8)
    .to('.hero__bottom', { opacity: 1, y: 0, duration: 1.2 }, 2.8)
    .add(function () {
      if (lenis) lenis.start();
      $$('.hero [data-counter]').forEach(countUp);
    }, 2.9);

  gsap.set('.loader', { clipPath: 'inset(0 0 0% 0)' });

  // Hero parallax on scroll
  gsap.to('.hero__title', {
    yPercent: -18, opacity: 0.2, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  });
  gsap.to('.hero__glow', {
    scale: 1.4, opacity: 0, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  });

  initHeroCanvas(true);

  // ---------------------------------------------------------------- section headings (split chars)
  $$('.section [data-split]').forEach(function (el) {
    gsap.from($$('.c', el), {
      yPercent: 115,
      duration: 1.2,
      ease: 'expo.out',
      stagger: 0.025,
      scrollTrigger: { trigger: el, start: 'top 88%' }
    });
  });

  // ---------------------------------------------------------------- generic reveals
  $$('.reveal').forEach(function (el) {
    if (el.closest('.hero')) { gsap.set(el, { opacity: 1, y: 0 }); return; }
    gsap.to(el, {
      opacity: 1, y: 0, duration: 1.2, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 90%' }
    });
  });

  // ---------------------------------------------------------------- about statement: words light up while scrolling
  $$('[data-words]').forEach(function (el) {
    gsap.fromTo($$('.word', el), { opacity: 0.14 }, {
      opacity: 1,
      stagger: 0.1,
      ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true }
    });
  });

  // ---------------------------------------------------------------- marquee (scroll-velocity reactive)
  var track = $('.marquee__track');
  if (track) {
    Array.prototype.slice.call(track.children).forEach(function (n) { track.appendChild(n.cloneNode(true)); });
    var x = 0;
    var dir = -1;
    var boost = 0;
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: function (self) {
        dir = self.direction === 1 ? -1 : 1;
        boost = Math.min(Math.abs(self.getVelocity()) / 120, 14);
      }
    });
    gsap.ticker.add(function (t, dt) {
      var half = track.scrollWidth / 2;
      boost *= 0.94;
      x += dir * (0.6 + boost) * (dt / 16.67);
      if (x <= -half) x += half;
      if (x > 0) x -= half;
      track.style.transform = 'translate3d(' + x + 'px,0,0)';
    });
  }

  // ---------------------------------------------------------------- projects: stacked cards
  var mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', function () {
    var projects = $$('.project');
    projects.forEach(function (project, i) {
      var inner = $('.project__inner', project);
      var next = projects[i + 1];
      if (next) {
        gsap.to(inner, {
          scale: 0.9 - (projects.length - i - 2) * 0.02,
          filter: 'brightness(0.55)',
          ease: 'none',
          scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 15%', scrub: true }
        });
      }
      gsap.fromTo($('.project__media img', project), { yPercent: -6 }, {
        yPercent: 4, ease: 'none',
        scrollTrigger: { trigger: project, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  });
  $$('.project').forEach(function (project) {
    gsap.from($$('.project__info > *', project), {
      y: 30, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.07,
      scrollTrigger: { trigger: project, start: 'top 75%' }
    });
  });

  // ---------------------------------------------------------------- experience rows
  $$('.xp__row').forEach(function (row) {
    gsap.from(row, {
      y: 60, opacity: 0, duration: 1.1, ease: 'expo.out',
      scrollTrigger: { trigger: row, start: 'top 92%' }
    });
  });

  // ---------------------------------------------------------------- tools
  gsap.from('.tool-grid li', {
    y: 60, opacity: 0, scale: 0.94, duration: 1, ease: 'expo.out', stagger: { each: 0.06, grid: 'auto', from: 'start' },
    scrollTrigger: { trigger: '.tool-grid', start: 'top 85%' }
  });

  // ---------------------------------------------------------------- contact + footer
  gsap.from('.contact__dot', {
    scale: 0, duration: 1.2, ease: 'elastic.out(1, 0.4)',
    scrollTrigger: { trigger: '.contact__title', start: 'top 70%' }
  });
  gsap.from('.footer__word > *', {
    yPercent: 100, duration: 1.4, ease: 'expo.out', stagger: 0.1,
    scrollTrigger: { trigger: '.footer', start: 'top 95%' }
  });

  // ---------------------------------------------------------------- cursor + magnetic
  if (finePointer) {
    initCursor();
    initMagnetic();
  }

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });

  // ================================================================= helpers

  function countUp(el) {
    var end = parseInt(el.getAttribute('data-counter'), 10);
    var o = { v: 0 };
    gsap.to(o, {
      v: end, duration: 2, ease: 'power3.out',
      onUpdate: function () { el.textContent = Math.round(o.v); }
    });
  }

  function initCursor() {
    var cursor = $('.cursor');
    var label = $('.cursor__label');
    var xTo = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3.out' });
    var yTo = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3.out' });

    window.addEventListener('pointermove', function (e) {
      cursor.classList.add('is-visible');
      xTo(e.clientX);
      yTo(e.clientY);
    }, { passive: true });
    document.addEventListener('pointerleave', function () { cursor.classList.remove('is-visible'); });

    document.addEventListener('pointerover', function (e) {
      var labelled = e.target.closest('[data-cursor]');
      var link = e.target.closest('a, button, label, input, textarea');
      cursor.classList.toggle('is-label', !!labelled);
      cursor.classList.toggle('is-link', !labelled && !!link);
      label.textContent = labelled ? labelled.getAttribute('data-cursor') : '';
    });
  }

  function initMagnetic() {
    $$('[data-magnetic]').forEach(function (el) {
      var strength = el.classList.contains('tool') ? 0.12 : 0.3;
      var xTo = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });
      var yTo = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * strength);
        yTo((e.clientY - (r.top + r.height / 2)) * strength);
      });
      el.addEventListener('pointerleave', function () { xTo(0); yTo(0); });
    });
  }

  // Interactive dot field: dots swell and warm up around the pointer,
  // with a slow ambient ripple so it stays alive on touch devices.
  function initHeroCanvas(animate) {
    var canvas = $('.hero__canvas');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var hero = $('.hero');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var gap = 30;
    var w = 0, h = 0, cols = 0, rows = 0;
    var mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
    var running = false;
    var raf = 0;
    var start = performance.now();

    function resize() {
      var r = hero.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      gap = w < 700 ? 24 : 30;
      cols = Math.ceil(w / gap) + 1;
      rows = Math.ceil(h / gap) + 1;
      if (!running) draw(performance.now());
    }

    function colors() {
      var cs = getComputedStyle(root);
      return { dot: cs.getPropertyValue('--dot').trim().split(/\s+/).map(Number), accent: [255, 106, 31] };
    }
    var palette = colors();
    new MutationObserver(function () { palette = colors(); if (!running) draw(performance.now()); })
      .observe(root, { attributes: true, attributeFilter: ['data-theme'] });

    function draw(now) {
      var t = (now - start) / 1000;
      mouse.x += (mouse.tx - mouse.x) * 0.12;
      mouse.y += (mouse.ty - mouse.y) * 0.12;
      ctx.clearRect(0, 0, w, h);
      var radius = Math.max(140, w * 0.14);
      var d = palette.dot, a = palette.accent;
      for (var i = 0; i < cols; i++) {
        for (var j = 0; j < rows; j++) {
          var x = i * gap + (j % 2 ? gap / 2 : 0);
          var y = j * gap;
          var dx = x - mouse.x, dy = y - mouse.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          var f = Math.max(0, 1 - dist / radius);
          f = f * f * (3 - 2 * f);
          var wave = animate ? (Math.sin(i * 0.35 + j * 0.25 - t * 1.4) + 1) / 2 : 0.5;
          var push = f * 14;
          var px = dist > 0 ? x + (dx / dist) * push : x;
          var py = dist > 0 ? y + (dy / dist) * push : y;
          var size = 0.7 + wave * 0.45 + f * 2.2;
          var alpha = 0.1 + wave * 0.1 + f * 0.75;
          var r = Math.round(d[0] + (a[0] - d[0]) * f);
          var g = Math.round(d[1] + (a[1] - d[1]) * f);
          var b = Math.round(d[2] + (a[2] - d[2]) * f);
          ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + alpha.toFixed(3) + ')';
          ctx.beginPath();
          ctx.arc(px, py, size, 0, 6.2832);
          ctx.fill();
        }
      }
    }

    function loop(now) {
      draw(now);
      raf = requestAnimationFrame(loop);
    }

    window.addEventListener('resize', resize);
    resize();

    if (!animate) return;

    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      mouse.tx = e.clientX - r.left;
      mouse.ty = e.clientY - r.top;
      if (mouse.x < -5000) { mouse.x = mouse.tx; mouse.y = mouse.ty; }
    }, { passive: true });
    hero.addEventListener('pointerleave', function () { mouse.tx = -9999; mouse.ty = -9999; mouse.x = -9999; mouse.y = -9999; });

    new IntersectionObserver(function (entries) {
      var visible = entries[0].isIntersecting;
      if (visible && !running) { running = true; raf = requestAnimationFrame(loop); }
      if (!visible && running) { running = false; cancelAnimationFrame(raf); }
    }).observe(hero);
  }

  // Static hosting: the form composes an email in the visitor's mail client.
  function initForm() {
    var form = $('#contact-form');
    if (!form) return;
    var note = $('.form__note', form);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      ['name', 'email', 'message'].forEach(function (n) {
        var field = form.elements[n];
        var valid = field.value.trim() !== '' && field.checkValidity();
        field.closest('.field').classList.toggle('is-invalid', !valid);
        if (!valid) ok = false;
      });
      if (!ok) { note.textContent = 'Please fill in your name, a valid email and a message.'; return; }
      var budget = form.querySelector('input[name="budget"]:checked');
      var body = form.elements.message.value.trim() +
        '\n\n— ' + form.elements.name.value.trim() + ' (' + form.elements.email.value.trim() + ')' +
        (budget ? '\nBudget: ' + budget.value : '');
      window.location.href = 'mailto:romaric.vissou@gmail.com?subject=' +
        encodeURIComponent('New project — ' + form.elements.name.value.trim()) +
        '&body=' + encodeURIComponent(body);
      note.textContent = 'Opening your mail app…';
    });
  }
})();
