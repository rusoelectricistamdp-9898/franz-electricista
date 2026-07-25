/* ============================================
   FRANZ ELECTRICISTA — AUDITORIA.JS
   Complementa los triggers automáticos de la base de datos con
   eventos que solo se pueden detectar del lado del navegador.
============================================ */

async function registrarEvento(accion, detalle) {
  try {
    if (typeof sb === "undefined" || !usuarioActual) return;
    await sb.from("registro_auditoria").insert({
      email: usuarioActual.email,
      accion,
      detalle: detalle || {},
      origen: "cliente",
    });
  } catch (e) {
    // La auditoría nunca debe romper la app si falla
    console.warn("No se pudo registrar el evento de auditoría:", e);
  }
}

// Errores no controlados del navegador — best effort, para poder
// investigar después "el cliente dice que se le rompió algo"
window.addEventListener("error", (e) => {
  registrarEvento("error", {
    mensaje: String(e.message || "").slice(0, 300),
    archivo: e.filename || "",
    linea: e.lineno || 0,
  });
});
window.addEventListener("unhandledrejection", (e) => {
  registrarEvento("error", {
    mensaje: "Promesa rechazada: " + String(e.reason?.message || e.reason || "").slice(0, 300),
  });
});
