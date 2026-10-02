(() => {
  const WA_NUMBER = '5491158255145';
  const waURL = (text) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- Links de WhatsApp con mensaje precargado ---------- */
  $$('[data-wa]').forEach((a) => { a.href = waURL(a.dataset.wa); });

  /* ---------- Productos: tamaño del chipá → rinde + mensaje ---------- */
  const PER_KG = { 'pequeño': 25, mediano: 16, grande: 12 }; // aprox. unidades por kilo
  $$('[data-prod]').forEach((card) => {
    const kg = Number(card.dataset.kg);
    const yieldEl = $('[data-yield]', card);
    const btn = $('[data-wa-prod]', card);
    const update = () => {
      const size = ($('input[type=radio]:checked', card) || {}).value || 'mediano';
      yieldEl.textContent = `Rinde aprox. ${PER_KG[size] * kg} chipás`;
      btn.href = waURL(`Hola Etelvina! Quiero pedir una bolsa de ${kg} kg de chipá, tamaño ${size}.`);
    };
    card.addEventListener('change', update);
    update();
  });

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

  /* ---------- Reveal on scroll ---------- */
  if ('IntersectionObserver' in window) {
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
    $$('.reveal').forEach((el) => el.classList.add('is-in'));
  }

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
