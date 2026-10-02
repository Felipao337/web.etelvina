/* Chipás que caen: lluvia ligada al scroll + pila con física en el cierre */
(() => {
  const SPRITES = [
    { src: '/assets/img/chipa/chipa-1.webp', w: 402, h: 420 },
    { src: '/assets/img/chipa/chipa-2.webp', w: 411, h: 420 },
    { src: '/assets/img/chipa/chipa-3.webp', w: 386, h: 420 },
    { src: '/assets/img/chipa/chipa-4.webp', w: 420, h: 328 },
    { src: '/assets/img/chipa/chipa-5.webp', w: 395, h: 420 },
    { src: '/assets/img/chipa/chipa-6.webp', w: 420, h: 398 },
    { src: '/assets/img/chipa/chipa-7.webp', w: 420, h: 372 },
  ];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => window.innerWidth < 768;

  // PRNG con semilla para que la composición sea siempre la misma
  const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  /* ======================= LLUVIA EN SCROLL ======================= */
  const rains = [...document.querySelectorAll('[data-rain]')].map((layer, li) => {
    const rand = rng(li * 97 + 13);
    const total = Number(layer.dataset.rain) || 6;
    const count = isMobile() ? Math.ceil(total * 0.55) : total;
    const drops = [];
    for (let i = 0; i < count; i++) {
      const sp = SPRITES[i % SPRITES.length];
      const img = new Image();
      img.src = sp.src; img.alt = ''; img.decoding = 'async'; img.loading = 'lazy';
      // en mobile, sólo por los costados para no tapar textos
      // sólo por los costados, para no tapar títulos ni textos
      const x = isMobile() ? (i % 2 ? 80 + rand() * 6 : 2 + rand() * 6)
                           : (i % 2 ? 80 + rand() * 16 : -2 + rand() * 18);
      const size = isMobile() ? 34 + rand() * 18 : 56 + rand() * 46;
      const d = {
        img, x, size,
        speed: 0.75 + rand() * 0.9,            // vueltas por recorrido del scroll
        offset: rand(),                         // fase inicial
        rot: (rand() - 0.5) * 900,              // grados de giro por recorrido
        rot0: rand() * 360,
        sway: 10 + rand() * 30,
        swayF: 1 + rand() * 2,
      };
      img.style.setProperty('--s', `${size}px`);
      img.style.left = `${x}%`;
      layer.appendChild(img);
      drops.push(d);
    }
    return { layer, section: layer.parentElement, drops, active: false };
  });

  const paintRain = (r) => {
    const rect = r.section.getBoundingClientRect();
    const vh = window.innerHeight;
    const H = rect.height;
    const p = (vh - rect.top) / (vh + H); // 0 → entra por abajo, 1 → sale por arriba
    r.drops.forEach((d) => {
      const span = H + d.size * 2;
      const t = reduce ? d.offset : (((p * d.speed + d.offset) % 1) + 1) % 1;
      const y = t * span - d.size;
      const x = reduce ? 0 : Math.sin((p * d.swayF + d.offset) * Math.PI * 2) * d.sway;
      const a = d.rot0 + (reduce ? 0 : p * d.rot);
      d.img.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${a}deg)`;
    });
  };

  if (rains.length) {
    let ticking = false;
    const frame = () => { ticking = false; rains.forEach((r) => { if (r.active) paintRain(r); }); };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
    const io = new IntersectionObserver((ents) => ents.forEach((en) => {
      const r = rains.find((x) => x.section === en.target);
      r.active = en.isIntersecting;
      if (r.active) paintRain(r);
    }), { rootMargin: '200px 0px' });
    rains.forEach((r) => { io.observe(r.section); paintRain(r); });
    if (!reduce) {
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
    }
  }

  /* ======================= PILA CON FÍSICA ======================= */
  const zone = document.querySelector('[data-pile-zone]');
  const canvas = document.querySelector('[data-pile]');
  if (!zone || !canvas) return;

  if (reduce) {
    // sin animación: una pila quieta
    const img = document.createElement('img');
    img.src = '/assets/img/chipa/chipa-1.webp'; img.alt = ''; img.className = 'pile-static';
    img.style.cssText = 'position:absolute;left:var(--gutter);bottom:8px;width:72px;z-index:0;pointer-events:none';
    zone.appendChild(img);
    return;
  }

  const loadMatter = () => new Promise((res, rej) => {
    if (window.Matter) return res(window.Matter);
    const s = document.createElement('script');
    s.src = '/assets/js/vendor/matter.min.js';
    s.onload = () => res(window.Matter); s.onerror = rej;
    document.head.appendChild(s);
  });

  const images = SPRITES.map((sp) => { const i = new Image(); i.src = sp.src; return i; });

  let started = false;
  const start = async () => {
    if (started) return; started = true;
    const M = await loadMatter();
    const { Engine, Bodies, Body, Composite, Query, Events } = M;
    const engine = Engine.create({ gravity: { y: 1.7 } });
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    let W = 0, H = 0, dpr = 1;
    let walls = [];

    const size = () => {
      const r = zone.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 3);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      Composite.remove(engine.world, walls);
      const t = 200;
      walls = [
        Bodies.rectangle(W / 2, H + t / 2, W * 3, t, { isStatic: true }),           // piso
        Bodies.rectangle(-t / 2, H / 2 - 1000, t, H + 2400, { isStatic: true }),    // pared izq
        Bodies.rectangle(W + t / 2, H / 2 - 1000, t, H + 2400, { isStatic: true }), // pared der
      ];
      Composite.add(engine.world, walls);
    };
    size();

    const rand = rng(7);
    const N = isMobile() ? 18 : 24;
    const chipas = [];
    // caen desde el borde superior de lo que se ve en pantalla, en una tanda corta
    const visTop = Math.max(0, -zone.getBoundingClientRect().top);
    for (let i = 0; i < N; i++) {
      const sp = SPRITES[i % SPRITES.length];
      const w = isMobile() ? 40 + rand() * 18 : 58 + rand() * 30;
      const h = w * (sp.h / sp.w);
      const x = W * 0.06 + rand() * W * 0.88;
      const y = visTop - h - rand() * 60;
      const body = Bodies.rectangle(x, y, w * 0.92, h * 0.9, {
        chamfer: { radius: Math.min(w, h) * 0.45 },
        restitution: 0.3, friction: 0.5, frictionAir: 0.004, density: 0.002,
        angle: rand() * Math.PI * 2,
      });
      Body.setVelocity(body, { x: (rand() - 0.5) * 2, y: 4 + rand() * 4 });
      Body.setAngularVelocity(body, (rand() - 0.5) * 0.12);
      body.sprite = i % SPRITES.length; body.w = w; body.h = h;
      chipas.push(body);
    }
    chipas.forEach((b, i) => setTimeout(() => Composite.add(engine.world, b), i * 65));

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, 0, W, H);
      chipas.forEach((b) => {
        const img = images[b.sprite];
        if (!img.complete) return;
        ctx.save();
        ctx.translate(b.position.x, b.position.y);
        ctx.rotate(b.angle);
        ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4;
        ctx.drawImage(img, -b.w / 2, -b.h / 2, b.w, b.h);
        ctx.restore();
      });
    };

    // interacción: el mouse empuja; un toque hace saltar al chipá
    let pointer = null;
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = canvas.getBoundingClientRect();
      pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
    });
    zone.addEventListener('pointerleave', () => { pointer = null; });
    zone.addEventListener('pointerdown', (e) => {
      const r = canvas.getBoundingClientRect();
      const pt = { x: e.clientX - r.left, y: e.clientY - r.top };
      const hit = Query.point(chipas, pt)[0];
      if (hit) {
        Body.setVelocity(hit, { x: (Math.random() - 0.5) * 8, y: -14 - Math.random() * 6 });
        Body.setAngularVelocity(hit, (Math.random() - 0.5) * 0.5);
      }
    });
    Events.on(engine, 'beforeUpdate', () => {
      if (!pointer) return;
      chipas.forEach((b) => {
        const dx = b.position.x - pointer.x, dy = b.position.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 90 * 90 && d2 > 1) {
          const f = 0.0009 * b.mass;
          Body.applyForce(b, b.position, { x: (dx / Math.sqrt(d2)) * f, y: -Math.abs(f) * 0.6 });
        }
      });
    });

    // loop sólo mientras la sección se ve
    let running = false, last = 0, raf = 0;
    const loop = (t) => {
      const dt = Math.min(32, t - (last || t)); last = t;
      Engine.update(engine, dt || 16.7);
      draw();
      raf = requestAnimationFrame(loop);
    };
    const run = (on) => {
      if (on && !running) { running = true; last = 0; raf = requestAnimationFrame(loop); }
      if (!on && running) { running = false; cancelAnimationFrame(raf); }
    };
    new IntersectionObserver(([en]) => run(en.isIntersecting)).observe(zone);
    run(true);

    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        const oldW = W; size();
        if (Math.abs(oldW - W) > 1) chipas.forEach((b) => Body.setPosition(b, { x: Math.min(W - 20, Math.max(20, b.position.x * (W / oldW))), y: b.position.y }));
      }, 150);
    });
  };

  // carga diferida: se prepara al acercarse y empieza a caer cuando se ve
  new IntersectionObserver(([en], obs) => {
    if (en.isIntersecting) { loadMatter().catch(() => {}); obs.disconnect(); }
  }, { rootMargin: '600px 0px' }).observe(zone);
  const trigger = zone.querySelector('.cierre__abuela') || zone;
  new IntersectionObserver(([en], obs) => {
    if (en.isIntersecting) { start(); obs.disconnect(); }
  }, { threshold: 0.4 }).observe(trigger);
})();
