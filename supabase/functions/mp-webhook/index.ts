// ============================================
// FRANZ ELECTRICIDAD PRO — supabase/functions/mp-webhook
// Recibe la notificación de MercadoPago cuando se aprueba un pago,
// CONFIRMA el pago consultando la API de MercadoPago con nuestro
// propio Access Token (nunca confiamos en el body del webhook a
// ciegas), y activa la licencia del usuario automáticamente.
//
// Variables de entorno necesarias (Supabase → Edge Functions → Secrets):
//   MP_ACCESS_TOKEN            → tu Access Token de MercadoPago
//   MP_WEBHOOK_SECRET          → "Clave secreta" del webhook (MP → Tus integraciones → Webhooks)
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY → ya vienen inyectadas automáticamente por Supabase
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-signature, x-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Valida la firma que manda MercadoPago (defensa en profundidad).
// Igualmente, más abajo NUNCA confiamos en el body: siempre reconsultamos
// el pago real contra la API de MercadoPago antes de activar nada.
async function firmaValida(req: Request, dataId: string): Promise<boolean> {
  const secret = Deno.env.get("MP_WEBHOOK_SECRET");
  if (!secret) {
    console.error("MP_WEBHOOK_SECRET no configurado — rechazando notificación por seguridad (fail-closed)");
    return false; // sin secret configurado, no se puede validar nada: rechazamos, no dejamos pasar
  }

  const xSignature = req.headers.get("x-signature") || "";
  const xRequestId = req.headers.get("x-request-id") || "";
  const partes = Object.fromEntries(xSignature.split(",").map(p => p.trim().split("=").map(s=>s.trim())));
  const ts = partes["ts"];
  const v1 = partes["v1"];
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const firmaBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  const firmaHex = Array.from(new Uint8Array(firmaBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
  return firmaHex === v1;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const url = new URL(req.url);
    let body: any = {};
    try { body = await req.json(); } catch (_) { /* algunas notificaciones vienen sin body */ }

    // MercadoPago manda el id del pago en distintos lugares según la versión del webhook
    const dataId = body?.data?.id || url.searchParams.get("data.id") || url.searchParams.get("id");
    const tipo = body?.type || body?.topic || url.searchParams.get("type") || url.searchParams.get("topic");

    if (!dataId || (tipo && tipo !== "payment")) {
      return new Response(JSON.stringify({ ok: true, ignorado: true }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (!(await firmaValida(req, String(dataId)))) {
      console.warn("Firma de webhook inválida, se ignora la notificación");
      return new Response(JSON.stringify({ error: "firma inválida" }), {
        status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN")!;

    // Fuente de verdad: SIEMPRE reconsultamos el pago contra la API de MP con nuestro token.
    const pagoResp = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
      headers: { "Authorization": `Bearer ${MP_ACCESS_TOKEN}` },
    });
    if (!pagoResp.ok) {
      console.warn("No se pudo confirmar el pago", dataId, pagoResp.status);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    const pago = await pagoResp.json();

    if (pago.status !== "approved") {
      return new Response(JSON.stringify({ ok: true, estado: pago.status }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const email: string | undefined = pago.metadata?.email || pago.payer?.email;
    const plan: string = pago.metadata?.plan || (pago.external_reference || "").split("|")[1] || "mensual";
    if (!email) {
      console.warn("Pago aprobado sin email asociado", dataId);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Idempotencia: si ya procesamos este pago, no lo aplicamos dos veces
    const { data: yaExiste } = await supabase
      .from("pagos").select("id").eq("referencia", String(pago.id)).maybeSingle();
    if (yaExiste) {
      return new Response(JSON.stringify({ ok: true, duplicado: true }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Calcula nueva fecha de vencimiento (extiende desde la vigente si todavía no venció)
    const { data: licActual } = await supabase
      .from("licencias").select("vence, activo").eq("email", email).maybeSingle();

    const ahora = new Date();
    let base = ahora;
    if (licActual?.vence && licActual.activo) {
      const venceActual = new Date(licActual.vence);
      if (venceActual > ahora) base = venceActual;
    }
    const diasAExtender = plan === "anual" ? 365 : 30;
    const nuevaFecha = new Date(base.getTime() + diasAExtender * 24 * 60 * 60 * 1000);

    // Insertamos el pago PRIMERO: el índice único de "referencia" (ver
    // supabase-auditoria-patch.sql) es el verdadero cerrojo atómico contra
    // condiciones de carrera — si dos notificaciones llegan casi a la vez
    // para el mismo pago, la segunda inserción falla acá y nunca llega a
    // tocar la licencia, evitando extender el vencimiento dos veces.
    const { error: errorInsert } = await supabase.from("pagos").insert({
      email,
      monto: pago.transaction_amount,
      plan,
      metodo: "mercadopago",
      referencia: String(pago.id),
      fecha: ahora.toISOString(),
      notas: "Activado automáticamente vía webhook",
    });

    if (errorInsert) {
      if (errorInsert.code === "23505") { // unique_violation: ya se procesó este pago
        return new Response(JSON.stringify({ ok: true, duplicado: true }), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      console.error("Error insertando pago:", errorInsert);
      return new Response(JSON.stringify({ ok: false }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    await supabase.from("licencias").update({
      plan: "pro",
      activo: true,
      vence: nuevaFecha.toISOString(),
    }).eq("email", email);

    console.log(`Licencia activada: ${email} → plan ${plan} hasta ${nuevaFecha.toISOString()}`);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error(e);
    // Devolvemos 200 igual para que MercadoPago no reintente en loop por un error nuestro
    return new Response(JSON.stringify({ ok: false }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
