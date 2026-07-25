// ============================================
// FRANZ ELECTRICISTA — supabase/functions/crear-preferencia
// Crea una preferencia de pago en MercadoPago (Checkout Pro)
// y devuelve la URL a la que hay que redirigir al usuario.
//
// Variables de entorno necesarias (Supabase → Project Settings → Edge Functions → Secrets):
//   MP_ACCESS_TOKEN   → tu Access Token de producción de MercadoPago
//   APP_URL           → URL pública de tu app (ej: https://franzelectricidad.com.ar)
//   SUPABASE_URL, SUPABASE_ANON_KEY → ya vienen inyectadas automáticamente por Supabase
// ============================================

const PLANES: Record<string, { titulo: string; precio: number }> = {
  mensual: { titulo: "Franz Electricista — Plan Mensual", precio: 8000 },
  anual:   { titulo: "Franz Electricista — Plan Anual",   precio: 80000 },
};

// Restringí esto a tu dominio real una vez que publiques (ej: "https://tu-usuario.github.io").
// Dejarlo en "*" solo mientras probás en local.
const ORIGEN_PERMITIDO = Deno.env.get("APP_URL") || "*";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ORIGEN_PERMITIDO,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const { email, plan } = await req.json();

    if (!email || !plan || !PLANES[plan]) {
      return new Response(JSON.stringify({ error: "email y plan (mensual|anual) son obligatorios" }), {
        status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
    const APP_URL = Deno.env.get("APP_URL") || "https://franzelectricidad.com.ar";
    if (!MP_ACCESS_TOKEN) {
      return new Response(JSON.stringify({ error: "Falta configurar MP_ACCESS_TOKEN en los secrets" }), {
        status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const { titulo, precio } = PLANES[plan];

    const preferencia = {
      items: [{
        title: titulo,
        quantity: 1,
        unit_price: precio,
        currency_id: "ARS",
      }],
      payer: { email },
      metadata: { email, plan },
      external_reference: `${email}|${plan}`,
      back_urls: {
        success: `${APP_URL}/index.html?pago=exito`,
        failure: `${APP_URL}/index.html?pago=fallo`,
        pending: `${APP_URL}/index.html?pago=pendiente`,
      },
      auto_return: "approved",
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mp-webhook`,
    };

    const resp = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferencia),
    });

    const data = await resp.json();

    if (!resp.ok) {
      console.error("Error MercadoPago:", data); // detalle completo queda solo en los logs del servidor
      return new Response(JSON.stringify({ error: "No se pudo crear la preferencia de pago. Intentá de nuevo en unos minutos." }), {
        status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ init_point: data.init_point }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Error interno" }), {
      status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
