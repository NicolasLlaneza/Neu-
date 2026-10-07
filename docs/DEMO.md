# Demo comercial — Bitácora

Versión de la app para mostrar a otros talleres. Corre entera en el navegador:
no se conecta a Supabase, usa datos ficticios y muestra una marca genérica
("Bitácora · Taller Demo") en vez de la de Neu+.

## Cómo correrla

```bash
cd frontend
npm run dev:demo      # local, en http://localhost:5173
npm run build:demo    # build para publicar (carpeta dist/)
```

No necesita variables de entorno: `.env.demo` solo activa `VITE_DEMO_MODE=true`.

## Publicarla (Cloudflare Pages)

Crear un **proyecto aparte** del de producción, apuntando al mismo repo:

- Build command: `npm run build:demo`
- Build output directory: `dist`
- Root directory: `frontend`
- Sin variables de entorno

## Qué incluye

- Login precargado: se entra con un clic.
- Unos 25 clientes, 30 vehículos y un año de servicios, con fechas
  relativas a hoy: el panel siempre muestra cobros pendientes, clientes
  dormidos, recordatorios del día y una notificación fallida.
- Consulta pública sin captcha, con patentes de ejemplo para tocar
  (algunas con fotos).
- Todo se puede crear, editar y borrar. Los cambios quedan en el navegador
  de quien la usa; **Reiniciar datos** (franja superior) vuelve al estado
  inicial.

## Qué no hace

- No envía WhatsApp: "Enviar" abre WhatsApp con el mensaje cargado pero sin
  destinatario, para no escribirle a números inventados.
- Las fotos que se suben se pierden al recargar la página.
- No incluye logos ni archivos de Neu+: el build usa `public-demo/` en
  lugar de `public/`.

## Dónde está el código

- `src/lib/demo.js` — interruptor del modo demo.
- `src/demo/seed.js` — datos ficticios.
- `src/demo/mockSupabase.js` — reemplazo de Supabase en memoria.
- `src/lib/empresa.js` — datos del taller (Neu+ o Taller Demo).
- Color de marca: variable `--color-marca` en `src/styles/index.css`.
