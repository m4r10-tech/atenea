(() => {
  'use strict';

  const TZ = 'Europe/Madrid';
  const PHONE = '925 23 27 50';
  const OPEN = 8 * 60 + 15;   // 8:15
  const CLOSE = 24 * 60;      // 24:00
  // 0 = domingo … 6 = sábado. Martes cerrado (Google Maps).
  const SCHEDULE = { 0: [OPEN, CLOSE], 1: [OPEN, CLOSE], 2: null, 3: [OPEN, CLOSE], 4: [OPEN, CLOSE], 5: [OPEN, CLOSE], 6: [OPEN, CLOSE] };
  const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const pad = (n) => String(n).padStart(2, '0');
  const fmtMin = (m) => `${Math.floor(m / 60) % 24}:${pad(m % 60)}`;

  /* ---------- Hora de Toledo ---------- */
  const partsFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', weekday: 'short'
  });
  const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  // Para probar: ?t=2026-10-13T23:59 (hora de Toledo). El reloj avanza desde ahí.
  let offsetMs = 0;
  const override = new URLSearchParams(location.search).get('t');
  if (override && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(override)) {
    const [d, t] = override.split('T');
    const [y, mo, da] = d.split('-').map(Number);
    const [h, mi, se = 0] = t.split(':').map(Number);
    const target = Date.UTC(y, mo - 1, da, h, mi, se);
    const now = madridParts(new Date());
    const nowAsUtc = Date.UTC(now.y, now.mo - 1, now.d, now.h, now.mi, now.s);
    offsetMs = target - nowAsUtc;
  }

  function madridParts(date) {
    const p = {};
    for (const { type, value } of partsFmt.formatToParts(date)) p[type] = value;
    return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, s: +p.second, dow: WD[p.weekday] };
  }
  const now = () => madridParts(new Date(Date.now() + offsetMs));

  function computeStatus(t) {
    const mins = t.h * 60 + t.mi + t.s / 60;
    const today = SCHEDULE[t.dow];
    if (today && mins >= today[0] && mins < today[1]) {
      const left = today[1] - mins;
      return { open: true, soon: left <= 60, secs: Math.round(left * 60), closeAt: today[1], progress: (mins - today[0]) / (today[1] - today[0]) };
    }
    let days = 0;
    let next = null;
    if (today && mins < today[0]) next = today;
    while (!next && days < 7) { days++; next = SCHEDULE[(t.dow + days) % 7]; }
    const secs = Math.round((days * 1440 + next[0] - mins) * 60);
    return { open: false, soon: secs <= 3600, secs, days, nextDow: (t.dow + days) % 7, openAt: next[0], progress: mins >= CLOSE || (today && mins >= today[1]) ? 1 : 0 };
  }

  function whenText(st) {
    if (st.days === 0) return `hoy a las ${fmtMin(st.openAt)}`;
    if (st.days === 1) return `mañana a las ${fmtMin(st.openAt)}`;
    return `el ${DAYS[st.nextDow]} a las ${fmtMin(st.openAt)}`;
  }

  const ui = {
    pill: $('[data-status-pill]'), pillText: $('[data-status-text]'),
    card: $('[data-status-card]'), badge: $('[data-status-badge]'), time: $('[data-local-time]'),
    label: $('[data-countdown-label]'), h: $('[data-h]'), m: $('[data-m]'), s: $('[data-s]'),
    progress: $('[data-progress]'), note: $('[data-status-note]'), dock: $('[data-dock-status]')
  };
  let lastDow = -1;

  function renderStatus() {
    const t = now();
    const st = computeStatus(t);
    const cls = st.open ? (st.soon ? 'is-open is-soon' : 'is-open') : 'is-closed';
    const state = st.open ? (st.soon ? 'Cierra pronto' : 'Abierto ahora') : (st.soon ? 'Abre en breve' : 'Cerrado ahora');

    let pill;
    if (st.open) pill = `Abierto · cierra a las ${st.closeAt === CLOSE ? '24:00' : fmtMin(st.closeAt)}`;
    else pill = `Cerrado · abre ${whenText(st)}`;

    for (const el of [ui.pill, ui.card, ui.dock]) {
      if (!el) continue;
      el.classList.remove('is-open', 'is-closed', 'is-soon');
      cls.split(' ').forEach((c) => el.classList.add(c));
    }
    if (ui.pillText) ui.pillText.textContent = pill;
    if (ui.dock) ui.dock.querySelector('b').textContent = st.open ? 'Abierto' : 'Cerrado';
    ui.badge.textContent = state;
    ui.time.textContent = `${pad(t.h)}:${pad(t.mi)}`;
    ui.label.textContent = st.open
      ? 'Quedan para el cierre de hoy, a medianoche:'
      : `Volvemos a abrir ${whenText(st)}. Faltan:`;

    const hh = Math.floor(st.secs / 3600);
    const mm = Math.floor((st.secs % 3600) / 60);
    const ss = st.secs % 60;
    ui.h.textContent = pad(hh); ui.m.textContent = pad(mm); ui.s.textContent = pad(ss);
    ui.progress.style.width = `${Math.min(100, Math.max(0, st.progress * 100)).toFixed(2)}%`;

    if (t.dow === 2) ui.note.textContent = 'Los martes descansamos. Te esperamos el miércoles desde las 8:15.';
    else if (!st.open && t.dow === 1 && t.h * 60 + t.mi >= CLOSE - 1) ui.note.textContent = 'Mañana martes es día de descanso.';
    else if (st.open && st.soon) ui.note.textContent = 'Última hora del día: buen momento para la última caña.';
    else ui.note.textContent = '';

    if (t.dow !== lastDow) {
      lastDow = t.dow;
      $$('[data-week] li').forEach((li) => {
        const today = +li.dataset.day === t.dow;
        li.classList.toggle('is-today', today);
        if (today) li.setAttribute('aria-current', 'date'); else li.removeAttribute('aria-current');
      });
      setDateBounds(t);
    }
  }
  /* ---------- Navegación ---------- */
  const nav = $('#nav');
  const dock = $('.dock');
  const hero = $('#inicio');
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('is-solid', y > 40);
    if (dock) dock.classList.toggle('is-visible', y > hero.offsetHeight * 0.55);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const burger = $('#burger');
  const menu = $('#menu');
  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    document.body.style.overflow = open ? 'hidden' : '';
    nav.classList.toggle('is-solid', open || window.scrollY > 40);
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
    } else {
      menu.classList.remove('is-open');
      setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, reduceMotion ? 0 : 700);
    }
  }
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  $$('#menu a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') setMenu(false); });

  const links = $$('.nav__links a');
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      links.forEach((a) => a.classList.toggle('is-current', a.getAttribute('href') === `#${en.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach((s) => spy.observe(s));

  /* ---------- Aparición y contadores ---------- */
  const reveal = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-in');
      reveal.unobserve(en.target);
    });
  }, { threshold: 0.05, rootMargin: '0px 0px 8% 0px' });
  $$('.reveal').forEach((el, i) => {
    el.style.transitionDelay = `${(i % 3) * 60}ms`;
    reveal.observe(el);
  });

  function countUp(el) {
    const target = parseFloat(el.dataset.count);
    const dec = +(el.dataset.decimals || 0);
    const show = (v) => { el.textContent = v.toFixed(dec).replace('.', ','); };
    if (reduceMotion) return show(target);
    const dur = 1600;
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      show(target * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const counter = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      countUp(en.target);
      counter.unobserve(en.target);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach((el) => counter.observe(el));

  /* ---------- Carta: filtros ---------- */
  const tabs = $$('.tabs [role="tab"]');
  tabs.forEach((tab) => tab.addEventListener('click', () => {
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
    const f = tab.dataset.filter;
    $$('[data-dishes] .dish').forEach((d) => {
      const show = f === 'todo' || d.dataset.cat === f;
      d.classList.toggle('is-hidden', !show);
      if (show) d.classList.add('is-in');
    });
  }));

  /* ---------- Galería ---------- */
  const car = $('[data-carousel]');
  const bar = $('[data-carousel-progress]');
  const slideStep = () => {
    const s = car.querySelector('.slide');
    return s ? s.getBoundingClientRect().width + 14 : 300;
  };
  const updateBar = () => {
    const max = car.scrollWidth - car.clientWidth;
    const vis = car.clientWidth / car.scrollWidth;
    bar.style.width = `${vis * 100}%`;
    bar.style.transform = `translateX(${max > 0 ? (car.scrollLeft / max) * ((1 - vis) / vis) * 100 : 0}%)`;
  };
  car.addEventListener('scroll', updateBar, { passive: true });
  window.addEventListener('resize', updateBar);
  updateBar();

  const go = (dir) => {
    const max = car.scrollWidth - car.clientWidth - 4;
    if (dir > 0 && car.scrollLeft >= max) car.scrollTo({ left: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    else car.scrollBy({ left: dir * slideStep(), behavior: reduceMotion ? 'auto' : 'smooth' });
  };
  $('[data-prev]').addEventListener('click', () => { stopAuto(); go(-1); });
  $('[data-next]').addEventListener('click', () => { stopAuto(); go(1); });
  car.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); stopAuto(); go(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); stopAuto(); go(-1); }
  });

  // Arrastrar con ratón (en táctil ya hace scroll nativo)
  let drag = null;
  let dragged = false;
  car.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    drag = { x: e.clientX, left: car.scrollLeft };
    dragged = false;
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 5) { dragged = true; car.classList.add('is-drag'); stopAuto(); }
    car.scrollLeft = drag.left - dx;
  });
  window.addEventListener('pointerup', () => {
    if (!drag) return;
    drag = null;
    if (car.classList.contains('is-drag')) {
      car.classList.remove('is-drag');
      const i = Math.round(car.scrollLeft / slideStep());
      car.scrollTo({ left: i * slideStep(), behavior: 'smooth' });
    }
  });
  car.addEventListener('click', (e) => { if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; } }, true);
  car.addEventListener('touchstart', () => stopAuto(), { passive: true });

  let autoTimer = null;
  let carVisible = false;
  function startAuto() { if (reduceMotion || autoTimer === false) return; clearInterval(autoTimer); autoTimer = setInterval(() => { if (carVisible && !document.hidden) go(1); }, 4500); }
  function stopAuto() { clearInterval(autoTimer); autoTimer = false; }
  new IntersectionObserver(([en]) => { carVisible = en.isIntersecting; if (carVisible && autoTimer === null) startAuto(); }, { threshold: 0.4 }).observe(car);
  car.addEventListener('mouseenter', () => { if (autoTimer) clearInterval(autoTimer); });
  car.addEventListener('mouseleave', () => { if (autoTimer !== false) { autoTimer = null; startAuto(); } });

  // Lightbox
  const lb = $('[data-lb]');
  const lbImg = $('[data-lb-img]');
  let lastFocus = null;
  $$('[data-lightbox]').forEach((b) => b.addEventListener('click', () => {
    lastFocus = b;
    lbImg.src = b.dataset.lightbox;
    lbImg.alt = b.querySelector('img').alt;
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    $('[data-lb-close]').focus();
  }));
  const closeLb = () => { lb.hidden = true; document.body.style.overflow = ''; if (lastFocus) lastFocus.focus(); };
  $('[data-lb-close]').addEventListener('click', closeLb);
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !lb.hidden) closeLb(); });

  /* ---------- Reseñas ---------- */
  const qWrap = $('[data-quotes]');
  const quotes = $$('.quote', qWrap);
  const dots = $('[data-quote-dots]');
  let qi = 0;
  let qTimer;
  quotes.forEach((q, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-label', `Reseña ${i + 1} de ${quotes.length}`);
    b.setAttribute('aria-selected', String(i === 0));
    b.addEventListener('click', () => showQuote(i, true));
    dots.appendChild(b);
  });
  const dotBtns = $$('button', dots);
  function showQuote(i, user) {
    qi = (i + quotes.length) % quotes.length;
    quotes.forEach((q, j) => q.classList.toggle('is-active', j === qi));
    dotBtns.forEach((d, j) => {
      d.setAttribute('aria-selected', 'false');
      if (j === qi) { void d.offsetWidth; d.setAttribute('aria-selected', 'true'); }
    });
    if (user) restartQuotes();
  }
  function restartQuotes() {
    clearInterval(qTimer);
    if (!reduceMotion) qTimer = setInterval(() => { if (!qWrap.classList.contains('is-paused')) showQuote(qi + 1); }, 6000);
  }
  qWrap.addEventListener('mouseenter', () => qWrap.classList.add('is-paused'));
  qWrap.addEventListener('mouseleave', () => qWrap.classList.remove('is-paused'));
  let sx = null;
  qWrap.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
  qWrap.addEventListener('touchend', (e) => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 40) showQuote(qi + (dx < 0 ? 1 : -1), true);
    sx = null;
  });
  restartQuotes();

  /* ---------- Reservas ---------- */
  const form = $('#reserva');
  const fDia = $('#f-dia');
  const fHora = $('#f-hora');
  const fPers = $('#f-personas');
  const confirmBox = $('[data-confirm]');
  let todayISO = '';

  function setDateBounds(t) {
    todayISO = `${t.y}-${pad(t.mo)}-${pad(t.d)}`;
    fDia.min = todayISO;
    const max = new Date(Date.UTC(t.y, t.mo - 1, t.d + 90));
    fDia.max = max.toISOString().slice(0, 10);
    if (!fDia.value) {
      // Propuesta por defecto: hoy si aún queda margen, si no el siguiente día abierto
      let add = 0;
      const mins = t.h * 60 + t.mi;
      if (!SCHEDULE[t.dow] || mins > CLOSE - 60) add = 1;
      while (!SCHEDULE[(t.dow + add) % 7]) add++;
      const d = new Date(Date.UTC(t.y, t.mo - 1, t.d + add));
      fDia.value = d.toISOString().slice(0, 10);
    }
    fillHours();
  }

  function dowOf(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  }

  function fillHours() {
    const prev = fHora.value;
    fHora.innerHTML = '';
    const iso = fDia.value;
    const dow = iso ? dowOf(iso) : null;
    const sched = dow === null ? [OPEN, CLOSE] : SCHEDULE[dow];
    if (!sched) {
      fHora.add(new Option('Martes: cerrado', ''));
      fHora.disabled = true;
      return;
    }
    fHora.disabled = false;
    const t = now();
    const nowMins = t.h * 60 + t.mi;
    const isToday = iso === todayISO;
    fHora.add(new Option('Elige hora', ''));
    const times = [sched[0]];
    for (let m = 8 * 60 + 30; m <= sched[1] - 30; m += 30) times.push(m);
    let any = false;
    times.forEach((m) => {
      if (isToday && m < nowMins + 30) return;
      const o = new Option(fmtMin(m), fmtMin(m));
      fHora.add(o);
      any = true;
    });
    if (!any) { fHora.innerHTML = ''; fHora.add(new Option('Hoy ya no quedan horas', '')); }
    if ([...fHora.options].some((o) => o.value === prev && prev)) fHora.value = prev;
    else if (!prev) {
      const pref = [...fHora.options].find((o) => o.value === '21:00') || [...fHora.options].find((o) => o.value === '14:00');
      if (pref) fHora.value = pref.value;
    }
  }
  fDia.addEventListener('change', () => { fillHours(); validateField('dia'); });

  $$('[data-step]').forEach((b) => b.addEventListener('click', () => {
    const v = Math.min(30, Math.max(1, (parseInt(fPers.value, 10) || 0) + +b.dataset.step));
    fPers.value = v;
    validateField('personas');
  }));

  const rules = {
    nombre: () => form.nombre.value.trim().length >= 2 || 'Escribe tu nombre.',
    personas: () => {
      const n = parseInt(fPers.value, 10);
      if (!n || n < 1) return 'Indica cuántas personas.';
      if (n > 30) return 'Para más de 30, llama directamente.';
      return true;
    },
    telefono: () => {
      const d = form.telefono.value.replace(/[\s.\-()]/g, '').replace(/^(\+34|0034)/, '');
      return /^[6789]\d{8}$/.test(d) || 'Escribe un teléfono de 9 cifras.';
    },
    dia: () => {
      const v = fDia.value;
      if (!v) return 'Elige un día.';
      if (v < todayISO) return 'Esa fecha ya ha pasado.';
      if (v > fDia.max) return 'Reservas hasta 90 días vista.';
      if (dowOf(v) === 2) return 'Los martes cerramos. Elige otro día.';
      return true;
    },
    hora: () => !!fHora.value || 'Elige una hora.'
  };

  function validateField(name) {
    const res = rules[name]();
    const err = $(`[data-err="${name}"]`);
    const field = err.closest('.field');
    const ok = res === true;
    err.textContent = ok ? '' : res;
    field.classList.toggle('has-error', !ok);
    const input = field.querySelector('input, select');
    if (input) input.setAttribute('aria-invalid', String(!ok));
    return ok;
  }
  Object.keys(rules).forEach((name) => {
    const el = name === 'personas' ? fPers : name === 'dia' ? fDia : name === 'hora' ? fHora : form[name];
    el.addEventListener('blur', () => validateField(name));
    el.addEventListener('input', () => { if (el.closest('.field').classList.contains('has-error')) validateField(name); });
  });
  fHora.addEventListener('change', () => validateField('hora'));

  let summaryText = '';
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const results = Object.keys(rules).map(validateField);
    if (results.includes(false)) {
      const first = form.querySelector('.has-error input, .has-error select');
      if (first) first.focus();
      return;
    }
    const [, m, d] = fDia.value.split('-').map(Number);
    const fecha = `${DAYS[dowOf(fDia.value)]} ${d} de ${MONTHS[m - 1]}`;
    const n = parseInt(fPers.value, 10);
    const nombre = form.nombre.value.trim();
    const nota = form.nota.value.trim();
    summaryText = `Reserva en Cervecería Atenea: ${n} ${n === 1 ? 'persona' : 'personas'}, ${fecha} a las ${fHora.value}, a nombre de ${nombre}. Teléfono: ${form.telefono.value.trim()}.${nota ? ` Nota: ${nota}` : ''}`;
    const s = $('[data-summary]');
    s.innerHTML = '';
    const add = (txt, hl) => {
      if (!hl) return s.append(txt);
      const el = document.createElement('span');
      el.textContent = txt;
      s.append(el);
    };
    add('Mesa para '); add(`${n}`, true); add(`, el ${fecha} a las `); add(fHora.value, true); add(`, a nombre de ${nombre}. Llama al ${PHONE} para confirmarla.`);
    confirmBox.hidden = false;
    confirmBox.focus();
  });

  $('[data-edit]').addEventListener('click', () => { confirmBox.hidden = true; form.nombre.focus(); });
  $('[data-copy]').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      toast('Datos copiados');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = summaryText; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('Datos copiados'); } catch { toast('No se pudo copiar'); }
      ta.remove();
    }
  });

  const toastEl = $('[data-toast]');
  let toastT;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-show');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('is-show'), 2200);
  }

  $('[data-year]').textContent = now().y;

  renderStatus();
  setInterval(renderStatus, 1000);
})();
