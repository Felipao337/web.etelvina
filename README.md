# Etelvina — landing

Landing de **Etelvina, chipá tradicional estilo correntino**. Producción: https://tradicionetelvina.com

Sitio estático (HTML + CSS + JS, sin build) con una función serverless para el formulario mayorista. Hosting en Vercel, conectado a este repo: cada push a `main` publica solo.

## Estructura

```
index.html              página única (mobile-first)
assets/css/styles.css   estilos y tokens del manual de marca
assets/js/main.js       WhatsApp, selector de tamaño, menú, formulario, animaciones
assets/brand/           logos, ícono y personaje (SVG del Brand Kit)
assets/img/             fotos optimizadas (webp, 2 tamaños c/u)
assets/fonts/           Caveat (OFL, self-hosted)
api/contact.js          envía el formulario mayorista por email (Resend)
vercel.json             headers, caché y redirect www → raíz
```

## Marca (Manual de Marca, Not Registered Studio)

| Token | Valor |
|---|---|
| Azul | `#163355` |
| Crudo | `#F3F3E9` |
| Negro | `#141414` |
| Títulos | Argent CF (Adobe Fonts), tracking −6 |
| Textos | Arial Nova (Adobe Fonts) |
| Acento | Caveat, solo en detalles puntuales |

Argent CF y Arial Nova se cargan desde el kit de Adobe Fonts `tqk6yym` (`https://use.typekit.net/tqk6yym.css`). Si se cambia de cuenta de Adobe, actualizar ese link en `index.html`.

## Contacto y pedidos

- WhatsApp: `+54 9 11 5825-5145` (constante `WA_NUMBER` en `assets/js/main.js`; los links del HTML también lo tienen como fallback).
- Cada bolsa arma su mensaje de WhatsApp con el peso y el tamaño de chipá elegido.
- Rinde aprox. por kg: pequeño 40 · mediano 16 · grande 12 (`PER_KG` en `main.js`, datos de la presentación B2B).
- Precio por bolsa: 1 kg $22.000 · 2 kg $38.000 · 5 kg $95.000 (2 y 5 kg a $19.000 el kg). Envío aparte (`PRICE` en `main.js` y en el HTML de cada tarjeta).

## Formulario mayorista (Resend)

1. Crear cuenta en https://resend.com y una API key.
2. En Resend → Domains, agregar `tradicionetelvina.com` y cargar los registros DNS que pide (en Squarespace → DNS).
3. En Vercel → Project → Settings → Environment Variables:
   - `RESEND_API_KEY` = la key
   - `CONTACT_FROM` = `Web Etelvina <web@tradicionetelvina.com>`
   - `CONTACT_TO` = `ventas@etelvina.com` (opcional, es el default)
4. Redeploy.

Hasta que el dominio esté verificado en Resend, el remitente `onboarding@resend.dev` solo puede enviar al mail de la cuenta de Resend.

## Deploy

1. Vercel → Add New → Project → importar `etelvinachipa/etelvina.web`. Framework: **Other**. Sin build command ni output dir.
2. Vercel → Project → Settings → Domains → agregar `tradicionetelvina.com` y `www.tradicionetelvina.com`.
3. Squarespace → Domains → tradicionetelvina.com → DNS:
   - Borrar los registros A de Squarespace del host `@` y el CNAME `www` si existe.
   - `A` · host `@` · valor `76.76.21.21`
   - `CNAME` · host `www` · valor `cname.vercel-dns.com`
   - (usar los valores exactos que muestre Vercel si son distintos)
4. Esperar la propagación (minutos a unas horas). Vercel emite el SSL solo.

## Desarrollo local

```
python3 -m http.server 8080   # sitio estático
# o, para probar también /api/contact:
npx vercel dev
```
