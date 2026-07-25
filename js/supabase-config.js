/* ============================================
   FRANZ ELECTRICIDAD PRO — SUPABASE CONFIG
============================================ */
const SUPABASE_URL = "https://cipzeluejrthpvhsegtp.supabase.co";
const SUPABASE_KEY = "sb_publishable_WB-Vly2AnWbLoHWTEdJFsQ_X9DzNgiP"; // anon key pública

// Email del administrador (solo vos)
const ADMIN_EMAIL = "rusoelectricista.mdp@gmail.com"; // <-- cambiá por tu Gmail real

// Datos de contacto para pago por transferencia (alternativa a MercadoPago)
const WHATSAPP_NUMERO = "5492234250866"; // tu WhatsApp con código de país y área
const ALIAS_TRANSFERENCIA = "Franz.tecnico";

// Planes disponibles
const PLANES = {
  gratis: {
    nombre: "Gratis",
    precio: 0,
    funciones: ["clientes_basico","obras_basico","materiales_basico"],
    limites: { clientes: 3, obras: 3, presupuestos: 3, facturas: 3 }
  },
  pro: {
    nombre: "Pro",
    precio_mes: 8000,   // ARS por mes — ajustá a tu criterio
    precio_anual: 80000, // ARS por año (2 meses gratis)
    funciones: ["todo"],
    limites: { clientes: 9999, obras: 9999, presupuestos: 9999, facturas: 9999 }
  }
};
