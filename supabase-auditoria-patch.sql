-- ============================================
-- FRANZ ELECTRICISTA — PARCHE: AUDITORÍA DE SEGURIDAD (2ª RONDA)
-- Ejecutar en: Supabase → SQL Editor → New query
-- ============================================

-- ────────────────────────────────────────────
-- 1) Arregla la interacción entre "blindar_licencia" y la
--    auto-expiración de una licencia Pro vencida.
--
-- ANTES: el trigger anti-escalamiento revertía CUALQUIER cambio
-- a "activo" que no viniera del admin o del webhook — incluido
-- el intento legítimo del propio usuario de marcarse como vencido
-- cuando su fecha "vence" ya pasó. Efecto real: un Pro vencido
-- quedaba con activo=true para siempre en la base, y el límite
-- de plan gratis lo seguía tratando como Pro sin límite.
--
-- AHORA: se permite UNA sola transición fuera del admin/webhook:
-- activo true → false (apagarse a sí mismo cuando venció).
-- Nunca se permite false → true (reactivarse solo), ni tocar
-- "plan" o "vence" bajo ninguna circunstancia.
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION blindar_licencia()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.role() = 'service_role'
     OR auth.jwt() ->> 'email' = 'franzelectricidad@gmail.com' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.plan   := OLD.plan;
    NEW.vence  := OLD.vence;
    -- Solo se permite la transición true -> false (auto-expiración).
    -- Cualquier otro intento sobre "activo" se ignora y se mantiene el valor anterior.
    IF NOT (OLD.activo = true AND NEW.activo = false) THEN
      NEW.activo := OLD.activo;
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    NEW.plan   := 'gratis';
    NEW.activo := true;
    NEW.vence  := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- (el trigger ya existente "trg_blindar_licencia" usa esta misma función, no hace falta recrearlo)

-- ────────────────────────────────────────────
-- 2) Blinda el webhook de MercadoPago contra un pago duplicado
--    procesado dos veces por una condición de carrera (dos
--    notificaciones casi simultáneas para el mismo pago).
--
-- El código del webhook ya chequea "¿existe este pago?" antes de
-- insertarlo, pero eso deja una micro-ventana de milisegundos
-- donde dos llamadas en paralelo podrían pasar el chequeo antes
-- de que la primera termine de guardar. Esto lo hace imposible
-- a nivel base de datos, no solo a nivel código.
-- ────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS pagos_referencia_unica
  ON pagos (referencia)
  WHERE referencia IS NOT NULL;

-- FIN DEL PARCHE
-- ============================================
