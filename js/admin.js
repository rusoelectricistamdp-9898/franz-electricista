/* ============================================
   FRANZ ELECTRICIDAD PRO — ADMIN.JS
   Panel de administración exclusivo Franz
============================================ */

// ══════════════════════════════════════
// RENDERIZAR PÁGINA ADMIN EN EL HTML
// ══════════════════════════════════════
function renderPaginaAdmin() {
  // Solo si no existe ya
  if (document.getElementById("pg-admin")) return;

  const main = document.querySelector(".main");
  if (!main) return;

  const pg = document.createElement("div");
  pg.className = "page";
  pg.id = "pg-admin";
  pg.innerHTML = `
    <div class="ph">
      <div><h1>🔑 Panel Admin — Franz</h1><p>Gestión de suscriptores y licencias</p></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-outline btn-sm" onclick="exportarBackupCompleto()">💾 Exportar backup completo</button>
        <button class="btn btn-outline btn-sm" onclick="cargarSuscriptores();cargarPagos();cargarAuditoria()">🔄 Actualizar</button>
      </div>
    </div>

    <!-- ESTADÍSTICAS -->
    <div class="cards" id="admin-stats">
      <div class="card"><h3>Total suscriptores</h3><span id="adm-total">—</span></div>
      <div class="card"><h3>Plan Pro activos</h3><span id="adm-pro">—</span></div>
      <div class="card"><h3>Vencen este mes</h3><span id="adm-vencen">—</span></div>
      <div class="card"><h3>Facturación mensual</h3><span id="adm-facturacion">—</span></div>
    </div>

    <!-- ACTIVAR LICENCIA MANUAL -->
    <div class="panel">
      <div class="panel-title">✅ Activar / renovar suscriptor manualmente</div>
      <div class="form-grid g3">
        <div class="fld"><label>Email del suscriptor</label>
          <input id="adm-email" placeholder="email@gmail.com" type="email"></div>
        <div class="fld"><label>Plan</label>
          <select id="adm-plan">
            <option value="pro">Pro</option>
            <option value="gratis">Gratis</option>
          </select>
        </div>
        <div class="fld"><label>Duración</label>
          <select id="adm-duracion">
            <option value="30">1 mes (30 días)</option>
            <option value="60">2 meses</option>
            <option value="90">3 meses</option>
            <option value="180">6 meses</option>
            <option value="365">1 año</option>
            <option value="9999">Ilimitado</option>
          </select>
        </div>
      </div>
      <div class="btn-row">
        <button class="btn btn-verde" onclick="activarLicencia()">✅ Activar licencia</button>
        <button class="btn btn-red" onclick="suspenderLicencia()">🚫 Suspender</button>
      </div>
      <div id="adm-msg" style="display:none;margin-top:10px;padding:10px;border-radius:8px;font-size:.84rem"></div>
    </div>

    <!-- TABLA DE SUSCRIPTORES -->
    <div class="panel">
      <div class="panel-title">👥 Todos los suscriptores</div>
      <div class="search-bar" style="margin-bottom:10px">
        <input id="adm-buscar" placeholder="🔍 Buscar por email o nombre..." oninput="filtrarSuscriptores(this.value)">
        <select id="adm-filtro" onchange="filtrarSuscriptores(document.getElementById('adm-buscar').value)">
          <option value="">Todos</option>
          <option value="pro">Solo Pro</option>
          <option value="gratis">Solo gratis</option>
          <option value="vencido">Vencidos</option>
        </select>
      </div>
      <div class="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Email</th>
              <th>Plan</th>
              <th>Estado</th>
              <th>Vence</th>
              <th>Registro</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="adm-tabla"></tbody>
        </table>
      </div>
    </div>

    <!-- HISTORIAL DE PAGOS -->
    <div class="panel">
      <div class="panel-title">💳 Historial de pagos <span id="adm-pagos-count" class="badge badge-green">0</span></div>
      <div class="cards" style="margin-bottom:12px">
        <div class="card"><h3>Total cobrado (histórico)</h3><span id="adm-pagos-total">—</span></div>
        <div class="card"><h3>Este mes</h3><span id="adm-pagos-mes">—</span></div>
      </div>
      <div class="search-bar" style="margin-bottom:10px">
        <input id="adm-pagos-buscar" placeholder="🔍 Buscar por email..." oninput="filtrarPagos(this.value)">
        <select id="adm-pagos-filtro" onchange="filtrarPagos(document.getElementById('adm-pagos-buscar').value)">
          <option value="">Todos los métodos</option>
          <option value="mercadopago">MercadoPago</option>
          <option value="transferencia">Transferencia</option>
        </select>
      </div>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>Fecha</th><th>Email</th><th>Plan</th><th>Monto</th><th>Método</th><th>Referencia</th></tr></thead>
          <tbody id="adm-pagos-tabla"></tbody>
        </table>
      </div>
    </div>

    <!-- REGISTRO DE AUDITORÍA -->
    <div class="panel">
      <div class="panel-title">🕵 Registro de auditoría <span id="adm-audit-count" class="badge badge-green">0</span></div>
      <div class="search-bar" style="margin-bottom:10px">
        <input id="adm-audit-buscar" placeholder="🔍 Buscar por email..." oninput="filtrarAuditoria(this.value)">
        <select id="adm-audit-filtro" onchange="filtrarAuditoria(document.getElementById('adm-audit-buscar').value)">
          <option value="">Todas las acciones</option>
          <option value="login">Login</option>
          <option value="cambio_plan">Cambio de plan</option>
          <option value="compra">Compra</option>
          <option value="backup_exportado">Backup exportado</option>
          <option value="error">Error</option>
        </select>
      </div>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>Fecha</th><th>Email</th><th>Acción</th><th>Origen</th><th>Detalle</th></tr></thead>
          <tbody id="adm-audit-tabla"></tbody>
        </table>
      </div>
    </div>

    <!-- NOTIFICACIONES MASIVAS -->
    <div class="panel">
      <div class="panel-title">📢 Enviar notificación a suscriptores</div>
      <div class="fld"><label>Mensaje (se muestra en la app)</label>
        <textarea id="adm-notif" placeholder="Ej: Nueva función disponible: Calculadora de caída de tensión"></textarea>
      </div>
      <div class="form-grid g2" style="margin-top:8px">
        <div class="fld"><label>Destinatarios</label>
          <select id="adm-dest">
            <option value="todos">Todos los usuarios</option>
            <option value="pro">Solo plan Pro</option>
            <option value="gratis">Solo plan gratis</option>
          </select>
        </div>
        <div class="fld"><label>Tipo</label>
          <select id="adm-notif-tipo">
            <option value="info">ℹ Info</option>
            <option value="verde">✅ Éxito</option>
            <option value="yellow">⚠ Aviso</option>
            <option value="red">❌ Urgente</option>
          </select>
        </div>
      </div>
      <div class="btn-row">
        <button class="btn btn-verde" onclick="enviarNotificacion()">📢 Enviar notificación</button>
      </div>
    </div>
  `;

  main.appendChild(pg);
}

// ══════════════════════════════════════
// CARGAR SUSCRIPTORES DESDE SUPABASE
// ══════════════════════════════════════
let todosLosSuscriptores = [];

async function cargarSuscriptores() {
  const { data, error } = await sb
    .from("licencias")
    .select("*")
    .order("fecha_registro", { ascending: false });

  if (error) {
    console.error("Error cargando suscriptores:", error);
    return;
  }

  todosLosSuscriptores = data || [];
  actualizarEstadisticasAdmin();
  renderTablaAdmin(todosLosSuscriptores);
}

// ══════════════════════════════════════
// ESTADÍSTICAS
// ══════════════════════════════════════
function actualizarEstadisticasAdmin() {
  const total = todosLosSuscriptores.length;
  const ahora = new Date();

  const pros = todosLosSuscriptores.filter(u => {
    if (u.plan !== "pro" || !u.activo) return false;
    if (!u.vence) return true;
    return new Date(u.vence) > ahora;
  });

  // Vencen en los próximos 7 días
  const proximosVencimientos = todosLosSuscriptores.filter(u => {
    if (!u.vence || !u.activo) return false;
    const vence = new Date(u.vence);
    const diff = (vence - ahora) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  });

  const facturacion = pros.length * 8000;

  const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  set("adm-total", total);
  set("adm-pro", pros.length);
  set("adm-vencen", proximosVencimientos.length);
  set("adm-facturacion", "$" + facturacion.toLocaleString("es-AR"));
}

// ══════════════════════════════════════
// TABLA DE SUSCRIPTORES
// ══════════════════════════════════════
function renderTablaAdmin(lista) {
  const tbody = document.getElementById("adm-tabla");
  if (!tbody) return;

  const ahora = new Date();

  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:20px">Sin suscriptores</td></tr>`;
    return;
  }

  tbody.innerHTML = lista.map(u => {
    const vence = u.vence ? new Date(u.vence) : null;
    const vencido = vence && ahora > vence;
    const estadoBadge = !u.activo
      ? `<span class="badge badge-red">Suspendido</span>`
      : vencido
        ? `<span class="badge badge-yellow">Vencido</span>`
        : `<span class="badge badge-green">Activo</span>`;

    const planBadge = u.plan === "pro"
      ? `<span class="badge badge-cyan">Pro</span>`
      : `<span class="badge badge-blue">Gratis</span>`;

    const venceStr = vence
      ? (vencido
          ? `<span style="color:var(--red)">${vence.toLocaleDateString("es-AR")}</span>`
          : vence.toLocaleDateString("es-AR"))
      : "—";

    const avatar = safeImgUrl(u.avatar)
      ? `<img src="${escapeHtml(safeImgUrl(u.avatar))}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;margin-right:8px;vertical-align:middle" onerror="this.style.display='none'">`
      : "";

    return `<tr>
      <td>${avatar}${escapeHtml(u.nombre) || "—"}</td>
      <td style="font-size:.78rem">${escapeHtml(u.email)}</td>
      <td>${planBadge}</td>
      <td>${estadoBadge}</td>
      <td style="font-size:.78rem">${venceStr}</td>
      <td style="font-size:.78rem">${u.fecha_registro ? new Date(u.fecha_registro).toLocaleDateString("es-AR") : "—"}</td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btn-verde btn-sm" onclick="activarRapido('${u.email}')">✅</button>
          <button class="btn btn-red btn-sm" onclick="suspenderRapido('${u.email}')">🚫</button>
          <button class="btn btn-outline btn-sm" onclick="verDetalle('${u.email}')">👁</button>
        </div>
      </td>
    </tr>`;
  }).join("");
}

function filtrarSuscriptores(txt) {
  const filtro = document.getElementById("adm-filtro")?.value || "";
  const ahora = new Date();

  let lista = todosLosSuscriptores.filter(u => {
    const matchTxt = !txt ||
      u.email.toLowerCase().includes(txt.toLowerCase()) ||
      (u.nombre || "").toLowerCase().includes(txt.toLowerCase());

    let matchFiltro = true;
    if (filtro === "pro") matchFiltro = u.plan === "pro" && u.activo;
    else if (filtro === "gratis") matchFiltro = u.plan === "gratis";
    else if (filtro === "vencido") {
      const vence = u.vence ? new Date(u.vence) : null;
      matchFiltro = vence && ahora > vence;
    }

    return matchTxt && matchFiltro;
  });

  renderTablaAdmin(lista);
}

// ══════════════════════════════════════
// ACTIVAR LICENCIA
// ══════════════════════════════════════
async function activarLicencia() {
  const email = document.getElementById("adm-email")?.value.trim();
  const plan = document.getElementById("adm-plan")?.value;
  const dias = parseInt(document.getElementById("adm-duracion")?.value) || 30;

  if (!email) { mostrarMsgAdmin("Ingresá el email del suscriptor", "red"); return; }

  // Calcular fecha de vencimiento
  let vence = null;
  if (dias < 9999) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + dias);
    vence = fecha.toISOString();
  }

  // Buscar si ya existe
  const { data: existe } = await sb.from("licencias").select("id").eq("email", email).single();

  let error;
  if (existe) {
    // Actualizar existente
    const { error: e } = await sb.from("licencias").update({
      plan, activo: true, vence
    }).eq("email", email);
    error = e;
  } else {
    // Crear nuevo
    const { error: e } = await sb.from("licencias").insert([{
      email,
      nombre: email.split("@")[0],
      plan,
      activo: true,
      vence,
      empresa: "",
      logo_url: "",
      fecha_registro: new Date().toISOString()
    }]);
    error = e;
  }

  if (error) {
    mostrarMsgAdmin("Error: " + error.message, "red");
    return;
  }

  mostrarMsgAdmin(`✅ Licencia ${plan.toUpperCase()} activada para ${email}${vence ? " hasta " + new Date(vence).toLocaleDateString("es-AR") : " (sin vencimiento)"}`, "verde");
  document.getElementById("adm-email").value = "";
  await cargarSuscriptores();
}

async function activarRapido(email) {
  document.getElementById("adm-email").value = email;
  document.getElementById("adm-plan").value = "pro";
  document.getElementById("adm-duracion").value = "30";
  await activarLicencia();
}

// ══════════════════════════════════════
// SUSPENDER LICENCIA
// ══════════════════════════════════════
async function suspenderLicencia() {
  const email = document.getElementById("adm-email")?.value.trim();
  if (!email) { mostrarMsgAdmin("Ingresá el email a suspender", "red"); return; }
  if (!confirm(`¿Suspender acceso a ${email}?`)) return;

  const { error } = await sb.from("licencias").update({ activo: false }).eq("email", email);

  if (error) { mostrarMsgAdmin("Error: " + error.message, "red"); return; }

  mostrarMsgAdmin(`🚫 Acceso suspendido para ${email}`, "red");
  await cargarSuscriptores();
}

async function suspenderRapido(email) {
  if (!confirm(`¿Suspender acceso a ${email}?`)) return;
  const { error } = await sb.from("licencias").update({ activo: false }).eq("email", email);
  if (!error) await cargarSuscriptores();
}

// ══════════════════════════════════════
// VER DETALLE DEL SUSCRIPTOR
// ══════════════════════════════════════
function verDetalle(email) {
  const u = todosLosSuscriptores.find(x => x.email === email);
  if (!u) return;

  const vence = u.vence ? new Date(u.vence).toLocaleDateString("es-AR") : "Sin vencimiento";

  const modal = document.createElement("div");
  modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;
    display:flex;align-items:center;justify-content:center;padding:16px`;

  modal.innerHTML = `
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;
      padding:24px;max-width:400px;width:100%;position:relative">
      <button onclick="this.closest('[style]').remove()"
        style="position:absolute;top:10px;right:12px;background:none;border:none;
        color:var(--muted2);font-size:1.2rem;cursor:pointer;width:auto;padding:0">✕</button>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <img src="${escapeHtml(safeImgUrl(u.avatar))}" onerror="this.style.display='none'"
          style="width:48px;height:48px;border-radius:50%;border:2px solid var(--verde)">
        <div>
          <div style="font-weight:700;font-size:1rem">${escapeHtml(u.nombre)||"—"}</div>
          <div style="color:var(--muted2);font-size:.78rem">${escapeHtml(u.email)}</div>
        </div>
      </div>
      <div style="display:grid;gap:6px;font-size:.82rem">
        <div>Empresa: <b>${escapeHtml(u.empresa)||"—"}</b></div>
        <div>Plan: <b>${escapeHtml(u.plan?.toUpperCase())}</b></div>
        <div>Estado: <b>${u.activo ? "✅ Activo" : "🚫 Suspendido"}</b></div>
        <div>Vence: <b>${vence}</b></div>
        <div>Registro: <b>${u.fecha_registro ? new Date(u.fecha_registro).toLocaleDateString("es-AR") : "—"}</b></div>
      </div>
      <div class="btn-row" style="margin-top:14px">
        <button class="btn btn-verde" onclick="activarRapido('${u.email}');this.closest('[style]').remove()">✅ Renovar 30 días</button>
        <button class="btn btn-red btn-sm" onclick="suspenderRapido('${u.email}');this.closest('[style]').remove()">🚫 Suspender</button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
}

// ══════════════════════════════════════
// NOTIFICACIONES A USUARIOS
// ══════════════════════════════════════
async function enviarNotificacion() {
  const msg = document.getElementById("adm-notif")?.value.trim();
  const dest = document.getElementById("adm-dest")?.value;
  const tipo = document.getElementById("adm-notif-tipo")?.value;

  if (!msg) { mostrarMsgAdmin("Escribí el mensaje", "red"); return; }

  // Filtrar destinatarios
  const ahora = new Date();
  let destinatarios = todosLosSuscriptores;

  if (dest === "pro") {
    destinatarios = destinatarios.filter(u => u.plan === "pro" && u.activo &&
      (!u.vence || new Date(u.vence) > ahora));
  } else if (dest === "gratis") {
    destinatarios = destinatarios.filter(u => u.plan === "gratis");
  }

  // Guardar notificación en Supabase para que la vean al entrar
  const inserts = destinatarios.map(u => ({
    email_destino: u.email,
    mensaje: msg,
    tipo,
    leido: false,
    fecha: new Date().toISOString()
  }));

  if (inserts.length) {
    const { error } = await sb.from("notificaciones").insert(inserts);
    if (error) { mostrarMsgAdmin("Error: " + error.message, "red"); return; }
  }

  document.getElementById("adm-notif").value = "";
  mostrarMsgAdmin(`✅ Notificación enviada a ${destinatarios.length} usuario(s)`, "verde");
}

// ══════════════════════════════════════
// HELPER MENSAJES
// ══════════════════════════════════════
function mostrarMsgAdmin(msg, tipo) {
  const el = document.getElementById("adm-msg");
  if (!el) return;
  el.style.display = "block";
  el.style.background = tipo === "verde" ? "rgba(34,197,94,.1)" : "rgba(239,68,68,.1)";
  el.style.border = `1px solid var(--${tipo})`;
  el.style.color = `var(--${tipo})`;
  el.textContent = msg;
  setTimeout(() => { if (el) el.style.display = "none"; }, 5000);
}

// ══════════════════════════════════════
// BACKUP MANUAL COMPLETO
// ══════════════════════════════════════
async function exportarBackupCompleto() {
  mostrarMsgAdmin("Generando backup, un momento...", "verde");
  try {
    const [licencias, datos, pagos, notifs] = await Promise.all([
      sb.from("licencias").select("*"),
      sb.from("datos_usuario").select("*"),
      sb.from("pagos").select("*"),
      sb.from("notificaciones").select("*"),
    ]);
    const backup = {
      generado: new Date().toISOString(),
      licencias: licencias.data || [],
      datos_usuario: datos.data || [],
      pagos: pagos.data || [],
      notificaciones: notifs.data || [],
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `franz-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    mostrarMsgAdmin(`Backup descargado: ${backup.licencias.length} licencias, ${backup.datos_usuario.length} registros de datos, ${backup.pagos.length} pagos`, "verde");
    if (typeof registrarEvento === "function") registrarEvento("backup_exportado", {
      licencias: backup.licencias.length, datos: backup.datos_usuario.length, pagos: backup.pagos.length,
    });
  } catch (e) {
    console.error(e);
    mostrarMsgAdmin("Error al generar el backup", "red");
  }
}

// ══════════════════════════════════════
// HISTORIAL DE PAGOS
// ══════════════════════════════════════
let todosLosPagos = [];

async function cargarPagos() {
  const { data, error } = await sb.from("pagos").select("*").order("fecha", { ascending: false });
  if (error) { console.warn("Error cargando pagos:", error.message); return; }
  todosLosPagos = data || [];
  const cnt = document.getElementById("adm-pagos-count");
  if (cnt) cnt.textContent = todosLosPagos.length;

  const total = todosLosPagos.reduce((s, p) => s + (Number(p.monto) || 0), 0);
  const ahora = new Date();
  const totalMes = todosLosPagos
    .filter(p => { const f = new Date(p.fecha); return f.getMonth() === ahora.getMonth() && f.getFullYear() === ahora.getFullYear(); })
    .reduce((s, p) => s + (Number(p.monto) || 0), 0);
  const elTotal = document.getElementById("adm-pagos-total");
  const elMes = document.getElementById("adm-pagos-mes");
  if (elTotal) elTotal.textContent = "$" + total.toLocaleString("es-AR");
  if (elMes) elMes.textContent = "$" + totalMes.toLocaleString("es-AR");

  renderTablaPagos(todosLosPagos);
}

function filtrarPagos(txt) {
  const metodo = document.getElementById("adm-pagos-filtro")?.value || "";
  const filtrados = todosLosPagos.filter(p => {
    const mTxt = !txt || (p.email || "").toLowerCase().includes(txt.toLowerCase());
    const mMetodo = !metodo || p.metodo === metodo;
    return mTxt && mMetodo;
  });
  renderTablaPagos(filtrados);
}

function renderTablaPagos(lista) {
  const tbody = document.getElementById("adm-pagos-tabla");
  if (!tbody) return;
  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:20px">Sin pagos registrados todavía</td></tr>`;
    return;
  }
  tbody.innerHTML = lista.map(p => `<tr>
    <td style="font-size:.78rem">${p.fecha ? new Date(p.fecha).toLocaleDateString("es-AR") : "—"}</td>
    <td style="font-size:.78rem">${escapeHtml(p.email)}</td>
    <td><span class="badge badge-cyan">${escapeHtml((p.plan||"").toUpperCase())}</span></td>
    <td style="font-weight:700;color:var(--verde)">$${Number(p.monto||0).toLocaleString("es-AR")}</td>
    <td style="font-size:.78rem">${escapeHtml(p.metodo)}</td>
    <td style="font-size:.7rem;color:var(--muted2)">${escapeHtml(p.referencia)||"—"}</td>
  </tr>`).join("");
}

// ══════════════════════════════════════
// REGISTRO DE AUDITORÍA
// ══════════════════════════════════════
let todaLaAuditoria = [];

async function cargarAuditoria() {
  const { data, error } = await sb.from("registro_auditoria").select("*").order("fecha", { ascending: false }).limit(500);
  if (error) { console.warn("Error cargando auditoría:", error.message); return; }
  todaLaAuditoria = data || [];
  const cnt = document.getElementById("adm-audit-count");
  if (cnt) cnt.textContent = todaLaAuditoria.length;
  renderTablaAuditoria(todaLaAuditoria);
}

function filtrarAuditoria(txt) {
  const accion = document.getElementById("adm-audit-filtro")?.value || "";
  const filtrados = todaLaAuditoria.filter(a => {
    const mTxt = !txt || (a.email || "").toLowerCase().includes(txt.toLowerCase());
    const mAccion = !accion || a.accion === accion;
    return mTxt && mAccion;
  });
  renderTablaAuditoria(filtrados);
}

const BADGE_ACCION = {
  login: "badge-blue", cambio_plan: "badge-cyan", compra: "badge-green",
  backup_exportado: "badge-yellow", error: "badge-red",
};
function renderTablaAuditoria(lista) {
  const tbody = document.getElementById("adm-audit-tabla");
  if (!tbody) return;
  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:20px">Sin eventos registrados todavía</td></tr>`;
    return;
  }
  tbody.innerHTML = lista.map(a => `<tr>
    <td style="font-size:.74rem">${a.fecha ? new Date(a.fecha).toLocaleString("es-AR") : "—"}</td>
    <td style="font-size:.78rem">${escapeHtml(a.email)}</td>
    <td><span class="badge ${BADGE_ACCION[a.accion]||"badge-cyan"}">${escapeHtml(a.accion)}</span></td>
    <td style="font-size:.74rem;color:var(--muted2)">${escapeHtml(a.origen)}</td>
    <td style="font-size:.68rem;color:var(--muted2);max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(JSON.stringify(a.detalle||{}))}">${escapeHtml(JSON.stringify(a.detalle||{}))}</td>
  </tr>`).join("");
}
