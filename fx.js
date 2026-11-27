/* Лёгкий параллакс на главном кадре; отключается при reduced-motion и на телефоне */
(() => {
  const img = document.querySelector('.hero__bg img');
  if (!img || matchMedia('(prefers-reduced-motion:reduce)').matches || !matchMedia('(min-width:721px)').matches) return;
  let busy = false;
  const frame = () => {
    busy = false;
    const y = Math.min(scrollY, 1000);
    img.style.transform = `translate3d(0,${(y * .16).toFixed(1)}px,0) scale(${(1.05 + y * .00004).toFixed(4)})`;
  };
  addEventListener('scroll', () => { if (!busy) { busy = true; requestAnimationFrame(frame); } }, { passive: true });
  frame();
})();

/* Этапы: панели-постеры, раскрывается одна (наведение на компьютере, нажатие везде) */
(() => {
  const ps = [...document.querySelectorAll('.poster')];
  if (!ps.length) return;
  const open = p => ps.forEach(x => {
    const on = x === p;
    x.classList.toggle('is-open', on);
    x.querySelector('.poster__head').setAttribute('aria-expanded', String(on));
  });
  ps.forEach(p => {
    p.querySelector('.poster__head').addEventListener('click', () => open(p));
    p.addEventListener('mouseenter', () => { if (matchMedia('(hover:hover) and (min-width:901px)').matches) open(p); });
  });
})();

/* Схема проверки: на компьютере подпись видна только при наведении на точку */
(() => {
  const stage = document.getElementById('stage');
  if (!stage) return;
  stage.querySelectorAll('.hs').forEach(h => {
    h.addEventListener('mouseenter', () => stage.classList.add('is-hover'));
    h.addEventListener('mouseleave', () => stage.classList.remove('is-hover'));
  });
})();

/* Этапы: заголовок раскрытой панели на одной высоте у всех панелей.
   Эталон — вторая панель: берём высоту её описания и задаём её как минимальную остальным. */
(() => {
  const box = document.querySelector('.posters');
  const ps = box ? [...box.querySelectorAll('.poster')] : [];
  const ref = ps[1];
  if (!ref) return;
  const st = document.createElement('style');
  st.textContent = '.poster--measure,.poster--measure *{transition:none!important;animation:none!important}';
  document.head.appendChild(st);
  const sync = () => {
    // невидимая копия раскрытой панели нужной ширины — меряем описание эталона
    const w = document.createElement('article');
    w.className = 'poster is-open poster--measure';
    w.appendChild(ref.querySelector('.poster__body').cloneNode(true));
    box.appendChild(w);
    const grow = parseFloat(getComputedStyle(w).flexGrow) || 1;
    const gap = parseFloat(getComputedStyle(box).columnGap) || 0;
    const wide = matchMedia('(min-width:901px)').matches;
    const width = wide ? (box.clientWidth - gap * (ps.length - 1)) * grow / (grow + ps.length - 1) : box.clientWidth;
    w.style.cssText = `position:absolute;left:-9999px;top:0;visibility:hidden;flex:none;height:auto;min-height:0;width:${width}px`;
    box.style.setProperty('--pbody', w.firstChild.offsetHeight + 'px');
    box.style.setProperty('--pw', Math.round(width - 2) + 'px'); // итоговая ширина (без рамки): текст сразу верстается по ней и не перестраивается во время раскрытия
    w.remove();
  };
  sync();
  addEventListener('resize', sync);
  if (document.fonts) document.fonts.ready.then(sync);
})();
