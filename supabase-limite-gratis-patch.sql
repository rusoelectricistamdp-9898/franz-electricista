-- ============================================
-- FRANZ ELECTRICISTA — PARCHE: LÍMITE DE PLAN GRATIS EN EL SERVIDOR
-- Ejecutar en: Supabase → SQL Editor → New query
-- ============================================
-- PROBLEMA QUE RESUELVE:
-- Hoy el límite de "3 clientes/obras/presupuestos/facturas" en el
-- plan gratis solo se chequea en el JavaScript del navegador
-- (js/app.js → limiteAlcanzado()). Cualquier usuario con conocimientos
-- técnicos podría abrir la consola del navegador y llamar directo a:
--
--   sb.from('datos_usuario').upsert({email:'...', tabla:'clientes', datos: JSON.stringify([...20 clientes...])})
--
-- y saltarse el límite sin pagar nunca. Este trigger lo bloquea
-- también del lado del servidor, sin importar qué diga el navegador.
--
-- Es una segunda capa de seguridad (defensa en profundidad): la app
-- ya bloquea la carga #4 en la interfaz, esto asegura que ni
-- saltándose la interfaz se pueda.
-- ============================================

CREATE OR REPLACE FUNCTION limitar_plan_gratis()
RETURNS TRIGGER AS $$
DECLARE
  v_plan     TEXT;
  v_activo   BOOLEAN;
  v_cantidad INT;
BEGIN
  -- Solo limitamos las 4 tablas con cuota de prueba
  IF NEW.tabla NOT IN ('clientes','obras','presupuestos','facturas') THEN
    RETURN NEW;
  END IF;

  SELECT plan, activo INTO v_plan, v_activo
  FROM licencias WHERE email = NEW.email;

  -- Plan Pro activo: sin límite
  IF v_plan = 'pro' AND v_activo THEN
    RETURN NEW;
  END IF;

  -- Contamos cuántos elementos vienen en el JSON (si no es un array válido, asumimos 0)
  BEGIN
    v_cantidad := jsonb_array_length(NEW.datos::jsonb);
  EXCEPTION WHEN OTHERS THEN
    v_cantidad := 0;
  END;

  IF v_cantidad > 3 THEN
    RAISE EXCEPTION 'Límite del plan gratis alcanzado (3 % máximo). Actualizá a Pro para continuar.', NEW.tabla;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_limitar_plan_gratis ON datos_usuario;
CREATE TRIGGER trg_limitar_plan_gratis
  BEFORE INSERT OR UPDATE ON datos_usuario
  FOR EACH ROW EXECUTE FUNCTION limitar_plan_gratis();

-- ============================================
-- Nota: si en algún momento cambiás el número "3" en la app
-- (LIMITE_GRATIS en js/app.js), acordate de cambiar también
-- el "3" acá arriba para que ambos lados coincidan.
-- ============================================
