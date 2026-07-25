/* ============================================
   FRANZ ELECTRICIDAD PRO — AUTH.JS
   Login con Google via Supabase
============================================ */

// Inicializar cliente Supabase
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

let usuarioActual = null;
let licenciaActual = null;

// ══════════════════════════════════════
// INICIALIZAR AUTH AL CARGAR LA APP
// ══════════════════════════════════════
async function iniciarAuth() {
  // Verificar si hay sesión activa
  const { data: { session } } = await sb.auth.getSession();

  if (session) {
    usuarioActual = session.user;
    await verificarLicencia();
  } else {
    mostrarPantallaLogin();
  }

  // Escuchar cambios de sesión
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_IN" && session) {
      usuarioActual = session.user;
      await verificarLicencia();
    } else if (event === "SIGNED_OUT") {
      usuarioActual = null;
      licenciaActual = null;
      mostrarPantallaLogin();
    }
  });
}

// ══════════════════════════════════════
// LOGIN CON GOOGLE
// ══════════════════════════════════════
async function loginConGoogle() {
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.href
    }
  });
  if (error) {
    mostrarError("Error al iniciar sesión: " + error.message);
  }
}

async function cerrarSesion() {
  if (typeof desuscribirRealtime === "function") desuscribirRealtime();
  await sb.auth.signOut();
}

// ══════════════════════════════════════
// VERIFICAR LICENCIA DEL USUARIO
// ══════════════════════════════════════
async function verificarLicencia() {
  const email = usuarioActual.email;

  // Si es el admin, acceso total sin verificar licencia
  if (email === ADMIN_EMAIL) {
    licenciaActual = { plan: "admin", activo: true, vence: null };
    mostrarApp("admin");
    return;
  }

  // Buscar licencia en la base de datos
  const { data, error } = await sb
    .from("licencias")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !data) {
    // Usuario nuevo — crear licencia gratis automáticamente
    await crearLicenciaGratis(email);
    return;
  }

  licenciaActual = data;

  // Verificar si la licencia está activa y no vencida
  const ahora = new Date();
  const vence = data.vence ? new Date(data.vence) : null;
  const vencida = vence && ahora > vence;

  if (!data.activo || vencida) {
    // Actualizar estado si venció
    if (vencida && data.activo) {
      await sb.from("licencias").update({ activo: false }).eq("email", email);
      licenciaActual.activo = false;
    }
    mostrarApp("basico"); // Modo limitado
  } else {
    mostrarApp("pro"); // Acceso completo
  }
}

// ══════════════════════════════════════
// CREAR LICENCIA GRATIS PARA NUEVO USUARIO
// ══════════════════════════════════════
async function crearLicenciaGratis(email) {
  const nombre = usuarioActual.user_metadata?.full_name || email.split("@")[0];
  const avatar = usuarioActual.user_metadata?.avatar_url || "";

  const { data, error } = await sb.from("licencias").insert([{
    email,
    nombre,
    avatar,
    plan: "gratis",
    activo: true,
    vence: null,
    empresa: "",
    logo_url: avatar,
    fecha_registro: new Date().toISOString()
  }]).select().single();

  if (!error && data) {
    licenciaActual = data;
  }

  mostrarApp("gratis");
}

// ══════════════════════════════════════
// MOSTRAR APP SEGÚN PLAN
// ══════════════════════════════════════
function mostrarApp(modo) {
  // Ocultar pantalla de login
  const login = document.getElementById("pantalla-login");
  if (login) login.style.display = "none";

  // Mostrar la app
  const app = document.getElementById("app-container");
  if (app) app.style.display = "flex";

  if (typeof registrarEvento === "function") registrarEvento("login", { modo });

  // Actualizar info del usuario en el sidebar
  actualizarSidebarUsuario();

  // Aplicar restricciones según el plan
  if (modo === "basico" || modo === "gratis") {
    aplicarModoBasico(modo);
  } else if (modo === "pro" || modo === "admin") {
    aplicarModoPro(modo);
  }

  // Si es admin, mostrar panel de admin
  if (modo === "admin") {
    mostrarBotonAdmin();
  }

  // Inicializar la app
  ir("dashboard");
  actualizarDashboard();
  sincronizarSelectClientes();
  iniciarPlantillas();
  const fd = document.getElementById("ob-fecha");
  if (fd && !fd.value) fd.value = new Date().toISOString().split("T")[0];

  // Sincronización multi-dispositivo: trae lo que haya en la nube y
  // deja escuchando cambios en tiempo real de otros dispositivos
  if (typeof cargarDesdeNube === "function") {
    cargarDesdeNube().then(() => {
      if (typeof suscribirRealtime === "function") suscribirRealtime();
      if (typeof iniciarAutoSync === "function") iniciarAutoSync();
    });
  }

  // Si volvemos del Checkout de MercadoPago, re-consultamos la licencia
  // (el webhook activa el plan en segundos, esto lo refleja en la UI sin recargar)
  const parametros = new URLSearchParams(window.location.search);
  const pago = parametros.get("pago");
  if (pago) {
    history.replaceState({}, "", window.location.pathname);
    if (pago === "exito") {
      mostrarToastSync?.("✅ Pago recibido, activando tu plan Pro...", "verde");
      setTimeout(() => verificarLicencia(), 4000);
    } else if (pago === "pendiente") {
      mostrarToastSync?.("⏳ Pago pendiente de confirmación", "yellow");
    } else if (pago === "fallo") {
      mostrarToastSync?.("⚠ El pago no se completó", "red");
    }
  }
}

function actualizarSidebarUsuario() {
  if (!usuarioActual) return;

  const nombre = licenciaActual?.nombre || usuarioActual.email;
  const empresa = licenciaActual?.empresa || "Franz Electricista";
  const logo = licenciaActual?.logo_url || "";
  const plan = licenciaActual?.plan || "gratis";
  const vence = licenciaActual?.vence ? new Date(licenciaActual.vence).toLocaleDateString("es-AR") : null;

  const sbLogoImg = document.getElementById("sb-logo-img");
  if (sbLogoImg) {
    sbLogoImg.src = logo || "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 44 44'><circle cx='22' cy='22' r='22' fill='%2322c55e'/><text x='22' y='28' text-anchor='middle' font-size='20' fill='white'>⚡</text></svg>";
  }

  const sbBrand = document.getElementById("sb-brand");
  if (sbBrand) sbBrand.textContent = empresa;

  const sbSub = document.getElementById("sb-sub");
  if (sbSub) {
    sbSub.innerHTML = `<span class="badge ${plan==='pro'?'badge-green':plan==='admin'?'badge-cyan':'badge-yellow'}" style="font-size:.6rem">${plan.toUpperCase()}</span>`;
    if (vence) sbSub.innerHTML += ` <span style="font-size:.62rem;color:var(--muted2)">hasta ${vence}</span>`;
  }

  // Info usuario en footer
  const sbFooter = document.querySelector(".sb-footer");
  if (sbFooter) {
    sbFooter.innerHTML = `${nombre}<br>AEA 90364 · IRAM · IEC<br>Mar del Plata · 2026`;
  }
}

// ══════════════════════════════════════
// RESTRICCIONES POR PLAN
// ══════════════════════════════════════
function aplicarModoBasico(modo) {
  // Ocultar funciones premium en el sidebar
  const funcsPremium = [
    "presupuestos", "relevamiento", "calculadoras",
    "omisiones", "compras", "historial", "componentes"
  ];

  document.querySelectorAll(".menu-btn").forEach(btn => {
    const onclick = btn.getAttribute("onclick") || "";
    funcsPremium.forEach(f => {
      if (onclick.includes(`'${f}'`)) {
        btn.style.opacity = "0.4";
        btn.style.cursor = "not-allowed";
        btn.title = "Requiere plan Pro";
        btn.onclick = (e) => {
          e.preventDefault();
          mostrarModalUpgrade();
        };
      }
    });
  });

  // Banner de upgrade
  mostrarBannerUpgrade(modo);
}

function aplicarModoPro(modo) {
  // Acceso total — nada que restringir
  document.querySelectorAll(".menu-btn").forEach(btn => {
    btn.style.opacity = "";
    btn.style.cursor = "";
    btn.title = "";
  });
}

function mostrarBotonAdmin() {
  const nav = document.querySelector(".sb-nav");
  if (!nav) return;
  const btnAdmin = document.createElement("button");
  btnAdmin.className = "menu-btn";
  btnAdmin.style.cssText = "color:var(--cyan);border-left-color:var(--cyan);background:rgba(0,212,255,.06)";
  btnAdmin.innerHTML = `<span class="ico">🔑</span> Panel Admin`;
  btnAdmin.onclick = () => ir("admin");
  nav.appendChild(btnAdmin);
}

function mostrarBannerUpgrade(modo) {
  const main = document.querySelector(".main");
  if (!main || document.getElementById("banner-upgrade")) return;

  const banner = document.createElement("div");
  banner.id = "banner-upgrade";
  banner.style.cssText = `position:sticky;top:0;z-index:50;background:rgba(234,179,8,.12);
    border-bottom:1px solid rgba(234,179,8,.3);padding:8px 20px;
    display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap`;

  banner.innerHTML = `
    <span style="font-family:Rajdhani,sans-serif;font-size:.82rem;color:var(--yellow)">
      ⚠ ${modo==="gratis"?"Estás en el plan gratuito":"Tu suscripción venció"} — Funciones limitadas
    </span>
    <button class="btn btn-sm" onclick="mostrarModalUpgrade()"
      style="background:var(--yellow);color:#000;padding:5px 14px;font-size:.76rem">
      ⬆ Activar Plan Pro
    </button>
  `;
  main.insertBefore(banner, main.firstChild);
}

function mostrarModalUpgrade() {
  const modal = document.getElementById("modal-upgrade");
  if (modal) { modal.style.display = "flex"; return; }

  const m = document.createElement("div");
  m.id = "modal-upgrade";
  m.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;
    display:flex;align-items:center;justify-content:center;padding:16px`;

  m.innerHTML = `
    <div style="background:var(--bg2);border:1px solid var(--verde);border-radius:16px;
      padding:28px;max-width:440px;width:100%;text-align:center;position:relative">
      <button onclick="document.getElementById('modal-upgrade').style.display='none'"
        style="position:absolute;top:12px;right:14px;background:none;border:none;color:var(--muted2);
        font-size:1.2rem;cursor:pointer;width:auto;padding:0">✕</button>
      <div style="font-size:2rem;margin-bottom:8px">⚡</div>
      <h2 style="color:var(--verde);font-family:Rajdhani,sans-serif;margin-bottom:6px">Franz Electricista Pro</h2>
      <p style="color:var(--muted2);font-size:.84rem;margin-bottom:16px">
        Acceso completo a todas las funciones profesionales
      </p>
      <p style="color:var(--muted2);font-size:.74rem;margin-bottom:14px;border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:8px 0">
        En el plan gratis ya probaste hasta <b style="color:var(--verde)">3 clientes, 3 obras, 3 presupuestos y 3 facturas</b> — con fotos y firma incluidas para que veas cómo funciona. Pasá a Pro para sacarle el límite.
      </p>
      <div style="background:var(--bg3);border-radius:10px;padding:16px;margin-bottom:16px;text-align:left">
        <div style="font-size:.82rem;color:var(--text);line-height:1.9;text-align:left">
          ✅ Clientes, obras, presupuestos y facturas <b>ilimitados</b><br>
          ✅ Catálogo completo de materiales (+2000 ítems)<br>
          ✅ Fotos de evidencia y firma digital ilimitadas<br>
          ✅ Sincronización en tiempo real entre dispositivos<br>
          ✅ Tu logo y empresa en los PDF (sin marca de la app)<br>
          ✅ Agregá tus propios materiales al catálogo
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-bottom:14px">
        <div style="flex:1;background:var(--bg3);border:1px solid var(--verde);border-radius:10px;padding:14px">
          <div style="font-family:Rajdhani,sans-serif;font-size:.72rem;color:var(--muted2);text-transform:uppercase">Mensual</div>
          <div style="font-family:Orbitron,sans-serif;font-size:1.4rem;color:var(--verde);font-weight:900">$8.000</div>
          <div style="font-size:.7rem;color:var(--muted2)">ARS / mes</div>
          <button class="btn btn-verde btn-full" style="margin-top:10px;font-size:.78rem" onclick="iniciarPagoMP('mensual')">
            Pagar mensual
          </button>
        </div>
        <div style="flex:1;background:var(--bg3);border:2px solid var(--verde);border-radius:10px;padding:14px;position:relative">
          <div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);
            background:var(--verde);color:#000;font-size:.65rem;font-weight:800;
            padding:2px 10px;border-radius:20px;white-space:nowrap">2 MESES GRATIS</div>
          <div style="font-family:Rajdhani,sans-serif;font-size:.72rem;color:var(--muted2);text-transform:uppercase">Anual</div>
          <div style="font-family:Orbitron,sans-serif;font-size:1.4rem;color:var(--verde);font-weight:900">$80.000</div>
          <div style="font-size:.7rem;color:var(--muted2)">ARS / año</div>
          <button class="btn btn-verde btn-full" style="margin-top:10px;font-size:.78rem" onclick="iniciarPagoMP('anual')">
            Pagar anual
          </button>
        </div>
      </div>
      <p style="font-size:.74rem;color:var(--muted2)">
        También podés transferir directo y avisarme por WhatsApp — activo tu cuenta a mano en minutos:<br>
        <b style="color:var(--text)">Alias: ${ALIAS_TRANSFERENCIA}</b>
      </p>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button onclick="avisarTransferenciaWA('mensual')" class="btn btn-full"
          style="background:linear-gradient(135deg,#128c2e,#25d366);color:#fff;
          display:flex;align-items:center;justify-content:center;gap:6px;font-size:.76rem;border-radius:8px;padding:10px">
          💬 Avisar transferencia mensual
        </button>
        <button onclick="avisarTransferenciaWA('anual')" class="btn btn-full"
          style="background:linear-gradient(135deg,#128c2e,#25d366);color:#fff;
          display:flex;align-items:center;justify-content:center;gap:6px;font-size:.76rem;border-radius:8px;padding:10px">
          💬 Avisar transferencia anual
        </button>
      </div>
    </div>`;

  document.body.appendChild(m);
  m.addEventListener("click", e => { if(e.target===m) m.style.display="none"; });
}

function avisarTransferenciaWA(plan){
  const monto = plan==="anual" ? "$80.000" : "$8.000";
  const email = usuarioActual?.email || "(no logueado)";
  const msg = `Hola Franz! Ya transferí al alias ${ALIAS_TRANSFERENCIA} el plan ${plan==="anual"?"ANUAL":"MENSUAL"} (${monto}). Mi email en la app es: ${email}. Te paso el comprobante:`;
  window.open(`https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(msg)}`, "_blank");
}

// ══════════════════════════════════════
// MERCADOPAGO (Checkout Pro vía Edge Function — activación automática)
// ══════════════════════════════════════
async function iniciarPagoMP(plan) {
  if (!usuarioActual) { mostrarError("Iniciá sesión primero"); return; }
  const btns = document.querySelectorAll(`[onclick="iniciarPagoMP('${plan}')"]`);
  btns.forEach(b => { b.disabled = true; b.textContent = "Generando link de pago..."; });

  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/crear-preferencia`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify({ email: usuarioActual.email, plan }),
    });
    const data = await resp.json();
    if (!resp.ok || !data.init_point) {
      throw new Error(data.error || "No se pudo generar el link de pago");
    }
    window.location.href = data.init_point; // redirige al Checkout Pro de MercadoPago
  } catch (e) {
    console.error(e);
    mostrarError("No se pudo iniciar el pago. Probá de nuevo o contactanos por WhatsApp.");
    btns.forEach(b => { b.disabled = false; b.textContent = plan === "anual" ? "Pagar anual" : "Pagar mensual"; });
  }
}

// ══════════════════════════════════════
// MOSTRAR PANTALLA DE LOGIN
// ══════════════════════════════════════
function mostrarPantallaLogin() {
  const app = document.getElementById("app-container");
  if (app) app.style.display = "none";

  const login = document.getElementById("pantalla-login");
  if (login) { login.style.display = "flex"; return; }

  const l = document.createElement("div");
  l.id = "pantalla-login";
  l.style.cssText = `position:fixed;inset:0;background:var(--bg);z-index:9000;
    display:flex;align-items:center;justify-content:center;padding:20px`;

  l.innerHTML = `
    <div style="text-align:center;max-width:380px;width:100%">
      <div style="width:90px;height:90px;border-radius:50%;border:3px solid var(--verde);
        box-shadow:0 0 30px rgba(34,197,94,.3);margin:0 auto 20px;overflow:hidden">
        <img src="https://cipzeluejrthpvhsegtp.supabase.co/storage/v1/object/public/logos/logo-franz.png"
          onerror="this.style.display='none';this.parentNode.innerHTML='<div style=\\'font-size:2.5rem;line-height:90px\\'>⚡</div>'"
          style="width:100%;height:100%;object-fit:cover">
      </div>
      <h1 style="font-family:Orbitron,sans-serif;font-size:1.4rem;letter-spacing:.15em;color:#fff;margin-bottom:4px">
        FRANZ ELECTRICISTA
      </h1>
      <p style="font-family:Rajdhani,sans-serif;font-size:.8rem;color:var(--muted2);
        letter-spacing:.12em;text-transform:uppercase;margin-bottom:28px">
        Sistema Profesional · AEA 90364
      </p>
      <button onclick="loginConGoogle()"
        style="width:100%;padding:13px;border:1px solid rgba(255,255,255,.15);border-radius:10px;
        background:var(--bg2);color:var(--text);font-family:Rajdhani,sans-serif;font-size:.95rem;
        font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;
        transition:all .2s;margin-bottom:12px"
        onmouseover="this.style.borderColor='var(--verde)';this.style.background='rgba(34,197,94,.06)'"
        onmouseout="this.style.borderColor='rgba(255,255,255,.15)';this.style.background='var(--bg2)'">
        <svg width="20" height="20" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 32.5 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.2 2.8l5.7-5.7C33.7 7.2 29.1 5 24 5 13.5 5 5 13.5 5 24s8.5 19 19 19c10.9 0 18.6-7.6 18.6-18.3 0-1.2-.1-2.5-.4-3.7z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 13 24 13c2.8 0 5.3 1 7.2 2.8l5.7-5.7C33.7 7.2 29.1 5 24 5 16.2 5 9.5 9 6.3 14.7z"/>
          <path fill="#4CAF50" d="M24 43c5.2 0 9.8-1.9 13.3-5L31 33.1C29.2 34.3 26.7 35 24 35c-5.2 0-9.6-3.4-11.2-8.1l-6.5 5C9.4 39.1 16.2 43 24 43z"/>
          <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.4 4.3-4.4 5.7l6.3 4.9C41.3 35.1 44 30 44 24c0-1.2-.1-2.5-.4-3.7-.1-.1-.1-.2 0-.3z"/>
        </svg>
        Ingresar con Google
      </button>
      <p style="font-size:.74rem;color:var(--muted2);margin-top:8px">
        Tu cuenta se crea automáticamente al ingresar
      </p>
      <div style="margin-top:20px;background:var(--bg2);border:1px solid var(--border);
        border-radius:10px;padding:12px;font-size:.75rem;color:var(--muted2);text-align:left;line-height:1.8">
        <div style="color:var(--verde);font-weight:700;margin-bottom:4px;font-family:Rajdhani,sans-serif">
          ¿Querés el plan completo?
        </div>
        ✅ Presupuestos PDF y WhatsApp<br>
        ✅ Calculadoras AEA<br>
        ✅ Logo personalizado<br>
        ✅ Sincronización entre dispositivos
      </div>
      <p style="font-size:.68rem;color:var(--muted2);margin-top:16px">
        Al ingresar aceptás nuestra <a href="privacidad.html" style="color:var(--muted2)">Política de Privacidad</a>
        y <a href="terminos.html" style="color:var(--muted2)">Términos y Condiciones</a>
      </p>
    </div>`;

  document.body.appendChild(l);
}

function mostrarError(msg) {
  const e = document.createElement("div");
  e.style.cssText = `position:fixed;top:20px;right:20px;z-index:99999;padding:14px 20px;
    background:var(--bg2);border:1px solid var(--red);color:var(--red);border-radius:10px;
    font-size:.84rem;font-weight:700;box-shadow:0 4px 16px rgba(0,0,0,.4)`;
  e.textContent = "❌ " + msg;
  document.body.appendChild(e);
  setTimeout(() => e.remove(), 4000);
}
