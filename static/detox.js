/* DETOX project page: motion graphics and animated charts.
   Schematic animations illustrate the mechanism; charts use the manuscript numbers;
   the UR5e chart plots recorded gripper telemetry (static/data/ur5e_traces.js). */
(function () {
  'use strict';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  const C = {
    ink: '#10141b', body: '#3b434e', muted: '#69717c', faint: '#8b939e', line: 'rgba(16,20,27,.12)',
    blue: '#3f5876', blueL: '#778daa', coral: '#e68670', coralD: '#c9644d', peach: '#f7d8ca',
    night: '#111720', nightR: '#18202b', nInk: '#f2f4f7', nBody: '#c9d1dc', nMuted: '#9aa6b5', nLine: '#263140',
    nBlue: '#97aecc', nCoral: '#f09a82', slate: '#8b939e', paperS: '#eef1f3'
  };

  /* ---------- helpers ---------- */
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (tag === 'path' && !(attrs && 'fill' in attrs)) e.setAttribute('fill', 'none');
    if (attrs) for (const k in attrs) {
      if (k === 'text') e.textContent = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    if (parent) parent.appendChild(e);
    return e;
  }
  function set(e, attrs) { for (const k in attrs) { if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); } return e; }
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const ease = t => 1 - Math.pow(1 - t, 4);              // ease-out (brand: precise start, soft landing)
  const easeIO = t => t < .5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function gradient(svg, id, stops, x2) {
    let defs = svg.querySelector('defs') || el('defs', null, svg);
    const g = el('linearGradient', { id, x1: '0', y1: '0', x2: x2 || '1', y2: '0' }, defs);
    stops.forEach(([o, c]) => el('stop', { offset: o, 'stop-color': c }, g));
    return 'url(#' + id + ')';
  }

  /* Player: runs render(t) only while the element is on screen; loops or stops at the end. */
  function player(target, dur, render, opts) {
    opts = opts || {};
    let t = 0, last = null, raf = null, visible = false, finished = false;
    function frame(ts) {
      if (last === null) last = ts;
      const dt = Math.min(0.1, (ts - last) / 1000); last = ts;
      t += dt * (opts.speed || 1);
      if (opts.loop) { if (t > dur) t -= dur; }
      else if (t >= dur) { t = dur; render(t); finished = true; raf = null; return; }
      render(t);
      raf = requestAnimationFrame(frame);
    }
    function run() { if (RM) { render(opts.loop ? (opts.still != null ? opts.still : dur) : dur); return; } if (!raf && !finished && visible) { last = null; raf = requestAnimationFrame(frame); } }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = null; }
    const io = new IntersectionObserver(es => { es.forEach(e => { visible = e.isIntersecting; visible ? run() : stop(); }); }, { threshold: 0.15 });
    io.observe(target);
    render(RM ? (opts.loop ? (opts.still != null ? opts.still : dur) : dur) : 0);
    return { replay() { stop(); t = 0; finished = false; render(0); run(); if (!visible && !RM) render(0); }, get t() { return t; } };
  }
  function onSeg(id, cb) {
    const g = document.getElementById(id); if (!g) return;
    g.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      g.querySelectorAll('button').forEach(x => x.classList.remove('on'));
      b.classList.add('on'); cb(b.dataset);
    }));
  }

  /* ---------- page chrome ---------- */
  (function () {
    const bar = document.getElementById('progress');
    if (bar) {
      const upd = () => { const h = document.documentElement; bar.style.transform = 'scaleX(' + (h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)) + ')'; };
      addEventListener('scroll', upd, { passive: true }); upd();
    }
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || RM) { els.forEach(e => e.classList.add('in')); }
    else {
      const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      els.forEach((e, i) => { e.style.transitionDelay = (i % 2 ? 120 : 0) + 'ms'; io.observe(e); });
    }
    // count-up numbers in the stat band
    const nums = document.querySelectorAll('[data-count]');
    const cio = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return; cio.unobserve(e.target);
      const n = e.target, to = parseFloat(n.dataset.count), dec = +(n.dataset.dec || 0);
      if (RM) return;
      const t0 = performance.now(), D = 1200;
      (function step(now) { const k = ease(clamp((now - t0) / D, 0, 1)); n.textContent = (to * k).toFixed(dec); if (k < 1) requestAnimationFrame(step); })(t0);
    }), { threshold: 0.4 });
    nums.forEach(n => cio.observe(n));
    const cb = document.getElementById('copy-bib');
    if (cb) cb.addEventListener('click', () => navigator.clipboard.writeText(document.getElementById('bibtex-text').innerText).then(() => { cb.textContent = 'Copied!'; setTimeout(() => cb.textContent = 'Copy', 1600); }));
  })();

  /* ---------- stat band: faint telemetry traces ---------- */
  (function () {
    const cv = document.getElementById('stat-canvas'); if (!cv) return;
    const ctx = cv.getContext('2d');
    let w, h, visible = false, raf;
    function size() { const r = cv.getBoundingClientRect(); w = cv.width = Math.round(r.width * devicePixelRatio); h = cv.height = Math.round(r.height * devicePixelRatio); }
    size(); addEventListener('resize', size);
    const lanes = [
      { y: .22, a: .05, f: 2.1, c: 'rgba(151,174,204,.35)' }, { y: .45, a: .07, f: 1.3, c: 'rgba(151,174,204,.22)' },
      { y: .68, a: .04, f: 3.2, c: 'rgba(151,174,204,.28)' }, { y: .86, a: .06, f: 1.7, c: 'rgba(240,154,130,.22)' }];
    function draw(t) {
      ctx.clearRect(0, 0, w, h); ctx.lineWidth = 1.2 * devicePixelRatio;
      lanes.forEach((L, i) => {
        ctx.strokeStyle = L.c; ctx.beginPath();
        for (let x = 0; x <= w; x += 6 * devicePixelRatio) {
          const u = x / w * 10 + t * .25 * (1 + i * .2);
          const y = h * L.y + h * L.a * (Math.sin(u * L.f) * .6 + Math.sin(u * L.f * 2.7 + i) * .3 + Math.sin(u * .7 + i * 2) * .4);
          x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      });
    }
    function loop(ts) { draw(ts / 1000); if (visible) raf = requestAnimationFrame(loop); }
    if (RM) { draw(0); return; }
    new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; if (visible) raf = requestAnimationFrame(loop); else cancelAnimationFrame(raf); })).observe(cv);
  })();

  /* ---------- shared drawing: gripper ---------- */
  // Returns an object with update({x,y,open,fingerColor}) for a two-finger gripper (open = half aperture, px).
  function makeGripper(parent, scale) {
    const s = scale || 1;
    const g = el('g', null, parent);
    const rod = el('rect', { x: -4 * s, y: -70 * s, width: 8 * s, height: 52 * s, rx: 2 * s, fill: '#c9d1dc' }, g);
    const palm = el('rect', { x: -44 * s, y: -20 * s, width: 88 * s, height: 10 * s, rx: 3 * s, fill: C.ink }, g);
    const fl = el('rect', { y: -12 * s, width: 7 * s, height: 44 * s, rx: 2 * s, fill: C.ink }, g);
    const fr = el('rect', { y: -12 * s, width: 7 * s, height: 44 * s, rx: 2 * s, fill: C.ink }, g);
    return {
      g, update(o) {
        g.setAttribute('transform', 'translate(' + o.x + ' ' + o.y + ')');
        set(fl, { x: (-o.open - 7) * s, fill: o.fc || C.ink });
        set(fr, { x: o.open * s, fill: o.fc || C.ink });
      }
    };
  }
  function ring(parent, color) {
    return el('circle', { r: 0, fill: 'none', stroke: color, 'stroke-width': 2, opacity: 0 }, parent);
  }
  function pulse(r, t, t0, cx, cy, maxR) {
    const k = seg(t, t0, t0 + 0.9);
    set(r, { cx, cy, r: 6 + k * maxR, opacity: k > 0 && k < 1 ? (1 - k) * .9 : 0 });
  }

  /* ---------- hero: carry, trigger, alarm, hold ---------- */
  (function () {
    const svg = document.getElementById('hero-svg'); if (!svg) return;
    const orb1 = el('g', { class: 'orbit' }, svg); el('ellipse', { cx: 280, cy: 250, rx: 255, ry: 120, stroke: C.blueL, 'stroke-opacity': .4, transform: 'rotate(-20 280 250)' }, orb1);
    const orb2 = el('g', { class: 'orbit slow' }, svg); el('ellipse', { cx: 280, cy: 250, rx: 215, ry: 72, stroke: C.blueL, 'stroke-opacity': .26, 'stroke-dasharray': '2 6', transform: 'rotate(16 280 250)' }, orb2);
    // table
    el('line', { x1: 60, y1: 352, x2: 500, y2: 352, stroke: C.ink, 'stroke-opacity': .22, 'stroke-width': 1.5 }, svg);
    for (let i = 0; i < 12; i++) el('line', { x1: 70 + i * 38, y1: 352, x2: 60 + i * 38, y2: 362, stroke: C.ink, 'stroke-opacity': .12 }, svg);
    // command chip (VLA proposes a_t)
    const chip = el('g', null, svg);
    const chipR = el('rect', { x: 40, y: 34, width: 196, height: 34, rx: 17, fill: 'rgba(255,255,255,.7)', stroke: C.line }, chip);
    el('text', { x: 58, y: 56, 'font-size': 11, 'font-family': 'Geist Mono, monospace', fill: C.muted, text: 'VLA aₜ' }, chip);
    const chipT = el('text', { x: 108, y: 56, 'font-size': 12.5, 'font-weight': 600, fill: C.ink, text: 'move →' }, chip);
    const gateG = el('g', null, svg);
    const gateR = el('rect', { x: 330, y: 34, width: 190, height: 34, rx: 17, fill: 'rgba(255,255,255,.7)', stroke: C.line }, gateG);
    el('text', { x: 348, y: 56, 'font-size': 11, 'font-family': 'Geist Mono, monospace', fill: C.muted, text: 'DETOX uₜ' }, gateG);
    const gateT = el('text', { x: 432, y: 56, 'font-size': 12.5, 'font-weight': 600, fill: C.ink, text: 'pass' }, gateG);
    const link = el('path', { d: 'M236 51 H330', stroke: C.faint, 'stroke-width': 1.5, 'stroke-dasharray': '3 4' }, svg);
    // object + gripper
    const box = el('rect', { width: 40, height: 40, rx: 6, fill: C.peach, stroke: C.coralD, 'stroke-width': 1.5 }, svg);
    const grip = makeGripper(svg, 1);
    const r1 = ring(svg, C.blue), r2 = ring(svg, C.blue);
    const holdTag = el('g', { opacity: 0 }, svg);
    el('rect', { x: -38, y: -14, width: 76, height: 26, rx: 13, fill: C.blue }, holdTag);
    el('text', { x: 0, y: 4, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: '#fff', 'letter-spacing': '.08em', text: 'HOLD' }, holdTag);
    // score sparkline
    const sx0 = 70, sx1 = 490, sy0 = 470, sy1 = 392, q = 0.62;
    el('text', { x: sx0, y: 386, 'font-size': 10.5, 'font-family': 'Geist Mono, monospace', fill: C.muted, 'letter-spacing': '.08em', text: 'SCORE sₜ' }, svg);
    el('line', { x1: sx0, y1: lerp(sy0, sy1, q), x2: sx1, y2: lerp(sy0, sy1, q), stroke: C.muted, 'stroke-dasharray': '4 4', 'stroke-width': 1.2 }, svg);
    el('text', { x: sx1, y: lerp(sy0, sy1, q) - 6, 'text-anchor': 'end', 'font-size': 10.5, 'font-family': 'Geist Mono, monospace', fill: C.muted, text: 'qₑ' }, svg);
    el('line', { x1: sx0, y1: sy0, x2: sx1, y2: sy0, stroke: C.line }, svg);
    const spark = el('path', { stroke: C.blue, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
    const alarmL = el('line', { y1: sy1 - 4, y2: sy0, stroke: C.blue, 'stroke-width': 1.2, opacity: 0 }, svg);
    const alarmT = el('text', { y: sy1 - 8, 'font-size': 10.5, 'font-family': 'Geist Mono, monospace', fill: C.blue, opacity: 0, text: 'alarm' }, svg);
    const onsetL = el('line', { y1: sy1 - 4, y2: sy0, stroke: C.coralD, 'stroke-width': 1.2, 'stroke-dasharray': '2 3', opacity: 0 }, svg);
    const onsetT = el('text', { y: sy1 - 8, 'font-size': 10.5, 'font-family': 'Geist Mono, monospace', fill: C.coralD, opacity: 0, text: 'onset' }, svg);
    const noise = mulberry(7); const nz = Array.from({ length: 200 }, () => noise());
    const D = 7.5, tTrig = 1.8, tAlarm = 2.35, tOnset = 2.9;
    const sOf = t => {
      const i = Math.floor(t / D * 199);
      let base = .16 + .08 * nz[i] + .05 * Math.sin(t * 5);
      if (t > tTrig) base += 1.1 * ease(seg(t, tTrig, tTrig + .9));
      return Math.min(base, .95);
    };
    function render(t) {
      const fade = 1 - seg(t, D - .5, D);
      svg.style.opacity = '';
      const tStop = tAlarm;
      // carry path: from x=130 to x=420, stops at the alarm
      const xMove = t < tStop ? lerp(130, 420, ease(seg(t, 0.2, 4.2))) : lerp(130, 420, ease(seg(tStop, 0.2, 4.2)));
      const y = 190;
      // finger: closed=20, opens after the trigger, re-closes after the alarm
      let open = 20;
      const opening = seg(t, tTrig + .15, tTrig + .9);
      if (t < tAlarm) open = 20 + 14 * opening;
      else { const o0 = 20 + 14 * seg(tAlarm, tTrig + .15, tTrig + .9); open = lerp(o0, 20, ease(seg(t, tAlarm + .05, tAlarm + .45))); }
      const fc = t > tTrig + .1 && t < tAlarm + .3 ? C.coralD : C.ink;
      grip.update({ x: xMove, y, open, fc });
      // object sags slightly while fingers are open, is regripped after the hold
      const sag = Math.max(0, open - 20) * .55;
      set(box, { x: xMove - 20, y: y - 10 + sag });
      // chips
      const attacked = t > tTrig && t < D - .3;
      set(chipT, { text: attacked ? 'open gripper' : 'move →', fill: attacked ? C.coralD : C.ink });
      set(chipR, { stroke: attacked ? C.coral : C.line, fill: attacked ? 'rgba(247,216,202,.55)' : 'rgba(255,255,255,.7)' });
      const held = t >= tAlarm && t < D - .3;
      set(gateT, { text: held ? 'hold' : 'pass', fill: held ? C.blue : C.ink });
      set(gateR, { stroke: held ? C.blue : C.line, fill: held ? 'rgba(63,88,118,.10)' : 'rgba(255,255,255,.7)' });
      set(link, { stroke: attacked ? C.coral : C.faint });
      pulse(r1, t, tAlarm, xMove, y + 10, 70); pulse(r2, t, tAlarm + .35, xMove, y + 10, 70);
      holdTag.setAttribute('transform', 'translate(' + xMove + ' ' + (y - 98) + ')');
      holdTag.setAttribute('opacity', held ? ease(seg(t, tAlarm, tAlarm + .3)) : 0);
      // spark
      const tt = Math.min(t, D - .5); let d = '';
      for (let k = 0; k <= 120; k++) { const u = k / 120 * tt; const x = lerp(sx0, sx1, u / (D - .5)); const v = sOf(u); d += (k ? 'L' : 'M') + x.toFixed(1) + ' ' + lerp(sy0, sy1, v).toFixed(1); }
      spark.setAttribute('d', d);
      const ax = lerp(sx0, sx1, tAlarm / (D - .5)), ox = lerp(sx0, sx1, tOnset / (D - .5));
      const showA = t >= tAlarm ? 1 : 0, showO = t >= tOnset ? 1 : 0;
      set(alarmL, { x1: ax, x2: ax, opacity: showA }); set(alarmT, { x: ax + 4, opacity: showA });
      set(onsetL, { x1: ox, x2: ox, opacity: showO * .9 }); set(onsetT, { x: ox + 4, opacity: showO, text: 'onset avoided' });
      svg.style.opacity = fade < 1 ? fade.toFixed(3) : '';
    }
    player(svg, D, render, { loop: true, still: 5 });
  })();

  /* ---------- 01: detection vs prevention timeline ---------- */
  (function () {
    const svg = document.getElementById('gap-svg'); if (!svg) return;
    const X0 = 230, X1 = 960, tTrig = .14, tAlarm = .40, tOnset = .52, tDetect = .66;
    const X = f => lerp(X0, X1, f);
    const rows = [
      { y: 70, name: 'No defense', sub: 'attacked policy runs on', alarm: null, kept: false },
      { y: 150, name: 'Attack detector', sub: 'flags the episode', alarm: tDetect, kept: false },
      { y: 230, name: 'DETOX', sub: 'alarm → hold', alarm: tAlarm, kept: true }];
    // axis markers
    [[tTrig, 'trigger', C.coralD], [tOnset, 'harm onset', C.coralD]].forEach(([f, lab, c]) => {
      el('line', { x1: X(f), x2: X(f), y1: 30, y2: 268, stroke: c, 'stroke-dasharray': '3 4', 'stroke-opacity': .7 }, svg);
      el('text', { x: X(f), y: 22, 'text-anchor': 'middle', 'font-size': 12, 'font-family': 'Geist Mono, monospace', fill: c, text: lab }, svg);
    });
    el('text', { x: X1, y: 292, 'text-anchor': 'end', 'font-size': 11, 'font-family': 'Geist Mono, monospace', fill: C.muted, text: 'time →' }, svg);
    const head = el('line', { y1: 34, y2: 268, stroke: C.ink, 'stroke-width': 1.5, 'stroke-opacity': .5 }, svg);
    const R = rows.map((r, i) => {
      el('text', { x: 20, y: r.y - 4, 'font-size': 16, 'font-weight': 600, fill: i === 2 ? C.blue : C.ink, text: r.name }, svg);
      el('text', { x: 20, y: r.y + 16, 'font-size': 12.5, fill: C.muted, text: r.sub }, svg);
      el('line', { x1: X0, x2: X1, y1: r.y, y2: r.y, stroke: C.line, 'stroke-width': 6, 'stroke-linecap': 'round' }, svg);
      const prog = el('line', { x1: X0, y1: r.y, y2: r.y, stroke: i === 2 ? C.blue : C.coral, 'stroke-width': 6, 'stroke-linecap': 'round' }, svg);
      const holdBar = el('line', { y1: r.y, y2: r.y, stroke: C.blue, 'stroke-width': 6, 'stroke-linecap': 'round', opacity: 0 }, svg);
      const mk = r.alarm ? el('g', { opacity: 0 }, svg) : null;
      if (mk) {
        el('circle', { cx: X(r.alarm), cy: r.y, r: 9, fill: '#fff', stroke: i === 2 ? C.blue : C.slate, 'stroke-width': 2.5 }, mk);
        el('text', { x: X(r.alarm), y: r.y - 16, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 600, fill: i === 2 ? C.blue : C.muted, text: i === 2 ? 'alarm, hold' : 'attack detected' }, mk);
      }
      const rg = ring(svg, i === 2 ? C.blue : C.slate);
      // mini gripper with object at the end of the row
      const icon = el('g', { transform: 'translate(' + (X1 + 70) + ' ' + (r.y - 30) + ')' }, svg);
      const obj = el('rect', { x: -9, y: 22, width: 18, height: 18, rx: 3, fill: C.peach, stroke: C.coralD }, icon);
      const fl = el('rect', { y: 14, width: 4, height: 22, rx: 1.5, fill: C.ink }, icon);
      const fr = el('rect', { y: 14, width: 4, height: 22, rx: 1.5, fill: C.ink }, icon);
      el('rect', { x: -18, y: 10, width: 36, height: 5, rx: 2, fill: C.ink }, icon);
      const res = el('text', { x: X1, y: r.y + 26, 'text-anchor': 'end', 'font-size': 13, 'font-weight': 600, opacity: 0, fill: r.kept ? C.blue : C.coralD, text: r.kept ? 'object kept' : (i === 1 ? 'flagged, but dropped' : 'object dropped') }, svg);
      return { r, prog, holdBar, mk, rg, obj, fl, fr, res, i };
    });
    const D = 6;
    function render(t) {
      const f = clamp(t / 5, 0, 1);
      set(head, { x1: X(f), x2: X(f) });
      R.forEach(o => {
        const stop = o.r.kept ? tAlarm : 2;
        set(o.prog, { x2: X(Math.min(f, stop)), stroke: o.i === 2 ? C.coral : C.coral, opacity: f > tTrig ? 1 : .35 });
        set(o.prog, { stroke: f < tTrig ? C.slate : C.coral });
        if (o.r.kept) set(o.holdBar, { x1: X(tAlarm), x2: X(Math.max(tAlarm, f)), opacity: f > tAlarm ? 1 : 0 });
        if (o.mk) o.mk.setAttribute('opacity', f >= o.r.alarm ? 1 : 0);
        if (o.r.alarm) pulse(o.rg, f * 5, o.r.alarm * 5, X(o.r.alarm), o.r.y, 30);
        // fingers open after trigger; DETOX re-closes them; others drop the object at onset
        let open = 9;
        if (f > tTrig + .04) open = 9 + 7 * ease(seg(f, tTrig + .04, tOnset));
        if (o.r.kept && f > tAlarm) open = lerp(9 + 7 * ease(seg(tAlarm, tTrig + .04, tOnset)), 9, ease(seg(f, tAlarm, tAlarm + .06)));
        set(o.fl, { x: -open - 4 }); set(o.fr, { x: open });
        const fall = o.r.kept ? 0 : 26 * Math.pow(seg(f, tOnset, tOnset + .1), 2);
        set(o.obj, { y: 22 + fall });
        o.res.setAttribute('opacity', f > (o.r.kept ? tOnset : tOnset + .12) ? ease(seg(f, tOnset, tOnset + .15)) : 0);
      });
    }
    const p = player(svg, D, render);
    const rb = document.getElementById('gap-replay'); if (rb) rb.addEventListener('click', () => p.replay());
  })();

  /* ---------- 02: trust boundary ---------- */
  (function () {
    const svg = document.getElementById('trust-svg'); if (!svg) return;
    let mode = 'attack';
    const mono = 'Geist Mono, monospace';
    // zones
    el('rect', { x: 20, y: 30, width: 390, height: 270, rx: 18, fill: 'rgba(240,154,130,.05)', stroke: C.nCoral, 'stroke-opacity': .55, 'stroke-dasharray': '6 6' }, svg);
    el('text', { x: 40, y: 56, 'font-size': 11.5, 'font-family': mono, fill: C.nCoral, 'letter-spacing': '.14em', text: 'ATTACKER CONTROLS' }, svg);
    el('rect', { x: 440, y: 30, width: 640, height: 385, rx: 18, fill: 'rgba(151,174,204,.04)', stroke: C.nBlue, 'stroke-opacity': .5, 'stroke-dasharray': '6 6' }, svg);
    el('text', { x: 460, y: 56, 'font-size': 11.5, 'font-family': mono, fill: C.nBlue, 'letter-spacing': '.14em', text: 'OWNER CONTROLS' }, svg);
    // attacker inputs
    const inputs = ['weights', 'camera image', 'instruction'].map((lab, i) => {
      const g = el('g', null, svg);
      const r = el('rect', { x: 40, y: 84 + i * 66, width: 150, height: 42, rx: 21, fill: C.nightR, stroke: C.nLine }, g);
      el('text', { x: 115, y: 110 + i * 66, 'text-anchor': 'middle', 'font-size': 14, fill: C.nBody, text: lab }, g);
      el('path', { d: 'M190 ' + (105 + i * 66) + ' C 215 ' + (105 + i * 66) + ', 215 175, 240 175', stroke: C.nLine, 'stroke-width': 1.5 }, svg);
      return r;
    });
    const vla = el('rect', { x: 240, y: 125, width: 150, height: 100, rx: 14, fill: C.nightR, stroke: C.nLine, 'stroke-width': 1.5 }, svg);
    el('text', { x: 315, y: 170, 'text-anchor': 'middle', 'font-size': 17, 'font-weight': 600, fill: C.nInk, text: 'VLA policy' }, svg);
    el('text', { x: 315, y: 194, 'text-anchor': 'middle', 'font-size': 12, 'font-family': mono, fill: C.nMuted, text: 'proposes aₜ' }, svg);
    // gate
    const gate = el('rect', { x: 520, y: 115, width: 200, height: 120, rx: 16, fill: C.nightR, stroke: C.nBlue, 'stroke-width': 1.8 }, svg);
    el('text', { x: 540, y: 142, 'font-size': 12, 'font-family': mono, fill: C.nBlue, 'letter-spacing': '.12em', text: 'DETOX GATE' }, svg);
    const gateTxt = el('text', { x: 620, y: 190, 'text-anchor': 'middle', 'font-size': 26, 'font-weight': 600, fill: C.nInk, text: 'pass' }, svg);
    const gateSub = el('text', { x: 620, y: 215, 'text-anchor': 'middle', 'font-size': 12, 'font-family': mono, fill: C.nMuted, text: 'uₜ = aₜ' }, svg);
    // robot
    el('rect', { x: 880, y: 105, width: 170, height: 140, rx: 16, fill: C.nightR, stroke: C.nLine, 'stroke-width': 1.5 }, svg);
    el('text', { x: 900, y: 134, 'font-size': 17, 'font-weight': 600, fill: C.nInk, text: 'Robot' }, svg);
    const arm = el('g', { transform: 'translate(965 228)' }, svg);
    el('rect', { x: -26, y: -4, width: 52, height: 8, rx: 3, fill: C.nMuted }, arm);
    const l1 = el('g', null, arm);
    el('line', { x1: 0, y1: 0, x2: 0, y2: -48, stroke: C.nBody, 'stroke-width': 7, 'stroke-linecap': 'round' }, l1);
    const l2 = el('g', { transform: 'translate(0 -48)' }, l1);
    el('line', { x1: 0, y1: 0, x2: 42, y2: 0, stroke: C.nBody, 'stroke-width': 6, 'stroke-linecap': 'round' }, l2);
    el('circle', { cx: 0, cy: 0, r: 5, fill: C.nightR, stroke: C.nBody, 'stroke-width': 2 }, l2);
    // command wires
    el('line', { x1: 390, y1: 175, x2: 520, y2: 175, stroke: C.nLine, 'stroke-width': 2 }, svg);
    el('line', { x1: 720, y1: 175, x2: 880, y2: 175, stroke: C.nLine, 'stroke-width': 2 }, svg);
    el('text', { x: 455, y: 165, 'text-anchor': 'middle', 'font-size': 13, 'font-family': mono, fill: C.nMuted, text: 'aₜ' }, svg);
    el('text', { x: 800, y: 165, 'text-anchor': 'middle', 'font-size': 13, 'font-family': mono, fill: C.nMuted, text: 'uₜ' }, svg);
    // telemetry loop
    const telPath = 'M965 245 V 300 H 620 V 235';
    el('path', { d: telPath, stroke: C.nBlue, 'stroke-opacity': .45, 'stroke-width': 1.6, 'stroke-dasharray': '5 5' }, svg);
    el('text', { x: 792, y: 292, 'text-anchor': 'middle', 'font-size': 12.5, 'font-family': mono, fill: C.nBlue, text: 'trusted telemetry yₜ · gripper, wrist F/T, joints' }, svg);
    // score chart
    const gx0 = 470, gx1 = 1050, gy0 = 395, gy1 = 325, q = .7;
    el('text', { x: gx0, y: 318, 'font-size': 11, 'font-family': mono, fill: C.nMuted, 'letter-spacing': '.1em', text: 'SCORE sₜ' }, svg);
    el('line', { x1: gx0, x2: gx1, y1: gy0, y2: gy0, stroke: C.nLine }, svg);
    el('line', { x1: gx0, x2: gx1, y1: lerp(gy0, gy1, q), y2: lerp(gy0, gy1, q), stroke: C.nMuted, 'stroke-dasharray': '4 4' }, svg);
    el('text', { x: gx1, y: lerp(gy0, gy1, q) - 5, 'text-anchor': 'end', 'font-size': 11, 'font-family': mono, fill: C.nMuted, text: 'qₑ' }, svg);
    const sc = el('path', { stroke: C.nBlue, 'stroke-width': 2, 'stroke-linejoin': 'round' }, svg);
    const alarmMk = el('g', { opacity: 0 }, svg);
    const alarmLine = el('line', { y1: gy1 - 4, y2: gy0, stroke: C.nBlue, 'stroke-width': 1.3 }, alarmMk);
    const alarmTx = el('text', { y: gy1 - 8, 'font-size': 11, 'font-family': mono, fill: C.nBlue, text: 'alarm latched' }, alarmMk);
    // packets
    const N = 6;
    const cmd = Array.from({ length: N }, () => el('circle', { r: 6, fill: C.nBody }, svg));
    const out = Array.from({ length: N }, () => el('rect', { width: 12, height: 12, rx: 3, fill: C.nBody }, svg));
    const tel = Array.from({ length: N }, () => el('circle', { r: 4.5, fill: C.nBlue }, svg));
    const gr = ring(svg, C.nBlue);
    const telP = el('path', { d: telPath, fill: 'none', stroke: 'none' }, svg); const telLen = telP.getTotalLength();
    const noise = mulberry(3); const nz = Array.from({ length: 300 }, () => noise());
    const D = 10, tA = 2.6, tT = 3.6, tAl = 4.6;
    function score(t) {
      const i = Math.floor(clamp(t / D, 0, 1) * 299);
      let s = .22 + .12 * nz[i];
      if (mode === 'attack' && t > tT - .3) s += .75 * ease(seg(t, tT - .3, tAl + .4));
      return Math.min(s, .97);
    }
    function render(t) {
      const atk = mode === 'attack';
      const hostile = atk && t > tA;
      const held = atk && t > tAl;
      inputs.forEach((r, i) => set(r, { stroke: hostile && i !== 1 ? C.nCoral : (hostile ? 'rgba(240,154,130,.45)' : C.nLine) }));
      set(vla, { stroke: hostile ? C.nCoral : C.nLine });
      for (let i = 0; i < N; i++) {
        const u = ((t * .55 + i / N) % 1);
        // proposed command packets: policy -> gate
        const x = lerp(395, 515, u);
        const birth = t - u / .55; const bad = atk && birth > tA - .4;
        set(cmd[i], { cx: x, cy: 175, fill: bad ? C.nCoral : C.nBody, opacity: u < .06 ? u / .06 : 1 });
        // executed command packets: gate -> robot (hold squares after the alarm)
        const x2 = lerp(725, 868, u);
        const b2 = t - u / .55;
        const isHold = atk && b2 > tAl;
        set(out[i], { x: x2 - 6, y: 169, fill: isHold ? C.nBlue : (atk && b2 > tA ? C.nCoral : C.nBody), opacity: u < .06 ? u / .06 : 1 });
        // telemetry packets
        const v = ((t * .32 + i / N) % 1);
        const pt = telP.getPointAtLength(v * telLen);
        const b3 = t - v / .32;
        set(tel[i], { cx: pt.x, cy: pt.y, fill: atk && b3 > tT && b3 < tAl + 1.2 ? C.nCoral : C.nBlue });
      }
      // arm motion: normal sway; faster swing when attacked; frozen during the hold
      const tm = held ? tAl : t;
      const sp = hostile ? 1 + 2.2 * seg(tm, tA, tT) : 1;
      const ang = Math.sin(tm * 1.4 * sp) * (hostile ? 26 : 14);
      l1.setAttribute('transform', 'rotate(' + (ang * .4).toFixed(2) + ')');
      l2.setAttribute('transform', 'translate(0 -48) rotate(' + (ang - 10).toFixed(2) + ')');
      set(gateTxt, { text: held ? 'HOLD' : 'pass', fill: held ? C.nBlue : C.nInk });
      set(gateSub, { text: held ? 'uₜ = hold' : 'uₜ = aₜ' });
      set(gate, { fill: held ? 'rgba(151,174,204,.12)' : C.nightR });
      if (atk) pulse(gr, t, tAl, 620, 175, 110); else gr.setAttribute('opacity', 0);
      let d = '';
      for (let k = 0; k <= 150; k++) { const u = k / 150 * t; d += (k ? 'L' : 'M') + lerp(gx0, gx1, u / D).toFixed(1) + ' ' + lerp(gy0, gy1, score(u)).toFixed(1); }
      sc.setAttribute('d', d);
      const ax = lerp(gx0, gx1, tAl / D);
      alarmMk.setAttribute('opacity', held ? 1 : 0); set(alarmLine, { x1: ax, x2: ax }); set(alarmTx, { x: ax + 6 });
    }
    const p = player(svg, D, render, { loop: true, still: 7 });
    onSeg('trust-mode', d => { mode = d.mode; p.replay(); });
    const rb = document.getElementById('trust-replay'); if (rb) rb.addEventListener('click', () => p.replay());
  })();

  /* ---------- 03: harm cards ---------- */
  (function () {
    const svgs = document.querySelectorAll('.harm-svg'); if (!svgs.length) return;
    let defended = true;
    const players = [];
    svgs.forEach(svg => {
      const kind = svg.dataset.kind;
      const card = svg.closest('.harm');
      const state = card.querySelector('.state'), stTxt = state.querySelector('.txt');
      function setState(cls, txt) { state.className = 'state ' + (cls || ''); stTxt.innerHTML = txt; }
      el('line', { x1: 14, y1: 172, x2: 306, y2: 172, stroke: C.ink, 'stroke-opacity': .25, 'stroke-width': 1.5 }, svg);
      const rg = ring(svg, C.blue), rg2 = ring(svg, C.blue);
      const D = 4.6;
      let render;
      if (kind === 'release') {
        const box = el('rect', { width: 26, height: 26, rx: 4, fill: C.peach, stroke: C.coralD, 'stroke-width': 1.3 }, svg);
        const g = makeGripper(svg, .62);
        render = t => {
          const tTrig = 1.4, tAl = 1.62;
          const stopX = defended ? lerp(70, 230, ease(seg(tAl, .1, 2.6))) : null;
          const x = defended && t > tAl ? stopX : lerp(70, 230, ease(seg(t, .1, 2.6)));
          const y = 74;
          let open = 13;
          const op = seg(t, tTrig, tTrig + .45);
          if (!defended || t < tAl) open = 13 + 12 * op;
          else open = lerp(13 + 12 * seg(tAl, tTrig, tTrig + .45), 13, ease(seg(t, tAl, tAl + .3)));
          g.update({ x, y, open, fc: t > tTrig && (!defended || t < tAl + .25) ? C.coralD : C.ink });
          // object: falls if not defended
          let by = y - 3, bx = x - 13, rot = 0;
          if (!defended && t > tTrig + .3) {
            const ft = t - (tTrig + .3); const xd = lerp(70, 230, ease(seg(tTrig + .3, .1, 2.6)));
            bx = xd - 13 + ft * 22; by = Math.min(172 - 26, y - 3 + 260 * ft * ft); rot = Math.min(1, ft * 2) * 18;
          } else if (defended) by = y - 3 + Math.max(0, open - 13) * .5;
          set(box, { x: bx, y: by, transform: 'rotate(' + rot + ' ' + (bx + 13) + ' ' + (by + 13) + ')' });
          if (defended) { pulse(rg, t, tAl, x, y + 10, 46); pulse(rg2, t, tAl + .3, x, y + 10, 46); }
          else { rg.setAttribute('opacity', 0); rg2.setAttribute('opacity', 0); }
          if (t < tTrig) setState('', 'carrying');
          else if (defended && t >= tAl) setState('good', '<b>alarm → hold</b> · grasp kept');
          else if (!defended && t > tTrig + .55) setState('bad', '<b>object dropped</b>');
          else setState('bad', 'opening command');
        };
      } else if (kind === 'contact') {
        const by = el('g', null, svg);
        el('rect', { x: 0, y: -66, width: 34, height: 66, rx: 4, fill: '#fff', stroke: C.body, 'stroke-width': 1.4 }, by);
        el('text', { x: 17, y: -28, 'text-anchor': 'middle', 'font-size': 9, 'font-family': 'Geist Mono, monospace', fill: C.muted, text: 'BY' }, by);
        const rod = el('line', { y1: 116, y2: 116, x1: 14, stroke: C.body, 'stroke-width': 9, 'stroke-linecap': 'round' }, svg);
        const tip = el('rect', { y: 104, width: 10, height: 24, rx: 2, fill: C.ink }, svg);
        // force meter
        el('text', { x: 20, y: 26, 'font-size': 9.5, 'font-family': 'Geist Mono, monospace', fill: C.muted, text: 'WRIST FORCE' }, svg);
        el('rect', { x: 20, y: 34, width: 120, height: 7, rx: 3.5, fill: 'rgba(16,20,27,.08)' }, svg);
        el('line', { x1: 20 + 120 * .62, x2: 20 + 120 * .62, y1: 30, y2: 45, stroke: C.muted, 'stroke-dasharray': '2 2' }, svg);
        const fbar = el('rect', { x: 20, y: 34, height: 7, rx: 3.5, fill: C.blueL }, svg);
        render = t => {
          const bx = 196, tCont = 1.5, tAl = 1.45;
          let x = lerp(60, 230, ease(seg(t, .15, 3.0)));
          if (defended && t > tAl) x = lerp(60, 230, ease(seg(tAl, .15, 3.0)));
          const tipX = Math.min(x, defended ? x : 1e9);
          set(rod, { x2: tipX }); set(tip, { x: tipX });
          // contact when tip reaches box face
          const pen = Math.max(0, tipX + 10 - bx);
          const ang = defended ? 0 : Math.min(78, pen * 2.4);
          by.setAttribute('transform', 'translate(' + (bx + Math.max(0, pen - ang * .15)) + ' 172) rotate(' + ang + ' 34 0)');
          const f = defended ? Math.min(.6, .1 + seg(t, .9, tAl) * .55) : clamp(.1 + seg(t, .9, 1.6) * .55 + pen / 30, 0, 1);
          set(fbar, { width: 120 * f, fill: f > .62 ? C.coral : C.blueL });
          if (defended) { pulse(rg, t, tAl, tipX + 5, 116, 40); pulse(rg2, t, tAl + .3, tipX + 5, 116, 40); }
          else { rg.setAttribute('opacity', 0); rg2.setAttribute('opacity', 0); }
          if (defended && t >= tAl) setState('good', '<b>alarm → hold</b> · push stopped');
          else if (!defended && pen > 10) setState('bad', '<b>bystander pushed over</b>');
          else setState('', 'approaching');
        };
      } else {
        const base = el('g', { transform: 'translate(96 172)' }, svg);
        el('rect', { x: -22, y: -6, width: 44, height: 8, rx: 3, fill: C.body }, base);
        const a1 = el('g', null, base);
        el('line', { x1: 0, y1: 0, x2: 0, y2: -70, stroke: C.body, 'stroke-width': 8, 'stroke-linecap': 'round' }, a1);
        const a2 = el('g', { transform: 'translate(0 -70)' }, a1);
        el('line', { x1: 0, y1: 0, x2: 62, y2: 0, stroke: C.body, 'stroke-width': 7, 'stroke-linecap': 'round' }, a2);
        el('circle', { r: 5.5, fill: '#fff', stroke: C.body, 'stroke-width': 2 }, a2);
        const eff = el('circle', { cx: 62, cy: 0, r: 6, fill: C.ink }, a2);
        const trail = el('path', { stroke: C.coral, 'stroke-width': 2, 'stroke-linecap': 'round', opacity: .6 }, svg);
        // speed gauge
        const gx = 250, gy = 92, gr = 40;
        el('path', { d: 'M' + (gx - gr) + ' ' + gy + ' A ' + gr + ' ' + gr + ' 0 0 1 ' + (gx + gr) + ' ' + gy, stroke: 'rgba(16,20,27,.12)', 'stroke-width': 7 }, svg);
        const lim = .7, la = Math.PI * (1 - lim);
        el('path', { d: 'M' + (gx + gr * Math.cos(la)) + ' ' + (gy - gr * Math.sin(la)) + ' A ' + gr + ' ' + gr + ' 0 0 1 ' + (gx + gr) + ' ' + gy, stroke: C.peach, 'stroke-width': 7 }, svg);
        el('text', { x: gx, y: gy + 18, 'text-anchor': 'middle', 'font-size': 9.5, 'font-family': 'Geist Mono, monospace', fill: C.muted, text: 'SPEED' }, svg);
        const needle = el('line', { x1: gx, y1: gy, stroke: C.ink, 'stroke-width': 2.2, 'stroke-linecap': 'round' }, svg);
        el('circle', { cx: gx, cy: gy, r: 3.5, fill: C.ink }, svg);
        const hist = [];
        render = t => {
          const tAl = 1.75;
          // phase angle: smooth sweep accelerating after t=1.2 (attack)
          const tt = defended && t > tAl ? tAl : t;
          const acc = seg(tt, 1.1, 2.4);
          const ph = tt * 1.6 + acc * acc * 4.5;
          const sp = .35 + .6 * acc + (defended && t > tAl ? -(seg(t, tAl, tAl + .4)) * (.35 + .6 * seg(tAl, 1.1, 2.4)) : 0);
          const ang = -25 + Math.sin(ph) * 38;
          a1.setAttribute('transform', 'rotate(' + (ang * .35).toFixed(2) + ')');
          a2.setAttribute('transform', 'translate(0 -70) rotate(' + ang.toFixed(2) + ')');
          const m = eff.getCTM && eff.getScreenCTM ? null : null;
          // trail via forward kinematics in svg coords
          const r1 = ang * .35 * Math.PI / 180, r2 = (ang * .35 + ang) * Math.PI / 180;
          const ex = 96 + Math.sin(r1) * 70 + Math.cos(r2) * 62, ey = 172 - Math.cos(r1) * 70 + Math.sin(r2) * 62;
          hist.push([ex, ey, t]); while (hist.length && t - hist[0][2] > .35) hist.shift();
          if (t < .02) hist.length = 0;
          set(trail, { d: hist.length > 1 ? 'M' + hist.map(h => h[0].toFixed(1) + ' ' + h[1].toFixed(1)).join('L') : '', stroke: sp > lim ? C.coral : C.blueL });
          const s = clamp(sp, 0, 1), na = Math.PI * (1 - s);
          set(needle, { x2: gx + (gr - 8) * Math.cos(na), y2: gy - (gr - 8) * Math.sin(na), stroke: s > lim ? C.coralD : C.ink });
          if (defended) { pulse(rg, t, tAl, ex, ey, 40); pulse(rg2, t, tAl + .3, ex, ey, 40); }
          else { rg.setAttribute('opacity', 0); rg2.setAttribute('opacity', 0); }
          if (defended && t >= tAl) setState('good', '<b>alarm → hold</b> · arm stopped');
          else if (!defended && s > lim) setState('bad', '<b>above the clean maximum</b>');
          else setState('', t > 1.1 ? 'accelerating' : 'moving');
        };
      }
      players.push(player(svg, D, render, { loop: true, still: 3.6 }));
    });
    onSeg('harm-mode', d => { defended = d.mode === 'on'; players.forEach(p => p.replay()); });
  })();

  /* ---------- 04: context-normalized score ---------- */
  (function () {
    const emb = document.getElementById('ctx-embed'), tr = document.getElementById('ctx-trace'); if (!emb || !tr) return;
    let scene = 'attack', scoring = 'ctx';
    const mono = 'Geist Mono, monospace';
    const CL = {
      rest: { c: [150, 215], r: 58, col: '#5d6b7d', lab: 'rest' },
      motion: { c: [305, 100], r: 42, col: '#7b8ba0', lab: 'motion' },
      contact: { c: [415, 235], r: 34, col: '#93a3b8', lab: 'contact' },
      release: { c: [262, 300], r: 30, col: '#c9d1dc', lab: 'release' }
    };
    const G = { c: [272, 205], r: 168 };
    const rnd = mulberry(11);
    const gauss = () => { let u = 0; for (let i = 0; i < 4; i++) u += rnd(); return (u - 2) / .58; };
    const ringEls = {};
    const shared = el('circle', { cx: G.c[0], cy: G.c[1], r: G.r, fill: 'none', stroke: C.nMuted, 'stroke-dasharray': '3 6', opacity: 0 }, emb);
    const sharedLab = el('text', { x: G.c[0] + G.r * .72, y: G.c[1] - G.r * .72, 'font-size': 11, 'font-family': mono, fill: C.nMuted, opacity: 0, text: 'one shared spread' }, emb);
    Object.entries(CL).forEach(([k, o]) => {
      const g = el('g', null, emb);
      for (let i = 0; i < 26; i++) { const a = rnd() * 6.283, d = Math.abs(gauss()) * o.r * .42; el('circle', { cx: o.c[0] + Math.cos(a) * d, cy: o.c[1] + Math.sin(a) * d, r: 2.2, fill: o.col, opacity: .55 }, g); }
      const rr = el('circle', { cx: o.c[0], cy: o.c[1], r: o.r, fill: 'none', stroke: o.col, 'stroke-width': 1.4, 'stroke-dasharray': '4 4', opacity: .6 }, g);
      el('circle', { cx: o.c[0], cy: o.c[1], r: 3, fill: C.nInk }, g);
      el('text', { x: o.c[0], y: o.c[1] - o.r - 8, 'text-anchor': 'middle', 'font-size': 12, 'font-family': mono, fill: C.nBody, text: o.lab + ' cₖ' }, g);
      ringEls[k] = rr;
    });
    const link = el('line', { stroke: C.nBlue, 'stroke-width': 1.5, 'stroke-dasharray': '2 3' }, emb);
    const trail = el('path', { stroke: C.nBody, 'stroke-opacity': .35, 'stroke-width': 1.2 }, emb);
    const dot = el('circle', { r: 7, fill: C.nInk, stroke: C.night, 'stroke-width': 2 }, emb);
    const dRing = ring(emb, C.nBlue);

    // Scripted episode (schematic): 62 steps at 20 Hz.
    const NSTEP = 62, ONSET = 53, ATK = 40;
    function build() {
      const r = mulberry(scene === 'attack' ? 5 : 9);
      const jit = s => (r() - .5) * s;
      const P = [], K = [];
      for (let s = 0; s < NSTEP; s++) {
        let p, k;
        if (s < 12) { k = 'rest'; p = [CL.rest.c[0] + 8 + jit(22), CL.rest.c[1] + jit(22)]; }
        else if (s < 18) { k = 'contact'; p = [CL.contact.c[0] + jit(14), CL.contact.c[1] + jit(14)]; }
        else if (s < ATK) { k = 'motion'; p = [CL.motion.c[0] + jit(20), CL.motion.c[1] + jit(20)]; }
        else if (scene === 'place') {
          // normal placement: effort drop with the object near the surface -> clean release cluster
          k = s < 56 ? 'release' : 'rest';
          p = s < 56 ? [CL.release.c[0] + jit(18), CL.release.c[1] + jit(18)]
            : [CL.rest.c[0] + 30 + jit(20), CL.rest.c[1] + 20 + jit(20)];
        } else {
          // malicious release mid-transport: release context, but far from clean release behaviour
          k = 'release';
          const g = 0.8 * Math.pow(s - ATK + 1, 2.1);
          const u = [-.962, .271];
          p = [CL.release.c[0] + 6 + u[0] * g + jit(4), CL.release.c[1] - 6 + u[1] * g + jit(4)];
        }
        P.push(p); K.push(k);
      }
      // scores: distance / spread (squared distances in the paper; linear here for legibility), mean over last 3 steps
      const raw = P.map((p, s) => {
        const c = scoring === 'ctx' ? CL[K[s]] : G;
        return Math.hypot(p[0] - c.c[0], p[1] - c.c[1]) / c.r;
      });
      const S = raw.map((v, s) => { let a = 0, n = 0; for (let j = Math.max(0, s - 2); j <= s; j++) { a += raw[j]; n++; } return a / n; });
      let alarm = -1; for (let s = 0; s < NSTEP; s++) if (S[s] > 1) { alarm = s; break; }
      return { P, K, S, alarm };
    }
    // trace axes
    const X0 = 46, X1 = 500, Y0 = 300, Y1 = 40, SMAX = 2.2;
    const xs = s => lerp(X0, X1, s / (NSTEP - 1)), ys = v => lerp(Y0, Y1, Math.min(v, SMAX) / SMAX);
    el('line', { x1: X0, x2: X1, y1: Y0, y2: Y0, stroke: C.nLine }, tr);
    el('line', { x1: X0, x2: X1, y1: ys(1), y2: ys(1), stroke: C.nMuted, 'stroke-dasharray': '5 5' }, tr);
    el('text', { x: X0 - 8, y: ys(1) + 4, 'text-anchor': 'end', 'font-size': 11, 'font-family': mono, fill: C.nMuted, text: 'qₑ' }, tr);
    el('text', { x: X0 - 8, y: Y0 + 4, 'text-anchor': 'end', 'font-size': 11, 'font-family': mono, fill: C.nMuted, text: '0' }, tr);
    const ctxBand = el('g', null, tr);
    const bands = []; for (let s = 0; s < NSTEP; s++) bands.push(el('rect', { x: xs(s) - 3.7, y: 318, width: 7.4, height: 12, fill: C.nLine }, ctxBand));
    el('text', { x: X0, y: 350, 'font-size': 10.5, 'font-family': mono, fill: C.nMuted, text: 'context per step  ■ release  ■ contact  ■ motion  ■ rest' }, tr);
    const onsetG = el('g', { opacity: 0 }, tr);
    el('line', { x1: xs(ONSET), x2: xs(ONSET), y1: Y1 - 6, y2: Y0, stroke: C.nCoral, 'stroke-dasharray': '3 4' }, onsetG);
    el('text', { x: xs(ONSET) + 5, y: Y1 + 4, 'font-size': 11, 'font-family': mono, fill: C.nCoral, text: 'onset' }, onsetG);
    const leadBar = el('rect', { y: Y1 - 26, height: 6, rx: 3, fill: C.nBlue, opacity: 0 }, tr);
    const leadTx = el('text', { y: Y1 - 32, 'font-size': 11, 'font-family': mono, fill: C.nBlue, opacity: 0 }, tr);
    const line = el('path', { stroke: C.nBlue, 'stroke-width': 2.2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, tr);
    const alarmG = el('g', { opacity: 0 }, tr);
    const alarmL = el('line', { y1: Y1 - 6, y2: Y0, stroke: C.nBlue, 'stroke-width': 1.4 }, alarmG);
    const alarmT = el('text', { y: Y0 - 8, 'font-size': 11, 'font-family': mono, fill: C.nBlue, text: 'alarm → hold' }, alarmG);
    const head = el('circle', { r: 4.5, fill: C.nInk }, tr);
    const shade = { release: '#c9d1dc', contact: '#93a3b8', motion: '#7b8ba0', rest: '#4a5566' };
    const badge = document.getElementById('ctx-badge'), stepL = document.getElementById('ctx-step');
    const roA = document.getElementById('ro-alarm'), roL = document.getElementById('ro-lead'), roO = document.getElementById('ro-out');
    let E = build();
    const D = NSTEP / 10 + 1.2;
    function render(t) {
      const sf = clamp(t * 10, 0, NSTEP - 1); const s = Math.floor(sf); const fr = sf - s;
      const p = s < NSTEP - 1 ? [lerp(E.P[s][0], E.P[s + 1][0], fr), lerp(E.P[s][1], E.P[s + 1][1], fr)] : E.P[s];
      const k = E.K[s];
      set(dot, { cx: p[0], cy: p[1] });
      set(trail, { d: 'M' + E.P.slice(Math.max(0, s - 10), s + 1).map(q => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L') + 'L' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) });
      const c = scoring === 'ctx' ? CL[k].c : G.c;
      set(link, { x1: p[0], y1: p[1], x2: c[0], y2: c[1], stroke: E.S[s] > 1 ? C.nCoral : C.nBlue });
      Object.entries(ringEls).forEach(([kk, rr]) => set(rr, { opacity: scoring === 'ctx' ? (kk === k ? 1 : .35) : .25, 'stroke-width': scoring === 'ctx' && kk === k ? 2.2 : 1.2 }));
      set(shared, { opacity: scoring === 'shared' ? .9 : 0 }); set(sharedLab, { opacity: scoring === 'shared' ? 1 : 0 });
      const alarmed = E.alarm >= 0 && s >= E.alarm;
      set(dot, { fill: alarmed ? C.nCoral : C.nInk });
      if (E.alarm >= 0) pulse(dRing, t, E.alarm / 10, E.P[E.alarm][0], E.P[E.alarm][1], 50); else dRing.setAttribute('opacity', 0);
      // trace
      let d = '';
      for (let j = 0; j <= s; j++) d += (j ? 'L' : 'M') + xs(j).toFixed(1) + ' ' + ys(E.S[j]).toFixed(1);
      if (s < NSTEP - 1) d += 'L' + xs(sf).toFixed(1) + ' ' + ys(lerp(E.S[s], E.S[s + 1], fr)).toFixed(1);
      set(line, { d, stroke: scoring === 'ctx' ? C.nBlue : C.nMuted });
      set(head, { cx: xs(sf), cy: ys(s < NSTEP - 1 ? lerp(E.S[s], E.S[s + 1], fr) : E.S[s]) });
      bands.forEach((b, j) => set(b, { fill: j <= s ? shade[E.K[j]] : C.nLine }));
      onsetG.setAttribute('opacity', scene === 'attack' && s >= ONSET ? 1 : (scene === 'attack' ? .25 : 0));
      if (alarmed) { alarmG.setAttribute('opacity', 1); set(alarmL, { x1: xs(E.alarm), x2: xs(E.alarm) }); set(alarmT, { x: xs(E.alarm) - 6, 'text-anchor': 'end' }); }
      else alarmG.setAttribute('opacity', 0);
      const lead = E.alarm >= 0 ? ONSET - E.alarm : null;
      if (scene === 'attack' && alarmed && lead > 0) {
        set(leadBar, { x: xs(E.alarm), width: xs(ONSET) - xs(E.alarm), opacity: 1 });
        set(leadTx, { x: xs(E.alarm), opacity: 1, text: 'lead ' + lead + ' steps' });
      } else { leadBar.setAttribute('opacity', 0); leadTx.setAttribute('opacity', 0); }
      badge.textContent = 'context: ' + k; stepL.textContent = 'step ' + s + ' · ' + (s * 50) + ' ms';
      // readouts
      if (scene === 'place') {
        roA.textContent = alarmed ? 'step ' + E.alarm : 'none'; roA.className = alarmed ? 'warn' : 'okc';
        roL.textContent = '—'; roL.className = '';
        roO.textContent = alarmed ? 'false alarm' : 'normal placement'; roO.className = alarmed ? 'warn' : 'okc';
      } else {
        roA.textContent = alarmed ? 'step ' + E.alarm : '…'; roA.className = alarmed ? 'okc' : '';
        roL.textContent = alarmed ? lead + ' steps · ' + lead * 50 + ' ms' : '…'; roL.className = alarmed ? (lead >= 4 ? 'okc' : 'warn') : '';
        roO.textContent = alarmed ? (lead >= 4 ? 'hold well before onset' : 'hold just before onset') : '…'; roO.className = alarmed ? (lead >= 4 ? 'okc' : 'warn') : '';
      }
    }
    const p = player(emb, D, render);
    function restart() { E = build(); p.replay(); }
    onSeg('ctx-scene', d => { scene = d.scene; restart(); });
    onSeg('ctx-score', d => { scoring = d.score; restart(); });
    const rb = document.getElementById('ctx-replay'); if (rb) rb.addEventListener('click', restart);
  })();

  /* ---------- animated bar helper ---------- */
  function onView(target, fn) {
    if (RM) { fn(true); return; }
    fn(false);
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.disconnect(); fn(false, true); } }), { threshold: .3 });
    io.observe(target);
  }
  function tween(dur, cb) {
    if (RM) { cb(1); return; }
    const t0 = performance.now();
    (function step(now) { const k = ease(clamp((now - t0) / dur, 0, 1)); cb(k); if (k < 1) requestAnimationFrame(step); })(t0);
  }

  /* ---------- 04b: ablation (night) ---------- */
  (function () {
    const svg = document.getElementById('ablation-svg'); if (!svg) return;
    const sig = gradient(svg, 'ab-sig', [[0, '#c3d1e4'], [.5, '#97aecc'], [1, '#f09a82']]);
    const groups = [
      { lab: 'Median alarm lead before a release', unit: ' steps', a: 6, b: 2, max: 8 },
      { lab: 'Releases prevented (of 107)', unit: '', a: 80, b: 53, max: 107 },
      { lab: 'LIBERO-Object releases prevented (of 63)', unit: '', a: 37, b: 10, max: 63 }];
    const X0 = 150, X1 = 470;
    const bars = [];
    groups.forEach((g, i) => {
      const y = 22 + i * 78;
      el('text', { x: 0, y: y, 'font-size': 12.5, fill: C.nBody, text: g.lab }, svg);
      [['Per-context', g.a, sig], ['One shared', g.b, '#4a5566']].forEach(([n, v, fill], j) => {
        const yy = y + 12 + j * 24;
        el('text', { x: 0, y: yy + 12, 'font-size': 11.5, 'font-family': 'Geist Mono, monospace', fill: j ? C.nMuted : C.nInk, text: n }, svg);
        el('rect', { x: X0, y: yy, width: X1 - X0, height: 16, rx: 3, fill: 'rgba(255,255,255,.04)' }, svg);
        const r = el('rect', { x: X0, y: yy, width: 0, height: 16, rx: 3, fill }, svg);
        const tx = el('text', { y: yy + 12.5, 'font-size': 12, 'font-weight': 600, fill: j ? C.nMuted : C.nInk }, svg);
        bars.push({ r, tx, v, max: g.max, unit: g.unit });
      });
    });
    onView(svg, (now, go) => {
      const draw = k => bars.forEach(b => { const w = (X1 - X0) * b.v / b.max * k; set(b.r, { width: w }); set(b.tx, { x: X0 + w + 6, text: Math.round(b.v * k) + b.unit }); });
      if (now) draw(1); else if (go) tween(1100, draw); else draw(0);
    });
  })();

  /* ---------- 06: scatter AUROC vs prevented ---------- */
  (function () {
    const svg = document.getElementById('scatter-svg'); if (!svg) return;
    const X0 = 70, X1 = 610, Y0 = 370, Y1 = 30;
    const xs = a => lerp(X0, X1, (a - .5) / .5), ys = p => lerp(Y0, Y1, p / 100);
    for (let a = .5; a <= 1.0001; a += .1) { el('line', { x1: xs(a), x2: xs(a), y1: Y0, y2: Y1, stroke: C.line }, svg); el('text', { x: xs(a), y: Y0 + 20, 'text-anchor': 'middle', 'font-size': 11, 'font-family': 'Geist Mono, monospace', fill: C.muted, text: a.toFixed(1) }, svg); }
    for (let p = 0; p <= 100; p += 25) { el('line', { x1: X0, x2: X1, y1: ys(p), y2: ys(p), stroke: C.line }, svg); el('text', { x: X0 - 10, y: ys(p) + 4, 'text-anchor': 'end', 'font-size': 11, 'font-family': 'Geist Mono, monospace', fill: C.muted, text: p }, svg); }
    el('text', { x: (X0 + X1) / 2, y: Y0 + 42, 'text-anchor': 'middle', 'font-size': 12, fill: C.body, text: 'Attack-detection AUROC (attacked vs clean episodes)' }, svg);
    el('text', { x: 18, y: (Y0 + Y1) / 2, 'text-anchor': 'middle', 'font-size': 12, fill: C.body, transform: 'rotate(-90 18 ' + (Y0 + Y1) / 2 + ')', text: 'Harm events prevented (%)' }, svg);
    const pts = [
      { n: 'ActFovea', a: .56, p: 6.9, dx: 10, dy: -8 }, { n: 'SafeLoop', a: .56, p: 3.6, dx: 10, dy: 14 },
      { n: 'VLA-FAIL', a: .63, p: 1.8, dx: 10, dy: 4 }, { n: 'Bera', a: .77, p: 83.9, dx: 12, dy: 4 },
      { n: 'Per-channel limits', a: .85, p: 53.7, dx: -12, dy: 4, anchor: 'end', tele: true },
      { n: 'FAIL-Detect', a: .97, p: 16.1, dx: -12, dy: 4, anchor: 'end' },
      { n: 'DETOX', a: .96, p: 92.8, dx: -14, dy: -12, anchor: 'end', ours: true }];
    const sig = gradient(svg, 'sc-sig', [[0, '#3f5876'], [1, '#c9644d']]);
    // annotation: same AUROC band, very different prevention
    const band = el('rect', { x: xs(.955), width: xs(.975) - xs(.955), y: Y1, height: Y0 - Y1, fill: 'rgba(230,134,112,.08)', opacity: 0 }, svg);
    const arrow = el('path', { d: 'M' + xs(.965) + ' ' + (ys(16.1) - 12) + ' V ' + (ys(92.8) + 14), stroke: C.coralD, 'stroke-width': 1.5, 'stroke-dasharray': '3 4', opacity: 0, 'marker-end': '' }, svg);
    const annot = el('text', { x: xs(.94), y: ys(40), 'text-anchor': 'end', 'font-size': 12, fill: C.coralD, opacity: 0 }, svg);
    el('tspan', { x: xs(.94), dy: 0, text: 'Similar AUROC,' }, annot); el('tspan', { x: xs(.94), dy: 16, text: '76.7 points apart' }, annot); el('tspan', { x: xs(.94), dy: 16, text: 'in harms prevented' }, annot);
    const P = pts.map((o, i) => {
      const g = el('g', { opacity: 0 }, svg);
      const c = el('circle', { cx: xs(o.a), cy: ys(o.p), r: o.ours ? 9 : 6.5, fill: o.ours ? sig : (o.tele ? '#fff' : C.slate), stroke: o.ours ? '#fff' : (o.tele ? C.blueL : '#fff'), 'stroke-width': o.tele ? 2 : 1.5 }, g);
      el('text', { x: xs(o.a) + o.dx, y: ys(o.p) + o.dy, 'text-anchor': o.anchor || 'start', 'font-size': o.ours ? 14 : 12, 'font-weight': o.ours ? 700 : 500, fill: o.ours ? C.ink : C.body, text: o.n }, g);
      return { g, c, o, i };
    });
    const pr = ring(svg, C.blue);
    onView(svg, (now, go) => {
      const draw = (k, t) => {
        P.forEach(q => { const kk = ease(clamp(k * 1.6 - q.i * .1, 0, 1)); q.g.setAttribute('opacity', kk); q.g.setAttribute('transform', 'translate(0 ' + ((1 - kk) * 30).toFixed(1) + ')'); });
        const ka = seg(k, .7, 1);
        band.setAttribute('opacity', ka); arrow.setAttribute('opacity', ka); annot.setAttribute('opacity', ka);
      };
      if (now) draw(1); else if (go) { tween(2200, k => draw(k)); if (!RM) { const t0 = performance.now(); (function lp(n) { const t = (n - t0) / 1000; if (t > 2) pulse(pr, (t - 2) % 2.2, 0, xs(.96), ys(92.8), 26); if (t < 14) requestAnimationFrame(lp); else pr.setAttribute('opacity', 0); })(t0); } }
      else draw(0);
    });
  })();

  /* ---------- 06: bars per class ---------- */
  (function () {
    const svg = document.getElementById('bars-svg'); if (!svg) return;
    const M = ['DETOX', 'Per-channel limits', 'Bera', 'FAIL-Detect', 'ActFovea', 'SafeLoop', 'VLA-FAIL'];
    const V = {
      release: [99.1, 0.0, 42.1, 58.9, 0.0, 0.0, 1.9], contact: [97.7, 96.6, 100.0, 0.0, 11.4, 10.2, 1.1],
      speed: [100.0, 64.8, 100.0, 0.0, 8.7, 3.1, 2.6], prev: [92.8, 53.7, 83.9, 16.1, 6.9, 3.6, 1.8]
    };
    const unit = { release: '% of 107 releases flagged before onset', contact: '% of 88 contacts flagged before onset', speed: '% of 196 overspeeds flagged before onset', prev: '% of 391 events prevented by the hold' };
    const sig = gradient(svg, 'bar-sig', [[0, '#3f5876'], [.4, '#5c7699'], [.8, '#d9765f'], [1, '#c9644d']]);
    const X0 = 140, X1 = 410, H = 26, G = 44;
    for (let p = 0; p <= 100; p += 25) { el('line', { x1: lerp(X0, X1, p / 100), x2: lerp(X0, X1, p / 100), y1: 4, y2: M.length * G, stroke: C.line }, svg); el('text', { x: lerp(X0, X1, p / 100), y: M.length * G + 16, 'text-anchor': 'middle', 'font-size': 10.5, 'font-family': 'Geist Mono, monospace', fill: C.muted, text: p }, svg); }
    const R = M.map((n, i) => {
      const y = 8 + i * G;
      el('text', { x: X0 - 10, y: y + H / 2 + 5, 'text-anchor': 'end', 'font-size': 13, 'font-weight': i === 0 ? 700 : 500, fill: i === 0 ? C.ink : C.body, text: n }, svg);
      const r = el('rect', { x: X0, y, height: H, width: 0, rx: 3, fill: i === 0 ? sig : (i === 1 ? '#fff' : C.slate), stroke: i === 1 ? C.blueL : 'none', 'stroke-width': 1.5, opacity: i > 1 ? .7 : 1 }, svg);
      const tx = el('text', { y: y + H / 2 + 5, 'font-size': 12.5, 'font-family': 'Geist Mono, monospace', 'font-weight': i === 0 ? 600 : 500, fill: C.ink }, svg);
      return { r, tx, cur: 0 };
    });
    let metric = 'release';
    function go(anim) {
      document.getElementById('bars-unit').textContent = unit[metric];
      const from = R.map(o => o.cur), to = V[metric];
      tween(anim ? 900 : 0, k => R.forEach((o, i) => { const v = lerp(from[i], to[i], k); o.cur = v; const w = (X1 - X0) * v / 100; set(o.r, { width: Math.max(0, w) }); set(o.tx, { x: X0 + w + 6, text: v.toFixed(1) }); }));
    }
    onView(svg, (now, start) => { if (now || start) go(!now); });
    onSeg('bars-metric', d => { metric = d.m; go(true); });
  })();

  /* ---------- 06: unseen patch ---------- */
  (function () {
    const svg = document.getElementById('patch-svg'); if (!svg) return;
    const sig = gradient(svg, 'patch-sig', [[0, '#3f5876'], [1, '#c9644d']]);
    const rows = [['DETOX (frozen)', 55, sig, C.ink], ['Best policy-side variant', 36, C.slate, C.body]];
    const X0 = 190, X1 = 470;
    el('text', { x: 0, y: 18, 'font-size': 11, 'font-family': 'Geist Mono, monospace', fill: C.muted, 'letter-spacing': '.08em', text: 'ABRUPT RELEASES UNDER AN UNSEEN PATCH · 73 EVENTS' }, svg);
    // 73 event pips per row
    const pips = rows.map((r, i) => {
      const y = 46 + i * 58;
      el('text', { x: 0, y: y + 14, 'font-size': 13.5, 'font-weight': i ? 500 : 700, fill: r[3], text: r[0] }, svg);
      const arr = [];
      for (let j = 0; j < 73; j++) { const col = j % 25, row = Math.floor(j / 25); arr.push(el('rect', { x: X0 + col * 11, y: y + row * 11 - 6, width: 8, height: 8, rx: 2, fill: 'rgba(16,20,27,.08)' }, svg)); }
      const tx = el('text', { x: X1 + 10, y: y + 14, 'font-size': 14, 'font-weight': 600, 'font-family': 'Geist Mono, monospace', fill: r[3], text: '0' }, svg);
      return { arr, tx, n: r[1], fill: i ? C.slate : C.blue };
    });
    onView(svg, (now, go) => {
      const draw = k => pips.forEach(p => { const m = Math.round(p.n * k); p.arr.forEach((a, j) => set(a, { fill: j < m ? p.fill : 'rgba(16,20,27,.08)' })); set(p.tx, { text: m + '/73' }); });
      if (now) draw(1); else if (go) tween(1600, draw); else draw(0);
    });
  })();

  /* ---------- 06: prevention by lead ---------- */
  (function () {
    const svg = document.getElementById('lead-svg'); if (!svg) return;
    const sig = gradient(svg, 'lead-sig', [[0, '#3f5876'], [1, '#c9644d']], '0');
    const cols = [['≥ 3 steps (0.15 s)', 93.6, 'most events'], ['1–2 steps', 83.3, '10 of 12'], ['at the onset step', 100, '1 of 1']];
    const Y0 = 200, Y1 = 30, W = 120;
    el('line', { x1: 30, x2: 620, y1: Y0, y2: Y0, stroke: C.line }, svg);
    const B = cols.map((c, i) => {
      const x = 80 + i * 190;
      el('text', { x: x + W / 2, y: Y0 + 22, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 600, fill: C.ink, text: c[0] }, svg);
      el('text', { x: x + W / 2, y: Y0 + 40, 'text-anchor': 'middle', 'font-size': 11, 'font-family': 'Geist Mono, monospace', fill: C.muted, text: c[2] }, svg);
      el('rect', { x, y: Y1, width: W, height: Y0 - Y1, rx: 4, fill: 'rgba(16,20,27,.04)' }, svg);
      const r = el('rect', { x, y: Y0, width: W, height: 0, rx: 4, fill: i === 0 ? C.blue : C.blueL, opacity: i === 0 ? 1 : .75 }, svg);
      const tx = el('text', { x: x + W / 2, y: Y0 - 8, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 600, fill: C.ink }, svg);
      return { r, tx, v: c[1] };
    });
    onView(svg, (now, go) => {
      const draw = k => B.forEach(b => { const h = (Y0 - Y1) * b.v / 100 * k; set(b.r, { y: Y0 - h, height: h }); set(b.tx, { y: Y0 - h - 8, text: (b.v * k).toFixed(1) + '%' }); });
      if (now) draw(1); else if (go) tween(1200, draw); else draw(0);
    });
  })();

  /* ---------- 07: UR5e recorded gripper traces ---------- */
  (function () {
    const svg = document.getElementById('hw-svg'); const T = window.UR5E_TRACES; if (!svg || !T) return;
    const mono = 'Geist Mono, monospace';
    const X0 = 56, X1 = 620, Y0 = 320, Y1 = 30, TMIN = -100, TMAX = 3050, AMAX = 90;
    const xs = t => lerp(X0, X1, (t - TMIN) / (TMAX - TMIN)), ys = a => lerp(Y0, Y1, a / AMAX);
    for (let a = 0; a <= 90; a += 30) { el('line', { x1: X0, x2: X1, y1: ys(a), y2: ys(a), stroke: C.line }, svg); el('text', { x: X0 - 8, y: ys(a) + 4, 'text-anchor': 'end', 'font-size': 11, 'font-family': mono, fill: C.muted, text: a }, svg); }
    for (let t = 0; t <= 3000; t += 500) el('text', { x: xs(t), y: Y0 + 20, 'text-anchor': 'middle', 'font-size': 11, 'font-family': mono, fill: C.muted, text: (t / 1000).toFixed(1) }, svg);
    el('text', { x: (X0 + X1) / 2, y: Y0 + 44, 'text-anchor': 'middle', 'font-size': 12, fill: C.body, text: 'time from the opening onset (s)' }, svg);
    el('text', { x: 14, y: (Y0 + Y1) / 2, 'text-anchor': 'middle', 'font-size': 12, fill: C.body, transform: 'rotate(-90 14 ' + (Y0 + Y1) / 2 + ')', text: 'aperture (mm)' }, svg);
    el('line', { x1: xs(0), x2: xs(0), y1: Y1, y2: Y0, stroke: C.coralD, 'stroke-dasharray': '3 4' }, svg);
    el('text', { x: xs(0) + 5, y: Y1 + 10, 'font-size': 11, 'font-family': mono, fill: C.coralD, text: 'opening onset' }, svg);
    const L = {
      nohold: el('path', { stroke: C.coral, 'stroke-width': 2.4, 'stroke-linejoin': 'round' }, svg),
      hold: el('path', { stroke: C.blue, 'stroke-width': 2.6, 'stroke-linejoin': 'round' }, svg)
    };
    const alarmG = el('g', { opacity: 0 }, svg);
    const ax = xs(T.hold.alarm_ms);
    el('line', { x1: ax, x2: ax, y1: Y1 + 26, y2: Y0, stroke: C.blue, 'stroke-width': 1.4 }, alarmG);
    el('text', { x: ax + 5, y: Y1 + 30, 'font-size': 11, 'font-family': mono, fill: C.blue, text: 'DETOX alarm +' + T.hold.alarm_ms + ' ms → hold' }, alarmG);
    const ar = ring(svg, C.blue);
    const endHold = el('text', { 'font-size': 12, 'font-weight': 600, fill: C.blue, opacity: 0, text: 'operator verdict: kept' }, svg);
    const endNo = el('text', { 'font-size': 12, 'font-weight': 600, fill: C.coralD, opacity: 0, text: 'fully open · operator verdict: fell' }, svg);
    const headL = el('line', { y1: Y1, y2: Y0, stroke: C.ink, 'stroke-opacity': .25 }, svg);
    let mode = 'both';
    const D = (TMAX - TMIN) / 1000 + 1;   // recorded speed
    function pathTo(pts, tt) { let d = ''; for (const [t, a] of pts) { if (t > tt) break; d += (d ? 'L' : 'M') + xs(t).toFixed(1) + ' ' + ys(a).toFixed(1); } return d; }
    function render(t) {
      const tt = TMIN + t * 1000;
      ['hold', 'nohold'].forEach(k => { const show = mode === 'both' || mode === k; set(L[k], { d: pathTo(T[k].pts, tt), opacity: show ? 1 : .08 }); });
      set(headL, { x1: xs(Math.min(tt, TMAX)), x2: xs(Math.min(tt, TMAX)), opacity: tt < TMAX ? 1 : 0 });
      const showH = mode !== 'nohold';
      alarmG.setAttribute('opacity', showH && tt >= T.hold.alarm_ms ? 1 : 0);
      if (showH) pulse(ar, tt / 1000, T.hold.alarm_ms / 1000, ax, ys(38.7), 40); else ar.setAttribute('opacity', 0);
      const lh = T.hold.pts[T.hold.pts.length - 1], ln = T.nohold.pts[T.nohold.pts.length - 1];
      set(endHold, { x: xs(lh[0]) - 4, y: ys(lh[1]) + 22, 'text-anchor': 'end', opacity: showH && tt > 1200 ? 1 : 0 });
      set(endNo, { x: xs(ln[0]) - 4, y: ys(ln[1]) - 10, 'text-anchor': 'end', opacity: mode !== 'hold' && tt > ln[0] - 200 ? 1 : 0 });
    }
    const p = player(svg, D, render);
    onSeg('hw-mode', d => { mode = d.mode; p.replay(); });
    const rb = document.getElementById('hw-replay'); if (rb) rb.addEventListener('click', () => p.replay());
  })();
})();
