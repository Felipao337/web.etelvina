/* Cómo llega: chipás → bolsa → sello → camión → mapa. Todo atado al scroll. */
(() => {
  const root = document.querySelector('[data-viaje]');
  if (!root) return;
  const $ = (s) => root.querySelector(s);
  const $$ = (s) => [...root.querySelectorAll(s)];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeIn = (t) => t * t * t;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeBack = (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  const easeFall = (t) => (t < 0.82 ? Math.pow(t / 0.82, 2) : 1 - Math.sin(((t - 0.82) / 0.18) * Math.PI) * 0.04);

  const track = $('.viaje__track');
  const steps = $$('.viaje__steps li');
  const segs = $$('[data-viaje-seg]');
  const BOUNDS = [0, 0.3, 0.42, 0.74, 1];
  const chipas = $$('.vj-chipa').map((el, i) => ({
    el, i, x: +el.dataset.x, y: +el.dataset.y, r: +el.dataset.r,
    x0: +el.dataset.x + ((i % 3) - 1) * 40, y0: -90 - (i % 4) * 30,
  }));
  const zip = $('.vj-zip-reveal');
  const stamp = $('.vj-stamp');
  const bag = $('.vj-bag');
  const truck = $('.vj-truck');
  const door = $('.vj-door');
  const speed = $('.vj-speed');
  const wheels = $$('.vj-wheel');
  const s1 = $('.vj-s1');
  const s2 = $('.vj-s2');
  const routeDraw = $('.vj-route-draw');
  const mini = $('.vj-mini');
  const pin = $('.vj-pin');
  const dest = $('.vj-dest');
  const cities = $('.vj-cities');
  const stops = $$('.vj-stop');
  const origin = $('.vj-origin');

  // geometría del recorrido para mover el camioncito
  const measure = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  measure.setAttribute('d', root.dataset.route);
  const routeLen = measure.getTotalLength();
  routeDraw.style.strokeDasharray = `${routeLen} ${routeLen}`;
  stops.forEach((g) => {
    const c = g.querySelector('circle'); const cx = +c.getAttribute('cx'), cy = +c.getAttribute('cy');
    let best = 0, bd = Infinity;
    for (let l = 0; l <= routeLen; l += routeLen / 200) { const q = measure.getPointAtLength(l); const d = (q.x - cx) ** 2 + (q.y - cy) ** 2; if (d < bd) { bd = d; best = l; } }
    g._t = best / routeLen;
  });
  const pinXY = pin.getAttribute('transform').match(/translate\(([\d.]+) ([\d.]+)\)/).slice(1).map(Number);

  const TRUCK_OFF = 760; // desde la derecha
  const svg = root.querySelector('.viaje__svg');
  const VB0 = [205, 170, 615, 430], VBM = [150, 150, 380, 460], VB1 = [262, 8, 400, 620], VB2 = [420, 96, 150, 176]; // escena → mapa → zoom al recorrido
  let lastStep = -1;

  const render = (p) => {
    // 1 · chipás que caen a la bolsa
    chipas.forEach((c) => {
      const t = seg(p, 0.015 + c.i * 0.017, 0.125 + c.i * 0.017);
      const y = lerp(c.y0, c.y, easeFall(t));
      const x = lerp(c.x0, c.x, easeOut(t));
      const r = c.r * (1 - t) + c.r * 0.2;
      c.el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${r.toFixed(1)})`);
      c.el.style.opacity = t > 0 ? 1 : 0;
    });

    // 2 · se cierra y se sella
    zip.setAttribute('width', (230 * easeInOut(seg(p, 0.3, 0.38))).toFixed(1));
    const st = easeBack(seg(p, 0.36, 0.42));
    stamp.setAttribute('transform', `translate(410 488) rotate(${(-14 * st).toFixed(1)}) scale(${st.toFixed(3)})`);

    // 3 · llega el camión, abre, carga la bolsa, cierra y se va
    const tin = easeOut(seg(p, 0.42, 0.53));
    const tout = easeIn(seg(p, 0.66, 0.74));
    const tx = lerp(TRUCK_OFF, 0, tin) + lerp(0, 820, tout);
    truck.setAttribute('transform', `translate(${tx.toFixed(1)} 0)`);
    const roll = (-tx / 32) * (180 / Math.PI);
    wheels.forEach((w) => w.setAttribute('transform', `translate(${w.dataset.cx} ${w.dataset.cy}) rotate(${roll.toFixed(1)})`));
    const moving = (p > 0.42 && p < 0.53) || (p > 0.66 && p < 0.74);
    speed.setAttribute('opacity', moving ? '1' : '0');
    const open = seg(p, 0.53, 0.56) - seg(p, 0.62, 0.65);
    door.setAttribute('width', (62 * clamp(open)).toFixed(1));
    const load = easeInOut(seg(p, 0.555, 0.625));
    // la bolsa viaja hasta la puerta del camión y se achica
    const bx = lerp(0, 505 - 340, load), by = lerp(0, 400 - 400, load), bs = lerp(1, 0.18, load);
    bag.setAttribute('transform', `translate(${(340 + bx).toFixed(1)} ${(400 + by).toFixed(1)}) scale(${bs.toFixed(3)}) translate(-340 -400)`);
    bag.style.opacity = load >= 0.999 ? 0 : 1;

    // 4 · mapa: de Corrientes a tu comercio
    s1.setAttribute('opacity', (1 - seg(p, 0.71, 0.76)).toFixed(3));
    root.classList.toggle('is-map', p > 0.74);
    s2.setAttribute('opacity', seg(p, 0.73, 0.79).toFixed(3));
    const z1 = easeInOut(seg(p, 0.72, 0.79));   // de la escena al país entero
    const z2 = easeInOut(seg(p, 0.79, 0.84)) - easeInOut(seg(p, 0.955, 1)); // acercar al recorrido y volver a abrir
    const narrow = window.innerWidth < 960;
    const zs = narrow ? 1 - easeInOut(seg(p, 0.4, 0.5)) : 0; // en mobile arranca con la bolsa en primer plano
    const vb = VB0.map((v, i) => lerp(lerp(lerp(v, VBM[i], zs), VB1[i], z1), VB2[i], clamp(z2)));
    svg.setAttribute('viewBox', vb.map((v) => v.toFixed(1)).join(' '));
    // los textos y el camioncito mantienen su tamaño en pantalla aunque haya zoom
    const zoomK = vb[2] / VB1[2];
    root.style.setProperty('--vj-k', zoomK.toFixed(3));
    origin.setAttribute('transform', `translate(${origin.dataset.x} ${origin.dataset.y}) scale(${zoomK.toFixed(3)})`);
    stops.forEach((g) => g.querySelector('circle').setAttribute('r', (4.5 * zoomK).toFixed(2)));
    cities.querySelectorAll('circle').forEach((c) => c.setAttribute('r', (4.5 * zoomK).toFixed(2)));
    mini.firstElementChild.setAttribute('transform', `scale(${zoomK.toFixed(3)}) translate(-26 -36) scale(0.125)`);
    const tr = easeInOut(seg(p, 0.83, 0.95));
    routeDraw.style.strokeDashoffset = (routeLen * (1 - tr)).toFixed(1);
    const pt = measure.getPointAtLength(routeLen * tr);
    mini.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
    mini.setAttribute('opacity', p > 0.78 && tr < 1 ? '1' : '0');
    stops.forEach((g) => g.setAttribute('opacity', tr >= g._t ? '1' : '0'));
    const pp = easeBack(seg(p, 0.945, 0.97));
    pin.setAttribute('transform', `translate(${pinXY[0]} ${pinXY[1]}) scale(${(pp * zoomK).toFixed(3)})`);
    dest.setAttribute('opacity', seg(p, 0.95, 0.975).toFixed(3));
    cities.setAttribute('opacity', seg(p, 0.96, 1).toFixed(3));

    // textos y barra
    const step = p < 0.3 ? 0 : p < 0.42 ? 1 : p < 0.74 ? 2 : 3;
    if (step !== lastStep) { steps.forEach((li, i) => li.classList.toggle('is-on', i === step)); lastStep = step; }
    segs.forEach((el, i) => el.style.setProperty('--f', seg(p, BOUNDS[i], BOUNDS[i + 1]).toFixed(3)));
  };

  if (reduce) { render(1); steps.forEach((li) => li.classList.add('is-on')); return; }

  let ticking = false, active = false;
  const progress = () => {
    const r = track.getBoundingClientRect();
    const stage = root.querySelector('.viaje__stage').offsetHeight;
    return clamp(-r.top / Math.max(1, r.height - stage));
  };
  const frame = () => { ticking = false; render(progress()); };
  const onScroll = () => { if (active && !ticking) { ticking = true; requestAnimationFrame(frame); } };
  new IntersectionObserver(([en]) => { active = en.isIntersecting; if (active) frame(); }, { rootMargin: '100px 0px' }).observe(root);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  render(0);
})();
