# ⚡ FRANZ ELECTRICIDAD PRO
## Guía de instalación y configuración completa

---

## 📁 ESTRUCTURA DE ARCHIVOS

```
franz-pro/
├── index.html              ← App principal (abrir en navegador)
├── style.css               ← Estilos visuales
├── supabase-setup.sql      ← Ejecutar UNA SOLA VEZ en Supabase
├── js/
│   ├── supabase-config.js  ← ⚠ CONFIGURAR TUS DATOS AQUÍ
│   ├── auth.js             ← Login Google + licencias
│   ├── app.js              ← Toda la lógica de la app
│   ├── sync.js             ← Sincronización multi-dispositivo
│   ├── admin.js            ← Panel de administración (solo vos)
│   └── perfil.js           ← Personalización de cuenta
└── README.md               ← Esta guía
```

---

## 🚀 PASO 1 — CONFIGURAR SUPABASE

### 1.1 Crear proyecto (ya lo hiciste)
- URL: https://cipzeluejrthpvhsegtp.supabase.co ✅

### 1.2 Ejecutar el SQL
1. Entrá a tu proyecto en supabase.com
2. Menú izquierdo → **SQL Editor**
3. Clic en **New query**
4. Copiá TODO el contenido de `supabase-setup.sql`
5. Clic en **Run** (o F5)
6. Deberías ver: "Success. No rows returned"

### 1.3 Activar login con Google
1. En Supabase → **Authentication** → **Providers**
2. Buscá **Google** → activalo
3. Necesitás crear credenciales OAuth en Google Cloud:
   - Entrá a: https://console.cloud.google.com
   - Crear proyecto → APIs y servicios → Credenciales
   - Crear ID de cliente OAuth 2.0 → Aplicación web
   - URI de redirección autorizado:
     `https://cipzeluejrthpvhsegtp.supabase.co/auth/v1/callback`
4. Copiá el **Client ID** y **Client Secret** en Supabase → Google

### 1.4 Configurar tu email de admin
Abrí `js/supabase-config.js` y cambiá:
```js
const ADMIN_EMAIL = "franzelectricidad@gmail.com"; // ← TU GMAIL REAL
```

---

## 💳 PASO 2 — CONFIGURAR MERCADOPAGO

### 2.1 Crear links de pago
1. Entrá a mercadopago.com.ar → Tu negocio → Cobros
2. Crear link de pago → "Suscripción mensual Franz Electricista $8.000"
3. Crear link de pago → "Suscripción anual Franz Electricista $80.000"

### 2.2 Pegar los links en auth.js
Abrí `js/auth.js` y buscá:
```js
const links = {
  mensual: "https://mpago.la/XXXXXXX",  // ← TU LINK MENSUAL
  anual:   "https://mpago.la/YYYYYYY"   // ← TU LINK ANUAL
};
```

### 2.3 Configurar WhatsApp de contacto
En el mismo `auth.js` buscá:
```
https://wa.me/5492235XXXXXX  // ← TU NÚMERO CON CÓDIGO DE PAÍS
```

---

## 🌐 PASO 3 — PUBLICAR LA APP (para que accedan tus clientes)

### Opción A — GitHub Pages (GRATIS, recomendado para empezar)
1. Crear cuenta en github.com
2. Nuevo repositorio → "franz-pro" → público
3. Subir todos los archivos
4. Settings → Pages → Source: main branch
5. Tu app queda en: `https://TU-USUARIO.github.io/franz-pro`

### Opción B — Netlify (GRATIS, más fácil)
1. Crear cuenta en netlify.com
2. "Add new site" → "Deploy manually"
3. Arrastrá la carpeta `franz-pro` completa
4. Listo, te da una URL como: `https://franz-pro-xxxx.netlify.app`

### Opción C — Dominio propio (más profesional)
- Registrá `franzelectricidad.com.ar` en NIC.ar (~$2.000 ARS/año)
- Hosting en Netlify/GitHub Pages apuntando al dominio

---

## 🔑 PASO 4 — ACTIVAR TU PROPIA CUENTA ADMIN

1. Abrí la app en el navegador
2. Iniciá sesión con **tu Gmail** (el que pusiste en ADMIN_EMAIL)
3. Automáticamente tenés acceso total
4. En el sidebar aparecerá el botón **🔑 Panel Admin**

---

## 👥 CÓMO ACTIVAR UN SUSCRIPTOR

### Vía transferencia bancaria:
1. El cliente te transfiere y te manda el comprobante
2. Vos abrís el **Panel Admin** en la app
3. Ponés su email → Plan Pro → 30 días → **Activar**
4. El cliente recibe acceso inmediato la próxima vez que entra

### Vía MercadoPago (futuro):
- Cuando el cliente paga, MP te notifica
- Vos activás manualmente desde el panel admin
- (Automatización con webhooks = fase 2)

---

## 📱 CÓMO USAN LA APP TUS CLIENTES

1. Van a tu URL (Netlify/GitHub Pages)
2. Inician sesión con su Gmail
3. Si no tienen plan activo → ven el modo básico + botón "Activar Plan Pro"
4. Si tienen plan activo → acceso completo con su logo y empresa
5. Sus datos se sincronizan entre todos sus dispositivos

---

## 💰 PRECIOS SUGERIDOS (ajustá según el mercado)

| Plan | Precio | Duración |
|------|--------|----------|
| Gratis | $0 | Siempre (limitado) |
| Pro mensual | $8.000 ARS | 30 días |
| Pro anual | $80.000 ARS | 365 días |

---

## 🛠 PERSONALIZACIÓN RÁPIDA

### Cambiar colores (style.css línea 1):
```css
--verde: #22c55e;  /* Color principal */
```

### Cambiar precio en el modal:
Buscá en `js/auth.js`:
```js
precio_mes: 8000,    /* Precio mensual ARS */
precio_anual: 80000, /* Precio anual ARS */
```

### Agregar nueva sección al menú:
1. Agregá el botón en `index.html` dentro de `.sb-nav`
2. Agregá la página `<div class="page" id="pg-NOMBRE">`
3. Agregá la función en `js/app.js`

---

## ❓ SOPORTE Y DUDAS
Cualquier cosa que no funcione, revisá:
- Consola del navegador (F12 → Console) para ver errores
- Supabase → Logs para ver errores de base de datos
- Que el SQL se haya ejecutado correctamente

