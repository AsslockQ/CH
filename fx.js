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
