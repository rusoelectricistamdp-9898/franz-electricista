# Publicar Franz Electricista en GitHub Pages (gratis)

## Paso 1 — Crear cuenta de GitHub (si no tenés)
Entrá a https://github.com/signup y creá una cuenta gratis.

## Paso 2 — Crear el repositorio
1. Arriba a la derecha, tocá el **+** → **New repository**.
2. Nombre: `franz-electricidad-pro` (o el que quieras).
3. Dejalo en **Public** (para GitHub Pages gratis tiene que ser público).
4. NO marques "Add a README" (ya tenés uno).
5. **Create repository**.

## Paso 3 — Subir los archivos (sin usar la terminal)
1. Descomprimí el `franz-pro-actualizado.zip` en tu compu.
2. En la página del repositorio recién creado, tocá **"uploading an existing file"**
   (o el botón **Add file → Upload files**).
3. Arrastrá **todo el contenido** de la carpeta descomprimida (todos los
   archivos y carpetas: `index.html`, `style.css`, `js/`, `icons/`,
   `manifest.json`, `sw.js`, `supabase/`, etc. — todo junto, no la carpeta
   contenedora, sino lo que está adentro).
4. Abajo, en "Commit changes", dejá el mensaje que ya viene y tocá
   **Commit changes**.

## Paso 4 — Activar GitHub Pages
1. En el repositorio, andá a **Settings** (pestaña arriba).
2. En el menú de la izquierda, **Pages**.
3. En "Build and deployment" → **Source**: elegí **Deploy from a branch**.
4. **Branch**: `main` — carpeta: `/ (root)` → **Save**.
5. Esperá 1-2 minutos. Arriba te va a aparecer la URL pública, algo como:
   ```
   https://TU-USUARIO.github.io/franz-electricidad-pro/
   ```
   Esa es tu app, ya con HTTPS.

## Paso 5 — MUY IMPORTANTE: avisarle a Google y a Supabase la URL nueva
Sin este paso el login con Google **no va a funcionar** en la URL nueva.

### En Google Cloud Console
1. https://console.cloud.google.com/apis/credentials
2. Abrí tu credencial OAuth (Client ID) que usás para Franz Electricista.
3. En **Authorized JavaScript origins**, agregá:
   ```
   https://TU-USUARIO.github.io
   ```
4. En **Authorized redirect URIs**, agregá:
   ```
   https://TU-USUARIO.github.io/franz-electricidad-pro/
   ```
5. Guardar.

### En Supabase
1. Dashboard de tu proyecto → **Authentication** → **URL Configuration**.
2. **Site URL**: `https://TU-USUARIO.github.io/franz-electricidad-pro/`
3. **Redirect URLs**: agregá la misma URL.
4. Guardar.

### En la Edge Function de MercadoPago (si ya la desplegaste)
```bash
supabase secrets set APP_URL=https://TU-USUARIO.github.io/franz-electricidad-pro/
supabase functions deploy crear-preferencia
```

## Paso 6 — Probar
1. Abrí la URL de GitHub Pages desde el celu (Chrome) y desde la PC.
2. Probá el login con Google.
3. En Chrome del celu, menú ⋮ → **"Instalar app"** (o te va a aparecer solo
   el cartelito abajo).
4. Cargá un cliente en un dispositivo y fijate que aparezca en el otro
   (puede tardar unos segundos la primera vez).

## Cada vez que quieras actualizar la app
1. Volvé a subir los archivos modificados (mismo Paso 3, GitHub te va a
   preguntar si querés reemplazar los que cambiaron — decís que sí).
2. Si cambiaste algo de `js/`, `index.html`, `style.css` o `manifest.json`,
   subí también un `sw.js` con el número de versión aumentado
   (`CACHE_VERSION = "franz-pro-v2"`, luego `v3`, etc.) para que a los
   usuarios se les actualice sola la próxima vez que abran la app con
   internet.

## ¿Y un dominio propio en vez de "github.io"?
Se puede (`www.franzelectricidad.com.ar` en vez de la URL de GitHub), pero
es un paso aparte: hay que comprar el dominio (NIC Argentina o similar) y
configurar unos registros DNS. Si en algún momento lo comprás, avisame y te
armo esa parte también.
