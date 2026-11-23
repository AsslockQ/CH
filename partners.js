(() => {
  'use strict';

  /* =====================================================================
     КОНТРАКТ API ДЛЯ БЭКЕНДА
     Сейчас API.mode = 'demo': сервера нет, заказы вымышленные, пароль нигде не
     хранится и не проверяется. Когда сервер будет готов, ставим 'live'.

     POST /api/auth/register  {name, company, phone, email, password, consent} -> 201 {user}
     POST /api/auth/login     {login, password}   -> 200 {user} | 401 (одно общее сообщение)
     POST /api/auth/logout                        -> 204
     GET  /api/auth/me                            -> 200 {user} | 401
     GET  /api/orders  -> 200 {updatedAt, orders:[{id, title, stage (1..5), updatedAt}]}
     POST /api/partner-requests {name, company, phone, email, site, message, consent}

     user = {name, company}

     Требования к серверу:
     - сессия в cookie HttpOnly + Secure + SameSite, CSRF-защита на POST;
     - пароли хранятся только как хэш (Argon2id или bcrypt), лимит попыток входа;
     - /api/orders отдаёт заказы только текущего пользователя, привязка по подтверждённому контакту;
     - вебхук Битрикса лежит только на сервере (переменная окружения), в код сайта и в репозиторий не попадает;
     - стадии сделок Битрикса приводятся к stage 1..5 на сервере (таблица соответствия);
     - данные из CRM фронтенд выводит только как текст (textContent), не как HTML.
     ===================================================================== */
  const API = { mode: 'demo', base: '/api' };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('js');
  $('#year').textContent = new Date().getFullYear();

  /* безопасная сборка DOM: любые данные попадают в страницу как текст */
  const h = (tag, props = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else el.setAttribute(k, v);
    }
    kids.flat().forEach(c => c != null && el.append(c));
    return el;
  };

  /* ---------- мобильное меню ---------- */
  const burger = $('#burger'), nav = $('#nav');
  const scrim = h('div', { class: 'scrim' });
  document.body.appendChild(scrim);
  const setMenu = open => {
    scrim.classList.toggle('show', open);
    nav.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  scrim.addEventListener('click', () => setMenu(false));
  burger.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  $$('a', nav).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => e.key === 'Escape' && setMenu(false));

  /* ---------- появление блоков ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  /* ---------- проверка полей ---------- */
  const V = {
    name: v => v.trim().length >= 2 || 'Укажите имя',
    phone: v => v.replace(/\D/g, '').length >= 10 || 'Введите номер телефона',
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'Проверьте адрес почты',
    emailOpt: v => !v.trim() || V.email(v),
    login: v => V.email(v) === true || V.phone(v) === true || 'Введите телефон или почту',
    loginPw: v => v.length > 0 || 'Введите пароль',
    password: v => v.length >= 10 || 'Пароль не короче 10 символов',
    consent: v => v === true || 'Нужно согласие'
  };
  const check = el => {
    const rule = el.dataset.rule;
    if (!rule) return true;
    const res = V[rule](el.type === 'checkbox' ? el.checked : el.value);
    const box = el.closest('.field, .fchk');
    box.classList.toggle('err', res !== true);
    $('em', box).textContent = res === true ? '' : res;
    return res === true;
  };
  const validate = form => {
    const bad = $$('[data-rule]', form).filter(el => !check(el));
    bad[0]?.focus();
    return !bad.length;
  };
  const wireLive = form => $$('[data-rule]', form).forEach(el => {
    el.addEventListener('blur', () => (el.type === 'checkbox' || el.value) && check(el));
    el.addEventListener('input', () => el.closest('.field, .fchk').classList.contains('err') && check(el));
    el.addEventListener('change', () => el.type === 'checkbox' && check(el));
  });
  const formData = form => {
    const d = Object.fromEntries(new FormData(form));
    delete d.hp_url;
    if ('consent' in d || form.querySelector('[name=consent]')) d.consent = !!d.consent;
    return d;
  };

  /* ---------- слой API ---------- */
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const http = async (method, path, body) => {
    const r = await fetch(API.base + path, {
      method, credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    const data = r.status === 204 ? null : await r.json().catch(() => null);
    if (!r.ok) throw Object.assign(new Error(data?.message || 'Ошибка запроса'), { status: r.status });
    return data;
  };
  const SKEY = 'chp_demo_user';
  const demo = {
    me() { try { const u = JSON.parse(sessionStorage.getItem(SKEY)); return u && typeof u.name === 'string' ? { user: u } : null; } catch { return null; } },
    async register(d) { await wait(500); return this.keep({ name: d.name.trim(), company: (d.company || '').trim() }); },
    async login() { await wait(500); return this.keep({ name: 'Партнёр', company: 'Демо-аккаунт' }); },
    async logout() { await wait(150); try { sessionStorage.removeItem(SKEY); } catch { /* ок */ } },
    keep(user) { try { sessionStorage.setItem(SKEY, JSON.stringify(user)); } catch { /* ок */ } return { user }; },
    async orders() {
      await wait(600);
      const ago = n => new Date(Date.now() - n * 864e5).toISOString();
      return {
        updatedAt: new Date().toISOString(),
        orders: [
          { id: 'CH-1042', title: 'Zeekr 001, 2024', stage: 4, updatedAt: ago(1) },
          { id: 'CH-1038', title: 'Li Auto L9, 2023', stage: 5, updatedAt: ago(3) },
          { id: 'CH-1051', title: 'Geely Monjaro, 2024', stage: 2, updatedAt: ago(0) }
        ]
      };
    }
  };
  const live = API.mode === 'live';
  const api = {
    register: d => live ? http('POST', '/auth/register', d) : demo.register(d),
    login: d => live ? http('POST', '/auth/login', d) : demo.login(d),
    logout: () => live ? http('POST', '/auth/logout') : demo.logout(),
    me: async () => live ? http('GET', '/auth/me').catch(() => null) : demo.me(),
    orders: () => live ? http('GET', '/orders') : demo.orders(),
    request: d => live ? http('POST', '/partner-requests', d) : wait(600).then(() => console.info('Заявка (демо, не отправлена):', d))
  };

  /* ---------- кабинет ---------- */
  const STAGES = ['Запрос принят', 'Подбор и проверка', 'Экспертиза', 'Подготовка к экспорту', 'Отправка к границе'];
  const fmtDate = iso => { const d = new Date(iso); return isNaN(d) ? '—' : d.toLocaleDateString('ru-RU'); };
  const fmtTime = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); };

  const orderCard = o => {
    const st = Math.min(5, Math.max(1, Math.round(+o.stage) || 1));
    return h('article', { class: 'ord' },
      h('div', { class: 'ord__top' },
        h('div', {}, h('h4', { class: 'ord__t', text: String(o.title ?? 'Автомобиль') }), h('div', { class: 'ord__n', text: '№ ' + String(o.id ?? '') })),
        h('span', { class: 'ord__chip' + (st === 5 ? ' is-final' : ''), text: st === 5 ? 'В пути' : 'В работе' })),
      h('div', { class: 'prog', role: 'img', 'aria-label': `Этап ${st} из 5` }, STAGES.map((_, i) => h('i', { class: i < st ? 'on' : '' }))),
      h('div', { class: 'ord__foot' },
        h('span', { text: `Этап ${st} из 5 · ${STAGES[st - 1]}` }),
        h('span', { text: 'Обновлено ' + fmtDate(o.updatedAt) })));
  };

  let user = null, seq = 0;
  const list = $('#cabList'), note = $('#cabNote');
  const loadOrders = async () => {
    const mine = ++seq;
    list.setAttribute('aria-busy', 'true');
    list.replaceChildren(h('p', { class: 'cab__msg', text: 'Загружаем заказы…' }));
    note.textContent = '';
    try {
      const r = await api.orders();
      if (mine !== seq) return;
      const orders = Array.isArray(r?.orders) ? r.orders : [];
      list.replaceChildren(...(orders.length
        ? orders.map(orderCard)
        : [h('p', { class: 'cab__msg', text: 'Заказов пока нет. Когда менеджер создаст заказ, он появится здесь.' })]));
      note.textContent = (API.mode === 'demo' ? 'Демо-данные, заказы вымышленные. ' : '') + 'Статусы берутся из CRM. Обновлено в ' + fmtTime(r?.updatedAt || Date.now()) + '.';
    } catch (e) {
      if (mine !== seq) return;
      if (e.status === 401) { user = null; render(); return; }
      list.replaceChildren(h('p', { class: 'cab__msg' }, 'Не удалось загрузить заказы. ', h('button', { type: 'button', class: 'link', id: 'retry', text: 'Повторить' })));
    } finally {
      if (mine === seq) list.removeAttribute('aria-busy');
    }
  };
  list.addEventListener('click', e => e.target.id === 'retry' && loadOrders());

  const loginBtn = $('#loginBtn');
  const render = () => {
    const on = !!user;
    $('#cabGuest').hidden = on;
    $('#cabAuth').hidden = !on;
    loginBtn.textContent = on ? 'Кабинет' : 'Войти';
    if (on) {
      $('#cabName').textContent = user.name;
      $('#cabCo').textContent = user.company || '';
      loadOrders();
    } else seq++;
  };
  const goCabinet = () => $('#cabinet').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });

  $('#cabRefresh').addEventListener('click', loadOrders);
  $('#cabLogout').addEventListener('click', async () => {
    try { await api.logout(); } catch { /* сессию всё равно закрываем на странице */ }
    user = null; render();
  });

  /* ---------- окно входа ---------- */
  const dlg = $('#authDialog');
  const tabs = $$('[role=tab]', dlg);
  const panes = { login: $('#paneLogin'), register: $('#paneRegister') };
  if (API.mode !== 'demo') $('#demoNote').hidden = true;

  const setTab = name => {
    tabs.forEach(t => { const on = t.dataset.tab === name; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
    Object.entries(panes).forEach(([k, p]) => { p.hidden = k !== name; });
  };
  const openAuth = (tab = 'login') => {
    setMenu(false);
    setTab(tab);
    $$('.err', dlg).forEach(el => el.classList.remove('err'));
    $$('.form-err', dlg).forEach(el => { el.hidden = true; });
    if (!dlg.open) dlg.showModal();
    document.body.style.overflow = 'hidden';
    $('input:not(.hp)', panes[tab])?.focus();
  };
  dlg.addEventListener('close', () => { document.body.style.overflow = ''; });
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  $('#dlgClose').addEventListener('click', () => dlg.close());
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => setTab(t.dataset.tab));
    t.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      setTab(n.dataset.tab); n.focus();
    });
  });
  $$('[data-auth]').forEach(b => b.addEventListener('click', () => user ? (setMenu(false), goCabinet()) : openAuth(b.dataset.auth)));
  $$('.pw__t').forEach(b => b.addEventListener('click', () => {
    const inp = b.parentElement.querySelector('input');
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    b.textContent = show ? 'Скрыть' : 'Показать';
    b.setAttribute('aria-pressed', show);
  }));

  const submitAuth = (form, call) => form.addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('.form-err', form), btn = $('button[type=submit]', form);
    err.hidden = true;
    if (btn.classList.contains('is-busy') || !validate(form)) return;
    if ($('.hp', form).value) return; // бот
    btn.classList.add('is-busy');
    try {
      const res = await call(formData(form));
      user = res.user;
      form.reset();
      dlg.close();
      render();
      goCabinet();
    } catch (ex) {
      err.textContent = ex.status === 401 ? 'Неверный логин или пароль.'
        : ex.status === 409 ? 'Пользователь с такими данными уже зарегистрирован.'
        : 'Не удалось выполнить запрос. Попробуйте ещё раз.';
      err.hidden = false;
    } finally {
      btn.classList.remove('is-busy');
    }
  });
  submitAuth(panes.login, api.login);
  submitAuth(panes.register, api.register);
  Object.values(panes).forEach(wireLive);

  /* ---------- форма заявки ---------- */
  const apply = $('#applyForm'), ok = $('#applyOk');
  wireLive(apply);
  apply.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('button[type=submit]', apply);
    if (btn.classList.contains('is-busy') || !validate(apply)) return;
    if ($('.hp', apply).value) return;
    $('.form-err', apply).hidden = true;
    btn.classList.add('is-busy');
    try {
      await api.request(formData(apply));
      ok.hidden = false;
    } catch {
      $('.form-err', apply).hidden = false;
    } finally {
      btn.classList.remove('is-busy');
    }
  });
  $('#applyReset').addEventListener('click', () => { apply.reset(); ok.hidden = true; });

  /* ---------- старт ---------- */
  (async () => {
    const r = await api.me();
    user = r?.user ?? null;
    render();
  })();
})();
