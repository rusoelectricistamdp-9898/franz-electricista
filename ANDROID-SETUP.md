# Franz Electricista en Android (y PC/iPad)

La app ya es una **PWA (Progressive Web App)**. Es la misma app web de
siempre, pero ahora se puede "instalar" y se comporta como una app nativa:
ícono propio, pantalla completa (sin barra del navegador), funciona sin
internet con los últimos datos que tenía, y se actualiza sola.

## Opción 1 — Instalar directo (gratis, ya funciona, sin Play Store)
1. Subí la carpeta del proyecto a un hosting con HTTPS: **Vercel**, **Netlify**
   o **GitHub Pages** (los tres son gratis). PWA solo funciona con HTTPS.
2. Abrí la URL desde el celular en **Chrome** (Android).
3. Chrome va a mostrar solo "Instalar app" (o el menú ⋮ → "Instalar app" /
   "Agregar a pantalla de inicio").
4. Queda un ícono como cualquier otra app, abre en pantalla completa.

En PC (Chrome/Edge) pasa lo mismo: aparece un ícono de instalar en la
barra de direcciones.

## ¿Se actualiza sola?
**Sí.** El Service Worker (`sw.js`) usa estrategia "primero red": cada vez
que el usuario abre la app con internet, trae la versión más nueva del
servidor y la deja guardada. Si no hay internet, usa la última que tenía.
Vos solo tenés que:
1. Subir los archivos nuevos a tu hosting.
2. Cambiar el número en `sw.js` → `const CACHE_VERSION = "franz-pro-v2";`
   (súmale 1 cada vez que publiques cambios).

No hace falta tienda de aplicaciones ni que el usuario reinstale nada.

## Opción 2 — Publicarla de verdad en Google Play Store
Esto empaqueta tu PWA dentro de un **TWA (Trusted Web Activity)**: un APK/AAB
real que abre tu web dentro de una app nativa, sin reescribir nada de código.

1. Necesitás tu PWA ya subida y andando en un dominio HTTPS propio (Paso 1
   de arriba primero).
2. Entrá a **PWABuilder** (gratis, de Microsoft): https://www.pwabuilder.com
3. Pegá la URL de tu app → "Start".
4. Te va a analizar el `manifest.json` (ya lo dejé listo) y te va a decir
   si falta algo.
5. Elegís **Android** → te genera el paquete `.aab` listo para subir.
6. Necesitás una cuenta de **Google Play Console** (pago único de USD 25,
   una sola vez por siempre) para publicarla: https://play.google.com/console
7. Subís el `.aab`, completás ficha de la tienda (capturas, descripción,
   ícono — ya están en `icons/`), y la mandás a revisión.

Con las actualizaciones (Paso "¿Se actualiza sola?" de arriba) **no hace
falta volver a subir nada a Play Store** — la app publicada sigue siendo un
cascarón que carga tu web, así que se actualiza sola también.

## Requisitos técnicos que ya están resueltos
- ✅ `manifest.json` con íconos en varios tamaños (`icons/`)
- ✅ Ícono maskable para el ícono adaptativo de Android
- ✅ `sw.js` (Service Worker) para funcionamiento offline
- ✅ Meta tags para iOS (`apple-mobile-web-app-capable`, etc. — también
  se puede "agregar a pantalla de inicio" desde Safari en iPhone/iPad)
- ✅ Diseño responsive con breakpoints para celular y tablet

## Importante
El HTTPS y el hosting son obligatorios para todo esto (Service Worker y
"Instalar app" no funcionan sobre `http://` ni abriendo el `index.html`
directo desde el explorador de archivos del celular).
