// Vercel Serverless Function — formulario mayorista
// Envía el formulario por email usando Resend (https://resend.com).
//
// Variables de entorno (Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY  (obligatoria)  API key de Resend
//   CONTACT_TO      (opcional)     destino; por defecto ventas@etelvina.com
//   CONTACT_FROM    (opcional)     remitente verificado en Resend,
//                                  ej. "Web Etelvina <web@tradicionetelvina.com>"

const FIELDS = {
  comercio: 'Comercio',
  nombre: 'Contacto',
  email: 'Email',
  telefono: 'Teléfono',
  tipo: 'Tipo de comercio',
  localidad: 'Localidad',
  volumen: 'Volumen mensual',
  mensaje: 'Mensaje',
};
const REQUIRED = ['comercio', 'nombre', 'email', 'telefono', 'tipo', 'localidad'];

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  // Honeypot: si un bot completó el campo oculto, respondemos OK sin enviar nada.
  if (body.web) return res.status(200).json({ ok: true });

  const data = {};
  for (const k of Object.keys(FIELDS)) data[k] = String(body[k] ?? '').trim().slice(0, 2000);

  const missing = REQUIRED.filter((k) => !data[k]);
  if (missing.length || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return res.status(400).json({ ok: false, error: 'invalid', missing });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error('Falta RESEND_API_KEY');
    return res.status(500).json({ ok: false, error: 'not_configured' });
  }

  const to = process.env.CONTACT_TO || 'ventas@etelvina.com';
  const from = process.env.CONTACT_FROM || 'Web Etelvina <onboarding@resend.dev>';

  const rows = Object.entries(FIELDS)
    .filter(([k]) => data[k])
    .map(([k, label]) => `<tr><td style="padding:8px 16px 8px 0;color:#5b6b7f;vertical-align:top">${label}</td><td style="padding:8px 0;color:#163355"><strong>${esc(data[k]).replace(/\n/g, '<br>')}</strong></td></tr>`)
    .join('');
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;background:#F3F3E9;padding:24px">
    <h2 style="font-family:Georgia,serif;color:#163355;font-weight:400;margin:0 0 16px">Nueva consulta mayorista</h2>
    <table style="border-collapse:collapse">${rows}</table>
  </div>`;
  const text = Object.entries(FIELDS).filter(([k]) => data[k]).map(([k, l]) => `${l}: ${data[k]}`).join('\n');

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: data.email,
        subject: `Consulta mayorista: ${data.comercio} (${data.localidad})`,
        html,
        text,
      }),
    });
    if (!r.ok) {
      console.error('Resend error', r.status, await r.text());
      return res.status(502).json({ ok: false, error: 'send_failed' });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ ok: false, error: 'send_failed' });
  }
}
