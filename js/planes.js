/* ============================================
   FRANZ ELECTRICISTA — PLANES.JS
   Antes, los límites del plan gratis existían en PLANES
   pero NUNCA se chequeaban en ningún lado (cualquiera podía
   cargar clientes/obras infinitos). Este módulo los hace reales:
   - Cupo de prueba: 3 clientes, 3 obras, 3 presupuestos
   - Fotos y firma SÍ funcionan en el free (van adentro del
     cupo de obras, para que el técnico vea que sirve)
   - Facturas: solo Pro
   - Catálogo: categorías avanzadas visibles pero bloqueadas
============================================ */

const LIMITES_GRATIS = { clientes: 3, obras: 3, presupuestos: 3, facturas: 0 };

// Categorías "avanzadas" del catálogo — visibles en gris para el plan gratis,
// dan el gusto de verlas (venden el Pro) pero no se pueden seleccionar.
const CATEGORIAS_PRO = ["Industrial", "Refrigeración", "HVAC", "Automatización", "Solar"];

function esPro() {
  const plan = licenciaActual?.plan;
  return plan === "pro" || plan === "admin";
}

function limiteDe(tabla) {
  if (esPro()) return Infinity;
  return LIMITES_GRATIS[tabla] ?? Infinity;
}

function usoDe(tabla) {
  return (DB[tabla] || []).length;
}

function puedeAgregar(tabla) {
  return usoDe(tabla) < limiteDe(tabla);
}

// Corta el guardado y abre el modal de upgrade si ya se llegó al tope.
// Se usa así al principio de guardarCliente/guardarObra/guardarPresupuesto:
//   if (bloquearPorLimite("clientes", "clientes")) return;
function bloquearPorLimite(tabla, nombreVisible) {
  if (puedeAgregar(tabla)) return false;
  toast(`Llegaste al límite de ${nombreVisible} del plan gratis (${limiteDe(tabla)}). Pasate a Pro para seguir.`, "red");
  if (typeof mostrarModalUpgrade === "function") mostrarModalUpgrade();
  return true;
}

// Pinta el chip "2 de 3 usados (plan gratis)" al lado del contador de cada listado.
// No hace nada si el usuario ya es Pro (no hay cupo que mostrar).
function pintarCupo(tabla, spanId) {
  const el = get(spanId);
  if (!el) return;
  if (esPro()) { el.innerHTML = ""; return; }
  const limite = limiteDe(tabla);
  if (limite === Infinity) { el.innerHTML = ""; return; }
  const uso = usoDe(tabla);
  const clase = uso >= limite ? "badge-red" : (uso === limite - 1 ? "badge-yellow" : "badge-cyan");
  el.innerHTML = `<span class="badge ${clase}" title="Plan gratis">${uso} de ${limite} usados</span>`;
}

function esCategoriaBloqueada(categoria) {
  return !esPro() && CATEGORIAS_PRO.includes(categoria);
}
