/* v2 motion layer. Loads after the page script. Does nothing for "reduce motion" visitors. */
(function(){
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const root = document.documentElement;
  root.classList.add('motion');

  /* Viewport height in the same units getBoundingClientRect uses (the page is CSS-zoomed on desktop). */
  function vh(el){
    const z = parseFloat(root.style.zoom) || 1;
    const k = el.offsetHeight ? el.getBoundingClientRect().height / el.offsetHeight : 1;
    return innerHeight * k / z;
  }
  /* 0 when the element's top hits the bottom of the screen, 1 when its bottom leaves the top. */
  function progress(el){
    const r = el.getBoundingClientRect(), h = vh(el);
    return Math.min(1, Math.max(0, (h - r.top) / (h + r.height)));
  }
  const ease = t => 1 - Math.pow(1 - t, 3);

  /* ---------- 1. Hero headline: split into words and rise in on every slide change ---------- */
  const title = $('#heroTitle'), tag = $('#heroTag'), body = $('#heroBody'), btn = $('#heroStory');
  function animateHero(){
    if (!title || title.dataset.split === title.innerHTML) return;
    let i = 0;
    const words = text => text.split(/\s+/).filter(Boolean).map(w => `<span class="w"><span style="--i:${i++}">${w}</span></span>`);
    const out = [];
    title.childNodes.forEach(n => {
      if (n.nodeType === 3){ const ws = words(n.textContent); if (ws.length){ if (/^\s/.test(n.textContent) && out.length) out.push(' '); out.push(ws.join(' ')); if (/\s$/.test(n.textContent)) out.push(' '); } }
      else if (n.nodeName === 'BR') out.push('<br>');
      else if (n.classList && n.classList.contains('u')){
        const svg = n.querySelector('svg'); const txt = n.textContent;
        out.push(`<span class="u">${words(txt).join(' ')}${svg ? svg.outerHTML : ''}</span>`);
      }
    });
    const html = out.join('').replace(/ +/g, ' ').replace(/ (\.)/g, '$1');
    title.innerHTML = html; title.dataset.split = title.innerHTML;
    [tag, body, btn].forEach(el => { if(!el) return; el.classList.remove('anim'); void el.offsetWidth; el.classList.add('anim'); });
  }
  if (title){
    animateHero();
    new MutationObserver(() => { if (title.innerHTML !== title.dataset.split) animateHero(); })
      .observe(title, {childList:true, characterData:true, subtree:true});
  }

  /* ---------- 1b. Hero slide change: new photo fades in over the old one (kept opaque underneath) ---------- */
  const hero = $('.hero'), slideEls = $$('.hero .slide');
  if (hero && slideEls.length){
    let current = slideEls.find(sl => sl.classList.contains('on'));
    slideEls.forEach(sl => new MutationObserver(() => {
      if (!sl.classList.contains('on') || sl === current) return;
      slideEls.forEach(o => o.classList.remove('prev'));
      if (current) current.classList.add('prev');
      current = sl;
      hero.classList.add('leafing');
      clearTimeout(hero._t); hero._t = setTimeout(() => slideEls.forEach(o => o.classList.remove('prev')), 1900);
    }).observe(sl, {attributes:true, attributeFilter:['class']}));
  }

  /* ---------- 1c. Stay Connected leaves: float on hover, drift away from the cursor ---------- */
  const connect = $('.connect'), leafEls = $$('.connect-leaves .leaf');
  if (connect && leafEls.length){
    const rnd = (a, b) => a + Math.random() * (b - a);
    const leafData = leafEls.map(g => {
      const b = g.getBBox(), size = Math.sqrt(b.width * b.height);
      const p = g.firstChild;
      p.style.setProperty('--fd', rnd(4.5, 8).toFixed(2) + 's');       // each leaf its own pace
      p.style.setProperty('--fdl', (-rnd(0, 6)).toFixed(2) + 's');     // start mid-cycle so they don't sync
      p.style.setProperty('--fx', rnd(-8, 8).toFixed(1) + 'px');
      p.style.setProperty('--fy', rnd(6, 16).toFixed(1) + 'px');
      p.style.setProperty('--fr', rnd(-9, 9).toFixed(1) + 'deg');
      return {g, cx: b.x + b.width / 2, cy: b.y + b.height / 2, w: b.width, h: b.height, depth: Math.min(1.4, size / 120)};
    });
    connect.addEventListener('mouseenter', () => connect.classList.add('floating'));
    connect.addEventListener('mouseleave', () => {
      connect.classList.remove('floating');
      leafData.forEach(l => { l.g.style.setProperty('--px', '0px'); l.g.style.setProperty('--py', '0px'); l.g.style.setProperty('--ps', '1'); });
    });
    const svgEl = $('.connect-leaves');
    connect.addEventListener('mousemove', e => {
      const r = svgEl.getBoundingClientRect(), vb = svgEl.viewBox.baseVal;
      // cursor position in leaf-layer units (the layer is scaled to cover, centered)
      const sc = Math.max(r.width / vb.width, r.height / vb.height);
      const mx = vb.x + vb.width / 2 + (e.clientX - (r.left + r.width / 2)) / sc;
      const my = vb.y + vb.height / 2 + (e.clientY - (r.top + r.height / 2)) / sc;
      leafData.forEach(l => {
        const dx = l.cx - mx, dy = l.cy - my, dist = Math.hypot(dx, dy) || 1;
        const push = Math.max(0, 1 - dist / 700) * 26 * l.depth;      // nearby leaves drift away most
        l.g.style.setProperty('--px', (dx / dist * push).toFixed(1) + 'px');
        l.g.style.setProperty('--py', (dy / dist * push).toFixed(1) + 'px');
        // leaves under / near the cursor zoom up, easing off with distance
        const near = Math.max(0, 1 - dist / (160 + Math.max(l.w, l.h) / 2));
        l.g.style.setProperty('--ps', (1 + 0.45 * near * near).toFixed(3));
      });
    });
  }

  /* ---------- 2. About flower: swap the image for an inline SVG so its line can draw itself ---------- */
  const flowerImg = $('.about .flower');
  let flower = null;
  if (flowerImg){
    flowerImg.insertAdjacentHTML('afterend',
      '<svg class="flower-svg" viewBox="0 0 707 739" fill="none" aria-hidden="true"><path d="M695.111 736.369C562.75 730.047 441.682 661.141 373.9 537.102C242.538 573.518 104.767 545.022 3.2738 451.09C76.3003 337.285 200.462 272.635 338.344 275.431C370.903 143.679 467.874 41.8005 596.281 3.02975C659.18 124.948 653.354 261.437 583.726 376.827C682.709 471.64 724.771 604.135 695.111 736.369Z" stroke="#00AE9A" stroke-width="3.67" stroke-miterlimit="10"/></svg>');
    flowerImg.remove();
    flower = $('.about .flower-svg');
    const path = flower.querySelector('path');
    flower.style.setProperty('--len', Math.ceil(path.getTotalLength()));
  }

  /* ---------- 4. Section reveals ---------- */
  const groups = [
    '.stats .stat', '#giving .head > *', '#giving .dcard', '.share .copy > *',
    '.about .copy > *', '#stories .head > *', '#stories .story', '.stories-cta',
    '.voices .head > *', '.connect > .wrap > *', '.foot .wrap > *'
  ];
  const revealEls = [];
  groups.forEach(sel => $$(sel).forEach((el, i) => {
    const r = el.getBoundingClientRect();
    if (r.top < vh(el) * 0.95) return;          // already on screen at load: leave it visible
    el.setAttribute('data-reveal', ''); el.style.setProperty('--d', i % 6); revealEls.push(el);
  }));
  const show = el => el.classList.add('in');
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    if (e.target === flower) { flower.classList.add('drawn'); }
    else show(e.target);
    io.unobserve(e.target);
  }), {rootMargin:'0px 0px -10% 0px'}) : null;
  revealEls.forEach(el => io ? io.observe(el) : show(el));
  if (flower) io ? io.observe(flower) : flower.classList.add('drawn');

  /* ---------- 5. Story card arrow ---------- */
  $$('.story .tab').forEach(t => { t.innerHTML = t.textContent.replace('»', '<span class="arr">»</span>'); });

  /* ---------- 6. Donor Voices spotlight: one quote centred in focus, neighbours recede ---------- */
  const quotes = $('.quotes');
  if (quotes){
    const cards = [...quotes.children], n = cards.length;
    const track = document.createElement('div'); track.className = 'track';
    // three copies (before / real / after) so it can loop forever in both directions
    const clone = c => { const d = c.cloneNode(true); d.setAttribute('aria-hidden', 'true'); d.tabIndex = -1; return d; };
    cards.forEach(c => track.appendChild(clone(c)));
    cards.forEach(c => track.appendChild(c));
    cards.forEach(c => track.appendChild(clone(c)));
    quotes.appendChild(track); quotes.classList.add('spotlight');
    const items = [...track.children];
    let i = n, paused = false, hover = false;
    const ctl = $('.quote-controls');
    let segs = [];

    function place(animate){
      if (!animate) track.classList.add('no-anim');
      const c = items[i];
      const x = c.offsetLeft + c.offsetWidth / 2 - quotes.clientWidth / 2;
      track.style.transform = `translateX(${-x}px)`;
      items.forEach((el, j) => el.classList.toggle('is-active', j === i));
      const real = ((i - n) % n + n) % n;
      segs.forEach((b, j) => b.setAttribute('aria-current', j === real));
      if (!animate){ void track.offsetWidth; track.classList.remove('no-anim'); }
    }
    function go(to){
      i = to; place(true);
      clearTimeout(go.t);
      go.t = setTimeout(() => {                       // after the glide, hop back to the real set invisibly
        const k = ((i - n) % n + n) % n + n;
        if (k !== i){ i = k; place(false); }
      }, 900);
    }
    const next = () => go(i + 1), prev = () => go(i - 1);
    // the active progress bar fills over 6s and advances the quote when it finishes; hover or pause freezes it
    const sync = () => ctl && ctl.classList.toggle('is-paused', paused || hover);

    items.forEach((el, j) => el.addEventListener('click', () => { if (j !== i) go(j); }));
    quotes.addEventListener('mouseenter', () => { hover = true; sync(); });
    quotes.addEventListener('mouseleave', () => { hover = false; sync(); });
    quotes.addEventListener('focusin', () => { hover = true; sync(); });
    quotes.addEventListener('focusout', () => { hover = false; sync(); });
    addEventListener('resize', () => place(false));
    if (document.fonts) document.fonts.ready.then(() => place(false));
    if (ctl){
      ctl.hidden = false;
      ctl.style.setProperty('--seg-dur', '6s');
      // dots, laid out: prev · dots · next · pause
      const dotsWrap = document.createElement('div'); dotsWrap.className = 'dots'; dotsWrap.setAttribute('role', 'tablist'); dotsWrap.setAttribute('aria-label', 'Choose quote');
      cards.forEach((c, j) => {
        const b = document.createElement('button'); b.setAttribute('role', 'tab'); b.setAttribute('aria-label', 'Quote ' + (j + 1));
        b.addEventListener('click', () => go(n + j));
        b.addEventListener('animationend', e => { if (e.animationName === 'segfill' && b.getAttribute('aria-current') === 'true') next(); });
        dotsWrap.appendChild(b); segs.push(b);
      });
      const qNext = $('#qNext'), qPause = $('#qPause');
      ctl.insertBefore(dotsWrap, qPause);
      ctl.insertBefore(qNext, qPause);
      $('#qPrev').addEventListener('click', () => prev());
      qNext.addEventListener('click', () => next());
      const pp = $('#qPause');
      pp.addEventListener('click', () => {
        paused = !paused; sync();
        pp.setAttribute('aria-pressed', paused);
        pp.setAttribute('aria-label', paused ? 'Play quotes' : 'Pause quotes');
      });
    }
    place(false); sync();
  }

  /* ---------- 2 + 3. Scroll-linked motion (petal, flower drift, kid parallax, Share Your Story) ---------- */
  const share = $('.share'), about = $('.about'), petal = $('.share h2 .petal'), kid = $('.about .kid');
  const leaf = $('.leaf-photo'), shareCopy = $('.share .copy');
  const stats = $('.stats'), underlines = $$('.u').filter(u => !u.closest('.hero'));
  // trinity icons bloom with scroll instead of the one-time fade-up
  const blooms = $$('#giving .head .mark, #stories .head .mark');
  blooms.forEach(mk => { mk.removeAttribute('data-reveal'); mk.classList.remove('in'); });
  const backOut = t => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };   // hero underlines animate per slide instead
  // stagger the underline loops so they don't all redraw at once
  underlines.forEach((u, k) => u.style.setProperty('--glint-delay', (k * 0.9).toFixed(1) + 's'));
  function onScroll(){
    blooms.forEach(mk => {
      const r = mk.getBoundingClientRect(), h = vh(mk.parentElement), c = r.top + r.height / 2;   // measure via the parent: the icon itself can be scaled to 0
      const tin  = Math.min(1, Math.max(0, (h * 0.96 - c) / (h * 0.3)));   // opens between 96% and 66% of the screen
      const tout = Math.min(1, Math.max(0, (c - h * 0.02) / (h * 0.2)));   // folds away over the top 22%
      const v = Math.min(tin, tout);
      mk.style.setProperty('--bs', Math.max(0, backOut(v)).toFixed(3));
      mk.style.setProperty('--br', (-120 * (1 - v)).toFixed(1) + 'deg');
      mk.style.setProperty('--bo', Math.min(1, v * 2.5).toFixed(3));
    });
    // trust bar icons: draw in once the bar is on screen
    if (stats && !stats.classList.contains('icons-in') && stats.getBoundingClientRect().top < vh(stats) * 0.85) stats.classList.add('icons-in');
    // headline underlines: once the headline is on screen, wait for its fade-in to finish, then draw the line
    underlines.forEach(u => {
      if (u.dataset.armed) return;
      if (u.getBoundingClientRect().top > vh(u) * 0.8) return;
      u.dataset.armed = '1';
      const fading = u.closest('[data-reveal]');                 // the headline that fades up
      const wait = fading ? 1150 : 350;                          // fade-up is 0.9s (+ stagger)
      setTimeout(() => {
        u.classList.add('u-drawn');                              // 1.1s draw, left -> right
        setTimeout(() => u.classList.add('u-done'), 1300);       // then the looping redraw starts
      }, wait);
    });
    if (share){
      const p = progress(share);
      const open = ease(Math.min(1, p / 0.45));           // fully open by the time the section is ~centered
      leaf && leaf.style.setProperty('--leaf-scale', (0.55 + 0.45 * open).toFixed(3));
      leaf && leaf.style.setProperty('--leaf-rot', (-14 * (1 - open)).toFixed(2) + 'deg');
      shareCopy && shareCopy.style.setProperty('--copy-x', (90 * (1 - open)).toFixed(1) + 'px');
      shareCopy && shareCopy.style.setProperty('--copy-o', (0.15 + 0.85 * open).toFixed(3));
      petal && petal.style.setProperty('--petal-spin', (p * 120 - 40).toFixed(1) + 'deg');
      petal && petal.style.setProperty('--petal-scale', (0.7 + 0.3 * open).toFixed(3));
    }
    if (about){
      const p = progress(about);
      flower && flower.style.setProperty('--flower-spin', (p * 24 - 12).toFixed(2) + 'deg');
      kid && kid.style.setProperty('--kid-shift', ((0.5 - p) * 60).toFixed(1) + 'px');
    }
  }
  /* Reveal check on scroll too, so nothing stays hidden if the observer is slow or paused */
  function checkReveals(){
    for (const el of revealEls){ if (el.classList.contains('in')) continue;
      if (el.getBoundingClientRect().top < vh(el) * 0.9) show(el); }
    if (flower && !flower.classList.contains('drawn') && flower.getBoundingClientRect().top < vh(flower) * 0.8) flower.classList.add('drawn');
  }
  const req = () => { onScroll(); checkReveals(); };   // a handful of style writes, cheap enough to run per event
  addEventListener('scroll', req, {passive:true});
  addEventListener('resize', req);
  req();
  setTimeout(req, 400);   // after fonts/zoom settle
})();
