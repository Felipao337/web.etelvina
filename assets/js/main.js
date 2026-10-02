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
  const PER_KG = { 'pequeño': 25, mediano: 16, grande: 12 }; // aprox. unidades por kilo
  const IMG = { 1: '/assets/img/bolsa-1kg-640.webp', 2: '/assets/img/bolsa-2kg-640.webp', 5: '/assets/img/bolsa-5kg-640.webp' };
  const MAX_QTY = 50;
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
  const sendBtn = $('[data-order-send]');
  const nameIn = $('[data-order-name]');
  const zoneIn = $('[data-order-zone]');

  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const totals = () => order.reduce((a, l) => ({ bags: a.bags + l.qty, kg: a.kg + l.qty * l.kg }), { bags: 0, kg: 0 });
  const orderText = () => {
    const lines = order.map((l) => `• ${l.qty} × bolsa de ${l.kg} kg, chipá ${l.size}`);
    const t = totals();
    let msg = `Hola Etelvina! Quiero hacer este pedido:\n${lines.join('\n')}\nTotal: ${t.bags} ${t.bags === 1 ? 'bolsa' : 'bolsas'} (${t.kg} kg)`;
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
    kgEl.textContent = `${t.kg} kg`;
    totalEl.textContent = `${t.bags} ${t.bags === 1 ? 'bolsa' : 'bolsas'} · ${t.kg} kg`;
    const has = t.bags > 0;
    bar.hidden = false;
    bar.classList.toggle('is-visible', has);
    document.body.classList.toggle('has-order', has);
    empty.hidden = has;
    sendBtn.setAttribute('aria-disabled', String(!has));
    sendBtn.href = has ? waURL(orderText()) : '#';
    list.innerHTML = order.map((l, i) => {
      const label = `una bolsa de ${l.kg} kg ${l.size}`;
      return `<li class="line" data-i="${i}"><img src="${IMG[l.kg]}" alt="" width="56" height="56"><div><div class="line__t">Bolsa ${l.kg} kg</div><div class="line__s">${cap(l.size)} · ≈ ${PER_KG[l.size] * l.kg * l.qty} chipás</div></div>${qtyControl(l.qty, label)}</li>`;
    }).join('');
  };

  const add = (kg, size, qty) => {
    const ex = order.find((l) => l.kg === kg && l.size === size);
    if (ex) ex.qty = Math.min(MAX_QTY, ex.qty + qty); else order.push({ kg, size, qty });
    render();
    countEl.classList.remove('bump'); void countEl.offsetWidth; countEl.classList.add('bump');
  };

  $$('[data-prod]').forEach((card) => {
    const kg = Number(card.dataset.kg);
    const yieldEl = $('[data-yield]', card);
    const val = $('[data-qty-val]', card);
    const dec = $('[data-dec]', card);
    const inc = $('[data-inc]', card);
    const addBtn = $('[data-add]', card);
    let qty = 1;
    const size = () => ($('input[type=radio]:checked', card) || {}).value || 'mediano';
    const sync = () => {
      val.textContent = qty;
      dec.disabled = qty <= 1; inc.disabled = qty >= MAX_QTY;
      const n = PER_KG[size()] * kg;
      yieldEl.textContent = qty > 1 ? `≈ ${n * qty} chipás en total` : `≈ ${n} chipás por bolsa`;
      addBtn.textContent = qty > 1 ? `Agregar ${qty} bolsas al pedido` : 'Agregar al pedido';
    };
    card.addEventListener('change', sync);
    dec.addEventListener('click', () => { qty = Math.max(1, qty - 1); sync(); });
    inc.addEventListener('click', () => { qty = Math.min(MAX_QTY, qty + 1); sync(); });
    addBtn.addEventListener('click', () => {
      add(kg, size(), qty);
      addBtn.classList.add('is-added');
      addBtn.textContent = '¡Agregado!';
      setTimeout(() => { addBtn.classList.remove('is-added'); qty = 1; sync(); }, 1300);
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

  /* ---------- Carrusel de productos (mobile): dots ---------- */
  const rail = $('[data-rail]');
  const dots = $$('[data-rail-dots] span');
  if (rail && dots.length) {
    const cards = $$('.prod', rail);
    rail.addEventListener('scroll', () => {
      const mid = rail.scrollLeft + rail.clientWidth / 2;
      let idx = 0, best = Infinity;
      cards.forEach((c, i) => {
        const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
        if (d < best) { best = d; idx = i; }
      });
      dots.forEach((d, i) => d.classList.toggle('is-on', i === idx));
    }, { passive: true });
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
    const submit = $('[data-submit]', form);
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

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fields = $$('input:not([name=web]), select, textarea', form);
      const ok = fields.map(showErr).every(Boolean);
      if (!ok) { const first = $('.is-invalid input, .is-invalid select', form); if (first) first.focus(); return; }

      submit.disabled = true;
      const label = submit.textContent;
      submit.textContent = 'Enviando…';
      status.className = 'form__status';
      status.textContent = '';
      try {
        const data = Object.fromEntries(new FormData(form).entries());
        const res = await fetch(form.action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(String(res.status));
        form.classList.add('is-sent');
        const done = document.createElement('div');
        done.className = 'form-done';
        done.innerHTML = '<img src="/assets/brand/ico-aprobado-azul.svg" alt="" width="140" height="140"><h4>¡Gracias por escribirnos!</h4><p>Ya estamos con vos. Te respondemos a la brevedad con precios y días de entrega.</p>';
        form.prepend(done);
        done.setAttribute('tabindex', '-1');
        done.focus();
      } catch (err) {
        status.className = 'form__status is-error';
        status.innerHTML = 'No pudimos enviar el formulario. Probá de nuevo o <a href="' + waURL('Hola Etelvina! Tengo un comercio y quiero hacer un pedido mayorista.') + '" target="_blank" rel="noopener">escribinos por WhatsApp</a>.';
        submit.disabled = false;
        submit.textContent = label;
      }
    });
  }

  const y = $('[data-year]');
  if (y) y.textContent = new Date().getFullYear();
})();
