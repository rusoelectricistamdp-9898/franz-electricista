/* ============================================
   FRANZ ELECTRICIDAD PRO — SYNC.JS
   Sincronización multi-dispositivo con Supabase
   Tabla real: datos_usuario (email, tabla, datos, actualizado)
   + Realtime: los cambios en OTRO dispositivo se aplican solos,
     sin recargar la página.
============================================ */

const TABLAS_SYNC = ["clientes","obras","materiales","componentes","tableros",
  "presupuestos","relevamientos","omisiones","compras","facturas"];

// ══════════════════════════════════════
// GUARDAR/CARGAR UNA TABLA
// ══════════════════════════════════════
async function syncGuardar(tabla, datos) {
  if (!usuarioActual || !navigator.onLine) return;
  const email = usuarioActual.email;
  const { error } = await sb.from("datos_usuario").upsert({
    email, tabla,
    datos: JSON.stringify(datos),
    actualizado: new Date().toISOString()
  }, { onConflict: "email,tabla" });
  if (error) console.warn("Sync error:", tabla, error.message);
  else actualizarIconoSync(true);
}

async function syncCargar(tabla) {
  if (!usuarioActual) return null;
  const { data, error } = await sb.from("datos_usuario")
    .select("datos, actualizado")
    .eq("email", usuarioActual.email)
    .eq("tabla", tabla)
    .single();
  if (error || !data) return null;
  try { return JSON.parse(data.datos); } catch(e) { return null; }
}

// Empuja la tabla a la nube con un pequeño debounce (agrupa cambios rápidos)
const _syncDebounce = {};
function syncPush(tabla) {
  if (!TABLAS_SYNC.includes(tabla)) return; // no todo lo que hay en localStorage se sincroniza (ej: tema)
  clearTimeout(_syncDebounce[tabla]);
  _syncDebounce[tabla] = setTimeout(() => syncGuardar(tabla, DB[tabla]), 800);
}

// Aplica datos que llegaron de la nube (carga inicial o realtime) SIN volver a empujarlos
function aplicarDatosRemotos(tabla, datos) {
  if (!Array.isArray(datos)) return;
  if (JSON.stringify(DB[tabla]) === JSON.stringify(datos)) return; // sin cambios reales, evita re-render innecesario
  DB[tabla] = datos;
  localStorage.setItem("franz-"+tabla, JSON.stringify(datos));
  const renders = {
    clientes: () => { mostrarClientes(); sincronizarSelectClientes(); },
    obras: mostrarObras,
    materiales: mostrarMateriales,
    componentes: typeof mostrarComponentes==="function" ? mostrarComponentes : null,
    tableros: typeof mostrarTableros==="function" ? mostrarTableros : null,
    presupuestos: typeof mostrarPresupuestos==="function" ? mostrarPresupuestos : null,
    relevamientos: mostrarRelevamientos,
    omisiones: typeof mostrarOmisiones==="function" ? mostrarOmisiones : null,
    compras: typeof mostrarCompras==="function" ? mostrarCompras : null,
    facturas: typeof mostrarFacturas==="function" ? mostrarFacturas : null,
  };
  renders[tabla]?.();
  actualizarDashboard();
}

// ══════════════════════════════════════
// SINCRONIZAR TODO (push manual, botón ☁)
// ══════════════════════════════════════
async function sincronizarTodo() {
  if (!usuarioActual) return;
  mostrarToastSync("☁ Sincronizando...", "cyan");
  try {
    await Promise.all(TABLAS_SYNC.map(t => syncGuardar(t, DB[t])));
    mostrarToastSync("✅ Sincronizado en la nube", "verde");
    actualizarIconoSync(true);
  } catch(e) {
    mostrarToastSync("⚠ Error al sincronizar", "red");
    actualizarIconoSync(false);
  }
}

// ══════════════════════════════════════
// CARGAR DATOS DESDE LA NUBE AL INICIAR SESIÓN
// ══════════════════════════════════════
async function cargarDesdeNube() {
  if (!usuarioActual) return;
  mostrarToastSync("☁ Cargando datos de la nube...", "cyan");
  try {
    const resultados = await Promise.all(TABLAS_SYNC.map(t => syncCargar(t)));
    let huboCambios = false;
    TABLAS_SYNC.forEach((t, i) => {
      const datos = resultados[i];
      if (datos && Array.isArray(datos) && datos.length >= DB[t].length) {
        if (JSON.stringify(DB[t]) !== JSON.stringify(datos)) huboCambios = true;
        DB[t] = datos;
        localStorage.setItem("franz-"+t, JSON.stringify(datos));
      } else if (datos === null) {
        syncPush(t);
      }
    });

    // El catálogo de materiales se siembra local UNA sola vez, y recién acá,
    // después de haber consultado la nube — así se evita la condición de
    // carrera que generaba catálogos con IDs distintos entre dispositivos.
    if ((!DB.materiales || DB.materiales.length === 0) && typeof cargarCatalogoInicial === "function") {
      cargarCatalogoInicial();
    }

    if (huboCambios) {
      mostrarToastSync("✅ Datos actualizados desde la nube", "verde");
      actualizarDashboard(); mostrarClientes(); mostrarObras(); mostrarMateriales();
      sincronizarSelectClientes();
    } else {
      mostrarToastSync("✅ Todo sincronizado", "verde");
    }
    actualizarIconoSync(true);
  } catch(e) {
    console.warn(e);
    // Sin conexión: si es la primera vez que se usa este dispositivo y no hay
    // nada local, sembramos el catálogo igual para que la app sea usable offline.
    if ((!DB.materiales || DB.materiales.length === 0) && typeof cargarCatalogoInicial === "function") {
      cargarCatalogoInicial();
    }
    mostrarToastSync("📱 Modo offline — datos locales", "yellow");
    actualizarIconoSync(false);
  }
}

// ══════════════════════════════════════
// TIEMPO REAL: cambios en otro dispositivo se aplican solos
// (requiere: ALTER PUBLICATION supabase_realtime ADD TABLE datos_usuario;
//  ejecutado una vez en el SQL Editor de Supabase)
// ══════════════════════════════════════
let _canalRealtime = null;

function suscribirRealtime() {
  if (!usuarioActual || _canalRealtime) return;
  _canalRealtime = sb.channel("datos_usuario_"+usuarioActual.email)
    .on("postgres_changes", {
      event: "*", schema: "public", table: "datos_usuario",
      filter: `email=eq.${usuarioActual.email}`
    }, (payload) => {
      const fila = payload.new;
      if (!fila || !fila.tabla) return;
      try {
        const datos = JSON.parse(fila.datos);
        aplicarDatosRemotos(fila.tabla, datos);
        mostrarToastSync("🔄 Actualizado desde otro dispositivo", "cyan");
      } catch(e) { /* ignorar payload inválido */ }
    })
    .subscribe();
}

function desuscribirRealtime() {
  if (_canalRealtime) { sb.removeChannel(_canalRealtime); _canalRealtime = null; }
}

// ══════════════════════════════════════
// AUTO-SYNC de respaldo cada 5 minutos (por si el realtime se cae)
// ══════════════════════════════════════
let syncInterval = null;

function iniciarAutoSync() {
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = setInterval(() => {
    if (usuarioActual && navigator.onLine) sincronizarTodo();
  }, 5 * 60 * 1000);

  window.addEventListener("online", () => {
    mostrarToastSync("🌐 Conexión restaurada — sincronizando...", "verde");
    sincronizarTodo();
    if (!_canalRealtime) suscribirRealtime();
  });

  window.addEventListener("offline", () => {
    mostrarToastSync("📵 Sin conexión — modo offline", "yellow");
    actualizarIconoSync(false);
  });
}

// ══════════════════════════════════════
// HELPERS UI SYNC
// ══════════════════════════════════════
function mostrarToastSync(msg, tipo) {
  const colores = { verde: "var(--verde)", cyan: "var(--cyan)", yellow: "var(--yellow)", red: "var(--red)" };
  const t = document.createElement("div");
  t.style.cssText = `position:fixed;bottom:20px;left:20px;z-index:9998;padding:9px 16px;
    border-radius:8px;font-size:.78rem;font-weight:700;background:var(--bg2);
    border:1px solid ${colores[tipo]||colores.verde};color:${colores[tipo]||colores.verde};
    box-shadow:0 4px 14px rgba(0,0,0,.4);transition:opacity .3s`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 300); }, 2500);
}

function actualizarIconoSync(online) {
  const btn = document.getElementById("btn-sync");
  if (!btn) return;
  btn.textContent = online ? "☁✅" : "☁⚠";
  btn.title = online ? "Sincronizado" : "Sin conexión";
}
