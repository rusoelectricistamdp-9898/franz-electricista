# MercadoPago — activación automática de licencias

Con esto, cuando un cliente paga, su licencia se activa **sola** (plan "pro",
`vence` = hoy + 30 o 365 días) sin que tengas que hacer nada a mano.

## Cómo funciona
1. El usuario toca "Pagar mensual/anual" → la app le pide a la función
   `crear-preferencia` un link de pago de MercadoPago (Checkout Pro).
2. El usuario paga en MercadoPago.
3. MercadoPago le avisa a la función `mp-webhook`, que **vuelve a consultar
   el pago con tu Access Token** (nunca confía en lo que le llega directo),
   y si está `approved`, activa la licencia en Supabase.
4. Si el usuario vuelve a la app, se refresca sola (no hace falta recargar).

## Paso 1 — Conseguir tus credenciales de MercadoPago
1. Entrá a https://www.mercadopago.com.ar/developers/panel/app
2. Creá una aplicación (o usá una existente) → **Credenciales de producción**
3. Copiá el **Access Token** de producción (empieza con `APP_USR-...`)

## Paso 2 — Instalar la CLI de Supabase (si no la tenés)
```bash
npm install -g supabase
supabase login
```

## Paso 3 — Vincular tu proyecto
Desde la carpeta del proyecto (donde está la carpeta `supabase/`):
```bash
supabase link --project-ref TU_PROJECT_REF
```
`TU_PROJECT_REF` lo sacás de la URL de tu proyecto en supabase.com
(`https://TU_PROJECT_REF.supabase.co`).

## Paso 4 — Cargar los secrets (variables de entorno)
```bash
supabase secrets set MP_ACCESS_TOKEN=APP_USR-tu-access-token-aca
supabase secrets set APP_URL=https://tu-dominio-real.com.ar
```
`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya están disponibles
automáticamente dentro de las Edge Functions, no hace falta cargarlas.

## Paso 5 — Desplegar las dos funciones
```bash
supabase functions deploy crear-preferencia
supabase functions deploy mp-webhook --no-verify-jwt
```
⚠️ **`mp-webhook` va con `--no-verify-jwt`** porque a esa la llama
MercadoPago directamente (no tu app), y MercadoPago no tiene forma de
mandar un token de Supabase. `crear-preferencia` NO lleva esa bandera,
porque a esa solo la debe poder llamar tu app.

## Paso 6 — Configurar el webhook en MercadoPago
1. En el panel de tu app de MercadoPago → **Webhooks** → **Configurar notificaciones**
2. URL: `https://TU_PROJECT_REF.supabase.co/functions/v1/mp-webhook`
3. Eventos: marcá **Pagos**
4. Copiá la **Clave secreta** que te muestra ahí y cargala también (⚠️ es **obligatoria**: sin esto configurado, el webhook rechaza todas las notificaciones por seguridad y ninguna licencia se va a activar sola):
```bash
supabase secrets set MP_WEBHOOK_SECRET=la-clave-secreta-que-te-dio-mp
```
5. Volvé a desplegar `mp-webhook` para que tome el nuevo secret:
```bash
supabase functions deploy mp-webhook --no-verify-jwt
```

## Paso 7 — Probar
MercadoPago tiene **usuarios de prueba** para simular pagos sin plata real:
https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-cards

También podés mandar una notificación de prueba desde el panel de Webhooks
("Simular notificación") y revisar los logs con:
```bash
supabase functions logs mp-webhook
```

## Precios
Los precios están en `supabase/functions/crear-preferencia/index.ts`
(objeto `PLANES`). Si los cambiás ahí, también actualizá los que se
muestran en el modal de `js/auth.js` (`mostrarModalUpgrade`) para que
coincidan.
