/* ============================================
   FRANZ ELECTRICIDAD PRO — PERFIL.JS
   Personalización de cuenta del suscriptor
============================================ */

function renderPaginaPerfil() {
  if (document.getElementById("pg-perfil")) return;
  const main = document.querySelector(".main");
  if (!main) return;

  const pg = document.createElement("div");
  pg.className = "page";
  pg.id = "pg-perfil";
  pg.innerHTML = `
    <div class="ph">
      <div><h1>⚙ Mi perfil</h1><p>Personalizá tu cuenta y empresa</p></div>
    </div>

    <!-- DATOS DE CUENTA -->
    <div class="panel">
      <div class="panel-title">👤 Datos de tu cuenta</div>
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
        <div style="position:relative">
          <img id="perfil-avatar" src=""
            style="width:72px;height:72px;border-radius:50%;border:3px solid var(--verde);object-fit:cover"
            onerror="this.src='data:image/svg+xml,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; viewBox=&quot;0 0 72 72&quot;><circle cx=&quot;36&quot; cy=&quot;36&quot; r=&quot;36&quot; fill=&quot;%2322c55e&quot;/><text x=&quot;36&quot; y=&quot;46&quot; text-anchor=&quot;middle&quot; font-size=&quot;32&quot; fill=&quot;white&quot;>⚡</text></svg>'">
        </div>
        <div>
          <div id="perfil-nombre" style="font-size:1.1rem;font-weight:700"></div>
          <div id="perfil-email" style="font-size:.82rem;color:var(--muted2)"></div>
          <div id="perfil-plan-badge" style="margin-top:4px"></div>
        </div>
      </div>
      <div class="form-grid g2">
        <div class="fld"><label>Fecha de vencimiento</label>
          <input id="perfil-vence" readonly style="background:var(--bg3);opacity:.7"></div>
        <div class="fld"><label>Estado</label>
          <input id="perfil-estado" readonly style="background:var(--bg3);opacity:.7"></div>
      </div>
    </div>

    <!-- PERSONALIZACIÓN DE EMPRESA -->
    <div class="panel">
      <div class="panel-title">🏢 Tu empresa / emprendimiento</div>
      <p style="font-size:.8rem;color:var(--muted2);margin-bottom:12px">
        Estos datos aparecen en tus presupuestos, PDFs y en la app
      </p>
      <div class="form-grid g2">
        <div class="fld"><label>Nombre de tu empresa</label>
          <input id="emp-nombre" placeholder="Ej: García Electricidad"></div>
        <div class="fld"><label>Teléfono / WhatsApp</label>
          <input id="emp-tel" placeholder="+54 9 223..."></div>
        <div class="fld"><label>Dirección</label>
          <input id="emp-dir" placeholder="Ciudad, Provincia"></div>
        <div class="fld"><label>Email de contacto</label>
          <input id="emp-email" type="email" placeholder="info@tuempresa.com"></div>
        <div class="fld"><label>CUIT / matrícula</label>
          <input id="emp-cuit" placeholder="20-XXXXXXXX-X"></div>
        <div class="fld"><label>Sitio web (opcional)</label>
          <input id="emp-web" placeholder="www.tuempresa.com.ar"></div>
      </div>
    </div>

    <!-- LOGO -->
    <div class="panel">
      <div class="panel-title">🖼 Logo de tu empresa</div>
      <p style="font-size:.8rem;color:var(--muted2);margin-bottom:12px">
        Aparecerá en el sidebar, presupuestos y PDFs
      </p>
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <div style="width:80px;height:80px;border-radius:50%;border:3px solid var(--verde);
          overflow:hidden;background:var(--bg3);display:flex;align-items:center;justify-content:center">
          <img id="logo-preview" src="" alt=""
            style="width:100%;height:100%;object-fit:cover;display:none">
          <span id="logo-placeholder" style="font-size:1.8rem">⚡</span>
        </div>
        <div style="flex:1">
          <input type="file" id="logo-input" accept="image/*" style="display:none" onchange="previewLogo(this)">
          <button class="btn btn-outline" style="width:auto;padding:8px 16px" onclick="document.getElementById('logo-input').click()">
            📁 Seleccionar logo
          </button>
          <p style="font-size:.72rem;color:var(--muted2);margin-top:6px">
            PNG, JPG o SVG · Máx 2MB · Recomendado: cuadrado 200x200px
          </p>
        </div>
      </div>
    </div>

    <!-- BOTONES GUARDAR -->
    <div class="btn-row">
      <button class="btn btn-verde" onclick="guardarPerfil()">💾 Guardar cambios</button>
      <button class="btn btn-outline" onclick="mostrarModalUpgrade()">⬆ Ver planes</button>
      <button class="btn btn-red btn-sm" onclick="cerrarSesion()" style="width:auto">🚪 Cerrar sesión</button>
    </div>
    <div id="perfil-msg" style="display:none;margin-top:10px;padding:10px;border-radius:8px;font-size:.84rem"></div>
  `;

  main.appendChild(pg);
}

// ══════════════════════════════════════
// CARGAR DATOS DEL PERFIL
// ══════════════════════════════════════
function cargarPerfil() {
  if (!usuarioActual || !licenciaActual) return;

  const u = usuarioActual;
  const lic = licenciaActual;

  // Avatar
  const avatar = document.getElementById("perfil-avatar");
  if (avatar) avatar.src = lic.logo_url || u.user_metadata?.avatar_url || "";

  const nombre = document.getElementById("perfil-nombre");
  if (nombre) nombre.textContent = lic.nombre || u.user_metadata?.full_name || u.email;

  const email = document.getElementById("perfil-email");
  if (email) email.textContent = u.email;

  const badge = document.getElementById("perfil-plan-badge");
  if (badge) {
    const plan = lic.plan || "gratis";
    badge.innerHTML = `<span class="badge ${plan==="pro"?"badge-cyan":"badge-blue"}">${plan.toUpperCase()}</span>`;
  }

  const vence = document.getElementById("perfil-vence");
  if (vence) vence.value = lic.vence
    ? new Date(lic.vence).toLocaleDateString("es-AR")
    : "Sin vencimiento";

  const estado = document.getElementById("perfil-estado");
  if (estado) estado.value = lic.activo ? "✅ Activo" : "🚫 Suspendido";

  // Datos empresa
  if (lic.empresa_data) {
    try {
      const emp = typeof lic.empresa_data === "string"
        ? JSON.parse(lic.empresa_data)
        : lic.empresa_data;
      const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v || ""; };
      set("emp-nombre", emp.nombre || lic.empresa);
      set("emp-tel", emp.tel);
      set("emp-dir", emp.dir);
      set("emp-email", emp.email);
      set("emp-cuit", emp.cuit);
      set("emp-web", emp.web);
    } catch(e) {}
  } else {
    const empNombre = document.getElementById("emp-nombre");
    if (empNombre) empNombre.value = lic.empresa || "";
  }

  // Logo preview
  if (lic.logo_url) {
    const preview = document.getElementById("logo-preview");
    const placeholder = document.getElementById("logo-placeholder");
    if (preview) { preview.src = lic.logo_url; preview.style.display = "block"; }
    if (placeholder) placeholder.style.display = "none";
  }
}

// ══════════════════════════════════════
// PREVIEW LOGO
// ══════════════════════════════════════
function previewLogo(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { alert("El archivo es muy grande. Máximo 2MB."); return; }

  const reader = new FileReader();
  reader.onload = e => {
    const preview = document.getElementById("logo-preview");
    const placeholder = document.getElementById("logo-placeholder");
    if (preview) { preview.src = e.target.result; preview.style.display = "block"; }
    if (placeholder) placeholder.style.display = "none";
  };
  reader.readAsDataURL(file);
}

// ══════════════════════════════════════
// GUARDAR PERFIL EN SUPABASE
// ══════════════════════════════════════
async function guardarPerfil() {
  if (!usuarioActual) return;

  const empresaData = {
    nombre: document.getElementById("emp-nombre")?.value || "",
    tel: document.getElementById("emp-tel")?.value || "",
    dir: document.getElementById("emp-dir")?.value || "",
    email: document.getElementById("emp-email")?.value || "",
    cuit: document.getElementById("emp-cuit")?.value || "",
    web: document.getElementById("emp-web")?.value || ""
  };

  let logo_url = licenciaActual?.logo_url || "";

  // Subir logo si hay uno nuevo
  const logoInput = document.getElementById("logo-input");
  if (logoInput?.files[0]) {
    const file = logoInput.files[0];
    const ext = file.name.split(".").pop();
    const path = `logos/${usuarioActual.id}.${ext}`;

    const { error: uploadError } = await sb.storage
      .from("logos")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      console.error("Error al subir el logo:", uploadError);
      mostrarMsgPerfil("No se pudo subir el logo: " + uploadError.message, "red");
      return; // no seguimos guardando el resto para que el usuario vea el error y reintente
    }
    const { data: urlData } = sb.storage.from("logos").getPublicUrl(path);
    logo_url = urlData.publicUrl;
  }

  // Actualizar en Supabase
  const { error } = await sb.from("licencias").update({
    empresa: empresaData.nombre,
    empresa_data: empresaData,
    logo_url
  }).eq("email", usuarioActual.email);

  if (error) {
    mostrarMsgPerfil("Error al guardar: " + error.message, "red");
    return;
  }

  // Actualizar local
  licenciaActual.empresa = empresaData.nombre;
  licenciaActual.empresa_data = empresaData;
  licenciaActual.logo_url = logo_url;

  // Actualizar sidebar
  actualizarSidebarUsuario();

  // Actualizar logo sidebar
  const sbLogoImg = document.getElementById("sb-logo-img");
  if (sbLogoImg && logo_url) sbLogoImg.src = logo_url;

  mostrarMsgPerfil("✅ Perfil guardado correctamente", "verde");
}

function mostrarMsgPerfil(msg, tipo) {
  const el = document.getElementById("perfil-msg");
  if (!el) return;
  el.style.display = "block";
  el.style.background = tipo === "verde" ? "rgba(34,197,94,.1)" : "rgba(239,68,68,.1)";
  el.style.border = `1px solid var(--${tipo})`;
  el.style.color = `var(--${tipo})`;
  el.textContent = msg;
  setTimeout(() => { if (el) el.style.display = "none"; }, 4000);
}
