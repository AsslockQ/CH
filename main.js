(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  document.documentElement.classList.add('js');
  $('#year').textContent = new Date().getFullYear();

  /* ---------- mobile menu ---------- */
  const burger = $('#burger'), nav = $('#nav');
  const scrim = document.createElement('div');
  scrim.className = 'scrim';
  document.body.appendChild(scrim);
  scrim.addEventListener('click', () => setMenu(false));
  const setMenu = open => {
    scrim.classList.toggle('show', open);
    nav.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  $$('a', nav).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => e.key === 'Escape' && setMenu(false));

  /* ---------- reveal on scroll + count-up ---------- */
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => io.observe(el));
  const tio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); }), { threshold: .4 });
  tio.observe($('#timeline'));

  $$('[data-count]').forEach(el => {
    if (reduce) return;
    const to = +el.dataset.count, suf = el.dataset.suffix || '';
    const t0 = performance.now(), dur = 1200;
    const tick = t => {
      const p = Math.min(1, (t - t0) / dur), v = Math.round(to * (1 - Math.pow(1 - p, 3)));
      el.textContent = v + suf;
      if (p < 1) requestAnimationFrame(tick);
    };
    el.textContent = '0' + suf; requestAnimationFrame(tick);
  });

  /* ---------- hotspots ---------- */
  const spots = {
    engine: ['Двигатель и компрессия', 'Двигатель, компрессия, цилиндры, ходовая и компьютерная диагностика — в составе экспертизы до 250 пунктов.'],
    ecu:    ['Электронные блоки', 'Считываем ошибки блоков управления, проверяем пробег по данным электроники и работу бортовых систем.'],
    salon:  ['Салон', 'Состояние обивки, ремней, подушек безопасности, климата и мультимедиа. Сверяем комплектацию с заявленной.'],
    paint:  ['ЛКП и толщиномер', 'Замеряем толщину покрытия по каждой детали, находим перекрасы и кузовной ремонт.'],
    crash:  ['Следы ДТП, пожара и затопления', 'Проверяем геометрию кузова, сварные швы, скрытые следы воды и огня под обшивкой.']
  };
  const card = $('#infocard'), title = $('#infoTitle'), text = $('#infoText');
  const hs = $$('.hs');
  // позиция карточки рядом с нужной точкой (не перекрывает остальные точки и подписи)
  const pos = { engine: ['3%', '14%'], ecu: ['19%', '17%'], salon: ['71%', '17%'], paint: ['33%', '41%'], crash: ['72%', '33%'] };
  let cur = 'engine', timer;
  const pick = id => {
    if (id === cur) return;
    cur = id;
    hs.forEach(h => h.classList.toggle('is-active', h.dataset.id === id));
    card.classList.add('swap');
    clearTimeout(timer);
    timer = setTimeout(() => {
      [title.textContent, text.textContent] = spots[id];
      card.style.setProperty('--cx', pos[id][0]); card.style.setProperty('--cy', pos[id][1]);
      requestAnimationFrame(() => card.classList.remove('swap'));
    }, 260);
  };
  hs.forEach(h => {
    h.addEventListener('click', () => pick(h.dataset.id));
    h.addEventListener('mouseenter', () => matchMedia('(hover:hover)').matches && pick(h.dataset.id));
  });

  /* ---------- этапы проверки: подсветка номера при наведении ---------- */
  const lv = $$('.level');
  lv.forEach(l => {
    const on = () => { lv.forEach(x => x.classList.toggle('is-on', x === l)); };
    l.addEventListener('mouseenter', on);
    l.addEventListener('focusin', on);
  });

  /* ---------- generic accordions ---------- */
  $$('.acc__btn').forEach(b => b.addEventListener('click', () => {
    b.setAttribute('aria-expanded', b.getAttribute('aria-expanded') !== 'true');
  }));

  /* ---------- steps ---------- */
  const steps = $$('.step'), sImg = $('#stepsImg'), badge = $('#stepsBadge');
  let stepTimer;

  const activateStep = (s, i) => {
    if (s.classList.contains('is-open')) return;
    steps.forEach(x => {
      x.classList.remove('is-open');
      $('.step__head', x).setAttribute('aria-expanded', 'false');
    });
    s.classList.add('is-open');
    $('.step__head', s).setAttribute('aria-expanded', 'true');
    const name = $('.step__t', s).textContent.trim();
    badge.textContent = `Этап ${i + 1} из 5 · ${name}`;
    sImg.classList.add('fade');
    clearTimeout(stepTimer);
    stepTimer = setTimeout(() => {
      sImg.src = s.dataset.img;
      sImg.style.objectPosition = s.dataset.pos;
      sImg.classList.remove('fade');
    }, 260);
  };

  steps.forEach((s, i) => {
    const btn = $('.step__head', s);
    btn.addEventListener('click', () => activateStep(s, i));
    s.addEventListener('mouseenter', () => {
      if (matchMedia('(hover:hover)').matches) activateStep(s, i);
    });
  });
  badge.textContent = 'Этап 1 из 5 · Получаем ваш запрос';

  /* ---------- carousel (бесконечная, автопрокрутка, точки) ---------- */
  const sl = $('#slider'), prev = $('#prev'), next = $('#next'), dotsEl = $('#dots');
  const orig = $$('.slide', sl), N = orig.length;
  const mk = (n, cls) => { const c = n.cloneNode(true); c.setAttribute('aria-hidden', 'true'); c.dataset.clone = cls; return c; };
  orig.slice().reverse().forEach(n => sl.prepend(mk(n, 'b')));
  orig.forEach(n => sl.append(mk(n, 'a')));
  sl.classList.add('js-car');
  const all = () => $$('.slide', sl);
  const gap = 16;
  const sw = () => orig[0].offsetWidth + gap;
  const setW = () => N * sw();                    // ширина одного набора
  const noSnap = fn => { sl.style.scrollSnapType = 'none'; fn(); requestAnimationFrame(() => requestAnimationFrame(() => sl.style.scrollSnapType = '')); };
  const startPos = () => noSnap(() => sl.scrollLeft = setW());
  const curIdx = () => Math.round(sl.scrollLeft / sw()) - N;   // индекс относительно оригиналов (может быть вне 0..N-1)
  const idx = () => ((curIdx() % N) + N) % N;
  const dots = orig.map((_, i) => {
    const b = document.createElement('button');
    b.setAttribute('aria-label', 'Фото ' + (i + 1)); b.setAttribute('role', 'tab');
    b.addEventListener('click', () => { goTo(i); restart(); });
    dotsEl.appendChild(b); return b;
  });
  const mark = () => {
    const i = idx(), c = Math.round(sl.scrollLeft / sw());
    dots.forEach((d, k) => d.classList.toggle('on', k === i));
    all().forEach((s, k) => s.classList.toggle('is-cur', k === c));
  };
  const wrap = () => {                              // бесшовный переход через клоны
    const w = setW();
    if (sl.scrollLeft < w * .5) noSnap(() => sl.scrollLeft += w);
    else if (sl.scrollLeft > w * 1.5) noSnap(() => sl.scrollLeft -= w);
  };
  const goTo = i => { const t = (N + i) * sw(); sl.scrollTo({ left: t, behavior: 'smooth' }); };
  const by = d => sl.scrollTo({ left: Math.round(sl.scrollLeft / sw() + d) * sw(), behavior: 'smooth' });
  let scrollT;
  sl.addEventListener('scroll', () => { mark(); clearTimeout(scrollT); scrollT = setTimeout(wrap, 120); }, { passive: true });
  prev.addEventListener('click', () => { by(-1); restart(); });
  next.addEventListener('click', () => { by(1); restart(); });
  sl.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { by(1); restart(); }
    if (e.key === 'ArrowLeft') { by(-1); restart(); }
  });
  // перетаскивание мышью
  let down = false, sx = 0, sl0 = 0;
  sl.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; sx = e.clientX; sl0 = sl.scrollLeft; sl.style.scrollSnapType = 'none'; sl.style.cursor = 'grabbing'; });
  addEventListener('pointermove', e => { if (down) sl.scrollLeft = sl0 - (e.clientX - sx); });
  addEventListener('pointerup', () => {
    if (!down) return; down = false; sl.style.cursor = '';
    sl.style.scrollSnapType = ''; by(0);
  });
  // автопрокрутка: пауза при наведении, фокусе, скрытой вкладке и reduced-motion
  let autoT, hover = false;
  const play = () => { clearInterval(autoT); if (reduce) return; autoT = setInterval(() => { if (!hover && !down && !document.hidden) by(1); }, 4200); };
  const restart = play;
  sl.addEventListener('mouseenter', () => hover = true);
  sl.addEventListener('mouseleave', () => hover = false);
  sl.addEventListener('focusin', () => hover = true);
  sl.addEventListener('focusout', () => hover = false);
  addEventListener('resize', () => { startPos(); mark(); });
  addEventListener('load', () => { startPos(); mark(); });
  startPos(); mark(); play();

  /* ---------- calculator ---------- */
  const price = $('#carPrice'), inv = $('#invoice'), FEE = 11000;
  const fmt = n => n.toLocaleString('ru-RU').replace(/ /g, ' ');
  const recalc = () => {
    const digits = price.value.replace(/\D/g, '').slice(0, 9);
    const n = +digits || 0;
    price.value = digits ? fmt(n) : '';
    inv.textContent = fmt(n + FEE) + ' ¥';
  };
  price.addEventListener('input', recalc);
  price.addEventListener('focus', () => price.select());
  price.style.width = '8.5ch';

  /* ---------- FAQ ---------- */
  $$('.q').forEach(q => $('button', q).addEventListener('click', () => {
    const open = !q.classList.contains('is-open');
    $$('.q').forEach(x => { x.classList.remove('is-open'); $('button', x).setAttribute('aria-expanded', 'false'); });
    if (open) { q.classList.add('is-open'); $('button', q).setAttribute('aria-expanded', 'true'); }
  }));

  /* ---------- form ---------- */
  const form = $('#leadForm'), ok = $('#formOk');
  const rules = {
    name: v => v.trim().length >= 2 || 'Укажите имя',
    contact: v => {
      const t = v.trim();
      const phone = t.replace(/\D/g, '').length >= 10;
      const tg = /^@?[A-Za-z0-9_]{5,32}$/.test(t);
      return phone || tg || 'Телефон или @username в Telegram';
    },
    qty: v => !v || /^\d{1,4}$/.test(v.trim()) || 'Только число'
  };
  const check = el => {
    const f = el.closest('.field'), r = rules[el.name];
    const res = r ? r(el.value) : true;
    f.classList.toggle('err', res !== true);
    $('em', f).textContent = res === true ? '' : res;
    return res === true;
  };
  $$('input', form).forEach(i => {
    i.addEventListener('blur', () => i.value && check(i));
    i.addEventListener('input', () => i.closest('.field')?.classList.contains('err') && check(i));
  });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const valid = $$('.field input', form).map(check).every(Boolean);
    if (!valid) { $('.field.err input', form)?.focus(); return; }
    const data = Object.fromEntries(new FormData(form));
    if (data.website) return; // honeypot
    delete data.website;
    const btn = $('button[type=submit]', form); btn.disabled = true;
    // TODO: заменить на реальный endpoint (Telegram-бот / CRM / почта)
    console.info('Заявка (прототип):', data);
    await new Promise(r => setTimeout(r, 600));
    btn.disabled = false; ok.hidden = false;
  });
  $('#formReset').addEventListener('click', () => { form.reset(); ok.hidden = true; });
})();
