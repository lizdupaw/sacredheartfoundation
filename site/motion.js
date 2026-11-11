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
    const html = title.innerHTML.split(/<br\s*\/?>/i).map(line =>
      line.trim().split(/\s+/).filter(Boolean).map(w => `<span class="w"><span style="--i:${i++}">${w}</span></span>`).join(' ')
    ).join('<br>');
    title.innerHTML = html; title.dataset.split = html;
    [tag, body, btn].forEach(el => { if(!el) return; el.classList.remove('anim'); void el.offsetWidth; el.classList.add('anim'); });
  }
  if (title){
    animateHero();
    new MutationObserver(() => { if (title.innerHTML !== title.dataset.split) animateHero(); })
      .observe(title, {childList:true, characterData:true, subtree:true});
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
  const stats = $('.stats'), underlines = $$('.u');
  // stagger the underline loops so they don't all redraw at once
  underlines.forEach((u, k) => u.style.setProperty('--glint-delay', (k * 0.9).toFixed(1) + 's'));
  function onScroll(){
    // trust bar icons: draw in once the bar is on screen
    if (stats && !stats.classList.contains('icons-in') && stats.getBoundingClientRect().top < vh(stats) * 0.85) stats.classList.add('icons-in');
    // headline underlines: draw as the word travels from 88% to 55% of the screen height
    underlines.forEach(u => {
      const r = u.getBoundingClientRect(), h = vh(u);
      const t = Math.min(1, Math.max(0, (h * 0.88 - r.top) / (h * 0.33)));
      u.style.setProperty('--u', (1 - ease(t)).toFixed(3));
      u.classList.toggle('u-done', t >= 1);
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
