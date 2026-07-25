# ⚡ Franz Electricista

App de gestión para electricistas — presupuestos, obras, materiales, facturación,
fotos de evidencia, firma digital y sincronización entre dispositivos.
Desarrollada por Franz Electricidad (Mar del Plata, Argentina).

## 📁 Estructura del proyecto

```
franz-electricista/
├── index.html                        ← App principal
├── landing.html                      ← Página pública de ventas
├── privacidad.html / terminos.html   ← Legales
├── style.css
├── manifest.json / sw.js             ← PWA (instalable, offline)
├── icons/                            ← Íconos de la app
├── js/
│   ├── supabase-config.js            ← ⚠ Credenciales y datos de contacto
│   ├── auth.js                       ← Login Google + licencias + pagos
│   ├── auditoria.js                  ← Registro de eventos (login, backups, errores)
│   ├── fotos.js                      ← Fotos de evidencia + firma digital
│   ├── app.js                        ← Lógica principal de la app
│   ├── materiales-db.js              ← Catálogo de +2000 materiales
│   ├── sync.js                       ← Sincronización multi-dispositivo (realtime)
│   ├── admin.js                      ← Panel admin (solo vos)
│   └── perfil.js                     ← Perfil de empresa del usuario
├── supabase/functions/               ← Edge Functions (MercadoPago)
└── *.sql                             ← Parches a correr en Supabase (ver abajo)
```

## 🚀 Paso 1 — Supabase

1. Ejecutá en el SQL Editor de tu proyecto, **en este orden**:
   `supabase-setup.sql` → `supabase-seguridad-patch.sql` → `supabase-realtime-patch.sql`
   → `supabase-limite-gratis-patch.sql` → `supabase-auditoria-patch.sql` → `supabase-auditoria-tabla.sql`
2. Activá login con Google: Authentication → Providers → Google (credenciales desde Google Cloud Console).
3. En `js/supabase-config.js`, completá con tus datos reales:
   - `SUPABASE_URL` y `SUPABASE_KEY` (Settings → API — la key real es un token largo tipo `eyJ...`, no un texto corto)
   - `ADMIN_EMAIL` (tu Gmail real)
   - `WHATSAPP_NUMERO` y `ALIAS_TRANSFERENCIA`

## 💳 Paso 2 — MercadoPago (activación automática de pagos)

Ver `MERCADOPAGO-SETUP.md` para el paso a paso completo (Edge Functions,
webhook, secrets). Sin esto configurado, queda disponible igual la opción
de pago por transferencia + aviso por WhatsApp.

## 🌐 Paso 3 — Publicar

Ver `DEPLOY-GITHUB-PAGES.md` para el paso a paso completo. Importante:
al subir los archivos a GitHub, **subí las carpetas `js/`, `icons/` y
`supabase/` arrastrándolas** (no con el selector de archivos, que no
permite elegir carpetas).

Después de publicar, avisale la URL nueva a Google Cloud Console y a
Supabase (Authentication → URL Configuration) o el login no va a andar.

## 📱 Instalar como app (PWA)

Ver `ANDROID-SETUP.md`. Una vez publicada con HTTPS, cualquiera puede
"instalarla" desde Chrome como si fuera una app nativa.

## 🔑 Panel Admin

Iniciá sesión con el Gmail que pusiste en `ADMIN_EMAIL` y vas a ver un
botón extra "Panel Admin" en el menú. Ahí podés: activar/renovar
licencias a mano, ver historial de pagos, ver el registro de auditoría,
y descargar un backup completo de la base.

## 💰 Planes

| Plan | Precio | Incluye |
|---|---|---|
| Gratis | $0 | 3 clientes, 3 obras, 3 presupuestos, 3 facturas de prueba, catálogo básico, calculadoras sin límite |
| Pro | $8.000/mes o $80.000/año | Todo ilimitado, catálogo completo, fotos/firma, sync en tiempo real, sin marca en los PDF |

## 🔒 Seguridad

Los límites del plan gratis están validados tanto en el navegador como en
el servidor (trigger de Postgres) — no se pueden saltear editando el
JavaScript. Más detalle en los comentarios de `supabase-limite-gratis-patch.sql`.

## ❓ Soporte

Si algo no funciona: F12 → Console en el navegador para ver errores, y
Supabase → Logs para errores de base de datos o de las Edge Functions.
