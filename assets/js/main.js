(() => {
  const WA_NUMBER = '5491158255145';
  const waURL = (text) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- Reveal on scroll ---------- */
  if ('IntersectionObserver' in window) {
    document.documentElement.classList.add('reveal-on');
    window.__etelvinaOK = true;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    $$('.reveal').forEach((el, i) => {
      // pequeño escalonado entre hermanos
      const sib = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
      el.style.transitionDelay = `${Math.min(sib.indexOf(el), 4) * 70}ms`;
      io.observe(el);
    });
  } else {
    document.documentElement.classList.remove('reveal-on');
  }

  window.addEventListener('error', () => { $$('.reveal').forEach((el) => el.classList.add('is-in')); });

  /* ---------- Links de WhatsApp con mensaje precargado ---------- */
  $$('[data-wa]').forEach((a) => { a.href = waURL(a.dataset.wa); });

  /* ---------- Pedido: bolsas + tamaño + cantidad → un solo WhatsApp ---------- */
  const PER_KG = { 'pequeño': 40, mediano: 16, grande: 12 }; // aprox. unidades por kilo
  const IMG = { 1: 1, 2: 1, 5: 1 }; // bolsas disponibles
  const SLUG = { 'pequeño': 'pequeno', mediano: 'mediano', grande: 'grande' };
  // cada bolsa tiene foto propia para cada tamaño de chipá
  const imgFor = (kg, size) => `/assets/img/bolsa-${kg}kg-${SLUG[size]}-640.webp?v=3`;
  const MAX_QTY = 50;
  const cardSyncs = [];
  const store = {
    get() { try { return JSON.parse(localStorage.getItem('etelvina-pedido') || '[]'); } catch { return []; } },
    set(v) { try { localStorage.setItem('etelvina-pedido', JSON.stringify(v)); } catch { /* sin storage */ } },
  };
  let order = store.get().filter((l) => IMG[l.kg] && PER_KG[l.size] && l.qty > 0);

  const bar = $('[data-order-bar]');
  const countEl = $('[data-order-count]');
  const kgEl = $('[data-order-kg]');
  const drawer = $('[data-drawer]');
  const list = $('[data-order-list]');
  const empty = $('[data-order-empty]');
  const totalEl = $('[data-order-total]');
  const totalSub = $('[data-order-total-sub]');
  const sendBtn = $('[data-order-send]');
  const nameIn = $('[data-order-name]');
  const zoneIn = $('[data-order-zone]');

  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const PRICE = { 1: 19000, 2: 22000, 5: 22000 }; // precio por bolsa, en pesos
  const money = (n) => '$' + n.toLocaleString('es-AR');
  const totals = () => order.reduce((a, l) => ({ bags: a.bags + l.qty, kg: a.kg + l.qty * l.kg, price: a.price + l.qty * PRICE[l.kg] }), { bags: 0, kg: 0, price: 0 });
  const orderText = () => {
    const lines = order.map((l) => `• ${l.qty} × bolsa de ${l.kg} kg, chipá ${l.size} — ${money(l.qty * PRICE[l.kg])}`);
    const t = totals();
    let msg = `Hola Etelvina! Quiero hacer este pedido:\n${lines.join('\n')}\nTotal: ${t.bags} ${t.bags === 1 ? 'bolsa' : 'bolsas'} (${t.kg} kg) — ${money(t.price)}`;
    const n = nameIn.value.trim(); const z = zoneIn.value.trim();
    if (n) msg += `\nNombre: ${n}`;
    if (z) msg += `\nZona: ${z}`;
    return msg;
  };

  const qtyControl = (val, label) => `<div class="qty"><button type="button" data-line-dec aria-label="Restar ${label}">−</button><output>${val}</output><button type="button" data-line-inc aria-label="Sumar ${label}"${val >= MAX_QTY ? ' disabled' : ''}>+</button></div>`;

  const render = () => {
    const t = totals();
    store.set(order);
    countEl.textContent = t.bags;
    kgEl.textContent = money(t.price);
    totalEl.textContent = money(t.price);
    totalSub.textContent = `${t.bags} ${t.bags === 1 ? 'bolsa' : 'bolsas'} · ${t.kg} kg`;
    const has = t.bags > 0;
    bar.hidden = false;
    bar.classList.toggle('is-visible', has);
    document.body.classList.toggle('has-order', has);
    empty.hidden = has;
    sendBtn.setAttribute('aria-disabled', String(!has));
    sendBtn.href = has ? waURL(orderText()) : '#';
    list.innerHTML = order.map((l, i) => {
      const label = `una bolsa de ${l.kg} kg ${l.size}`;
      return `<li class="line" data-i="${i}"><img src="${imgFor(l.kg, l.size)}" alt="" width="56" height="56"><div><div class="line__t">Bolsa ${l.kg} kg</div><div class="line__s">${cap(l.size)} · ${money(l.qty * PRICE[l.kg])}</div></div>${qtyControl(l.qty, label)}</li>`;
    }).join('');
    cardSyncs.forEach((f) => f());
  };

  const add = (kg, size, qty) => {
    const ex = order.find((l) => l.kg === kg && l.size === size);
    if (ex) ex.qty = Math.min(MAX_QTY, ex.qty + qty); else order.push({ kg, size, qty });
    render();
    countEl.classList.remove('bump'); void countEl.offsetWidth; countEl.classList.add('bump');
  };

  // cada bolsa refleja el pedido: el contador muestra cuántas hay de ese tamaño
  const qtyOf = (kg, size) => (order.find((l) => l.kg === kg && l.size === size) || {}).qty || 0;
  const setQty = (kg, size, q) => {
    const prev = qtyOf(kg, size);
    q = Math.max(0, Math.min(MAX_QTY, q));
    const ex = order.find((l) => l.kg === kg && l.size === size);
    if (ex) ex.qty = q; else if (q > 0) order.push({ kg, size, qty: q });
    order = order.filter((l) => l.qty > 0);
    render();
    if (q > prev) { countEl.classList.remove('bump'); void countEl.offsetWidth; countEl.classList.add('bump'); }
  };

  $$('[data-prod]').forEach((card) => {
    const kg = Number(card.dataset.kg);
    const yieldEl = $('[data-yield]', card);
    const val = $('[data-qty-val]', card);
    const dec = $('[data-dec]', card);
    const inc = $('[data-inc]', card);
    const addBtn = $('[data-add]', card);
    const size = () => ($('input[type=radio]:checked', card) || {}).value || 'mediano';
    const photo = $('[data-prod-img]', card);
    if (photo) Object.values(SLUG).forEach((sl) => { const im = new Image(); im.src = `/assets/img/bolsa-${kg}kg-${sl}-640.webp?v=3`; });
    const sync = () => {
      const s = size(); const q = qtyOf(kg, s); const n = PER_KG[s] * kg;
      if (photo) {
        const base = `/assets/img/bolsa-${kg}kg-${SLUG[s]}`;
        if (!photo.src.includes(base)) {
          photo.srcset = `${base}-640.webp?v=3 640w, ${base}-1200.webp?v=3 1200w`;
          photo.src = `${base}-640.webp?v=3`;
          photo.alt = `Bolsa de ${kg} kg de chipá Etelvina, tamaño ${s}`;
        }
      }
      val.textContent = q;
      dec.disabled = q <= 0; inc.disabled = q >= MAX_QTY;
      yieldEl.textContent = q > 1 ? `≈ ${n * q} chipás en total` : `≈ ${n} chipás por bolsa`;
      addBtn.textContent = q > 0 ? 'Ver pedido' : 'Agregar al pedido';
      addBtn.classList.toggle('btn--ghost', q > 0);
      addBtn.classList.toggle('btn--primary', q === 0);
    };
    cardSyncs.push(sync);
    card.addEventListener('change', sync);
    dec.addEventListener('click', () => setQty(kg, size(), qtyOf(kg, size()) - 1));
    inc.addEventListener('click', () => setQty(kg, size(), qtyOf(kg, size()) + 1));
    addBtn.addEventListener('click', () => {
      if (qtyOf(kg, size()) > 0) { openDrawer(); return; }
      setQty(kg, size(), 1);
    });
    sync();
  });

  list.addEventListener('click', (e) => {
    const btn = e.target.closest('button'); if (!btn) return;
    const li = btn.closest('[data-i]'); const l = order[Number(li.dataset.i)];
    if (btn.hasAttribute('data-line-inc')) l.qty = Math.min(MAX_QTY, l.qty + 1);
    if (btn.hasAttribute('data-line-dec')) l.qty -= 1;
    order = order.filter((x) => x.qty > 0);
    render();
    if (!order.length) closeDrawer();
  });
  [nameIn, zoneIn].forEach((el) => el.addEventListener('input', () => { if (order.length) sendBtn.href = waURL(orderText()); }));

  let lastFocus = null;
  const openDrawer = () => {
    lastFocus = document.activeElement;
    drawer.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => { drawer.classList.add('is-open'); $('.drawer__x', drawer).focus(); });
  };
  function closeDrawer() {
    drawer.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => { drawer.hidden = true; }, 450);
    if (lastFocus) lastFocus.focus();
  }
  $('[data-order-open]').addEventListener('click', openDrawer);
  $$('[data-drawer-close]', drawer).forEach((el) => el.addEventListener('click', closeDrawer));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !drawer.hidden) closeDrawer(); });
  render();

  /* ---------- Header ---------- */
  const header = $('[data-header]');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Menú mobile ---------- */
  const menu = $('[data-menu]');
  const toggle = $('[data-menu-toggle]');
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    $('.sr', toggle).textContent = open ? 'Cerrar menú' : 'Abrir menú';
    document.body.classList.toggle('menu-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add('is-open'));
    } else {
      menu.classList.remove('is-open');
      setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 350);
    }
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) setMenu(false); });
  window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  /* ---------- Nav activa ---------- */
  const links = $$('.nav__list a');
  if (links.length && 'IntersectionObserver' in window) {
    const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const nio = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        const a = map.get(en.target.id);
        if (a && en.isIntersecting) { links.forEach((l) => l.classList.remove('is-active')); a.classList.add('is-active'); }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) nio.observe(s); });
  }

  /* ---------- Carrusel de productos (mobile): swipe manual + pase automático ---------- */
  const rail = $('[data-rail]');
  const dots = $$('[data-rail-dots] button');
  if (rail && dots.length) {
    const cards = $$('.prod', rail);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scrollable = () => rail.scrollWidth > rail.clientWidth + 4;
    const pad = () => parseFloat(getComputedStyle(rail).scrollPaddingInlineStart) || 0;
    let idx = 0;
    const current = () => {
      let best = 0, d = Infinity;
      cards.forEach((c, i) => { const x = Math.abs(c.offsetLeft - pad() - rail.scrollLeft); if (x < d) { d = x; best = i; } });
      return best;
    };
    const go = (i) => { idx = (i + cards.length) % cards.length; rail.scrollTo({ left: cards[idx].offsetLeft - pad(), behavior: 'smooth' }); };
    let raf = 0;
    rail.addEventListener('scroll', () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { idx = current(); dots.forEach((d, i) => d.classList.toggle('is-on', i === idx)); });
    }, { passive: true });
    dots.forEach((d, i) => d.addEventListener('click', () => { pause(); go(i); }));

    // pase automático: sólo en mobile, con el carrusel a la vista y sin que el usuario lo esté usando
    let timer = 0, visible = false, idleUntil = 0, stopped = false;
    const INTERVAL = 4200, IDLE = 9000;
    const tick = () => {
      clearTimeout(timer);
      if (stopped || reduceMotion) return;
      timer = setTimeout(() => {
        if (visible && scrollable() && Date.now() > idleUntil && !document.hidden) go(idx + 1);
        tick();
      }, INTERVAL);
    };
    function pause() { idleUntil = Date.now() + IDLE; }
    ['pointerdown', 'touchstart', 'wheel', 'focusin'].forEach((ev) => rail.addEventListener(ev, pause, { passive: true }));
    // si eligió tamaño, cantidad o agregó al pedido, no lo movemos más
    rail.addEventListener('change', () => { stopped = true; });
    rail.addEventListener('click', (e) => { if (e.target.closest('button')) stopped = true; });
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) idleUntil = Date.now() + 2000; }, { threshold: 0.6 }).observe(rail);
    tick();
  }

  /* ---------- WhatsApp flotante ---------- */
  const fab = $('[data-wa-float]');
  if (fab && 'IntersectionObserver' in window) {
    let pastHero = false, atEnd = false;
    const sync = () => fab.classList.toggle('is-visible', pastHero && !atEnd);
    new IntersectionObserver(([en]) => { pastHero = !en.isIntersecting; sync(); }).observe($('.hero__ctas'));
    new IntersectionObserver(([en]) => { atEnd = en.isIntersecting; sync(); }, { threshold: 0.15 }).observe($('#contacto'));
  }

  /* ---------- Formulario mayorista ---------- */
  const form = $('[data-form]');
  if (form) {
    const status = $('[data-status]', form);
    const msgs = {
      valueMissing: 'Completá este dato.',
      typeMismatch: 'Revisá que esté bien escrito.',
    };
    const showErr = (field) => {
      const wrap = field.closest('.field');
      let err = $('.field__err', wrap);
      if (field.validity.valid) { wrap.classList.remove('is-invalid'); if (err) err.remove(); return true; }
      wrap.classList.add('is-invalid');
      if (!err) { err = document.createElement('span'); err.className = 'field__err'; wrap.appendChild(err); }
      err.textContent = field.validity.valueMissing ? msgs.valueMissing : msgs.typeMismatch;
      return false;
    };
    $$('input, select, textarea', form).forEach((f) => f.addEventListener('blur', () => { if (f.closest('.field.is-invalid')) showErr(f); }));

    // Modo híbrido: la consulta se arma con los datos y se abre en WhatsApp o en el mail del usuario
    const MAIL_TO = 'ventas@etelvina.com';
    const LABELS = { comercio: 'Comercio', tipo: 'Tipo', nombre: 'Contacto', telefono: 'Teléfono', email: 'Email', localidad: 'Localidad', volumen: 'Volumen mensual', mensaje: 'Mensaje' };
    const buildLines = (d) => Object.entries(LABELS).filter(([k]) => (d[k] || '').trim()).map(([k, l]) => `${l}: ${d[k].trim()}`);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (($('[name=web]', form) || {}).value) return; // bot
      const fields = $$('input:not([name=web]), select, textarea', form);
      const ok = fields.map(showErr).every(Boolean);
      if (!ok) { const first = $('.is-invalid input, .is-invalid select', form); if (first) first.focus(); return; }

      const channel = (e.submitter && e.submitter.dataset.channel) || 'wa';
      const d = Object.fromEntries(new FormData(form).entries());
      const lines = buildLines(d);
      let url;
      if (channel === 'mail') {
        const subject = `Consulta mayorista: ${d.comercio.trim()} (${d.localidad.trim()})`;
        const body = `Hola Etelvina!\n\nTengo un comercio y quiero recibir precios mayoristas y días de entrega.\n\n${lines.join('\n')}\n`;
        url = `mailto:${MAIL_TO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = url;
      } else {
        url = waURL(`Hola Etelvina! Tengo un comercio y quiero hacer un pedido mayorista.\n\n${lines.join('\n')}`);
        window.open(url, '_blank', 'noopener');
      }

      const app = channel === 'mail' ? 'tu mail' : 'WhatsApp';
      status.className = 'form__status is-ok';
      status.innerHTML = `Te abrimos ${app} con la consulta lista: solo falta tocar <strong>Enviar</strong>. ¿No se abrió? <a href="${url}"${channel === 'mail' ? '' : ' target="_blank" rel="noopener"'}>Probá de nuevo</a>${channel === 'mail' ? ` o escribinos a <a href="mailto:${MAIL_TO}">${MAIL_TO}</a>` : ''}.`;
    });
  }

  const y = $('[data-year]');
  if (y) y.textContent = new Date().getFullYear();
})();
