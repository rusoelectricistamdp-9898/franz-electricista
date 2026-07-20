-- ============================================
-- FRANZ ELECTRICIDAD PRO — PARCHE DE SEGURIDAD
-- Ejecutar en: Supabase → SQL Editor → New query
-- ============================================
-- PROBLEMA QUE RESUELVE:
-- La política "usuario_actualiza_su_licencia" (y el INSERT) permitían
-- que cualquier usuario autenticado modificara SU PROPIA fila en
-- "licencias" sin restricción de columnas. Eso significa que, desde
-- la consola del navegador, cualquier cuenta gratuita podía ejecutar:
--
--   sb.from('licencias').update({plan:'admin', activo:true}).eq('email','...')
--
-- y otorgarse acceso Pro/Admin sin pagar nunca. Este trigger bloquea
-- los campos sensibles (plan, activo, vence) para cualquiera que NO
-- sea vos (el admin) o el backend de pagos (service_role key, que
-- vas a usar en la función/webhook de MercadoPago).
-- ============================================

CREATE OR REPLACE FUNCTION blindar_licencia()
RETURNS TRIGGER AS $$
BEGIN
  -- service_role (webhook de MercadoPago) y tu email de admin
  -- son los ÚNICOS que pueden tocar plan / activo / vence.
  IF auth.role() = 'service_role'
     OR auth.jwt() ->> 'email' = 'franzelectricidad@gmail.com' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.plan   := OLD.plan;
    NEW.activo := OLD.activo;
    NEW.vence  := OLD.vence;
  ELSIF TG_OP = 'INSERT' THEN
    -- Todo usuario nuevo arranca en plan gratis, sin excepción.
    NEW.plan   := 'gratis';
    NEW.activo := true;
    NEW.vence  := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_blindar_licencia ON licencias;
CREATE TRIGGER trg_blindar_licencia
  BEFORE INSERT OR UPDATE ON licencias
  FOR EACH ROW EXECUTE FUNCTION blindar_licencia();

-- ============================================
-- Verificación rápida (opcional): ver todos los triggers activos
-- ============================================
-- SELECT tgname FROM pg_trigger WHERE tgrelid = 'licencias'::regclass;

-- FIN DEL PARCHE
-- ============================================
