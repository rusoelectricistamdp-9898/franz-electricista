-- ============================================
-- FRANZ ELECTRICISTA — SISTEMA DE AUDITORÍA
-- Ejecutar en: Supabase → SQL Editor → New query
-- ============================================
-- Registra automáticamente (sin depender del código de la app):
--   - Cada cambio de plan/estado de una licencia (quién lo hizo, cuándo)
--   - Cada compra registrada
-- Y desde la app se registran además (ver js/auditoria.js):
--   - Inicios de sesión
--   - Exportación de backups
--   - Errores no controlados del navegador
--
-- Para qué sirve: si un cliente dice "pagué y no se activó" o "me
-- desaparecieron mis datos", acá queda el historial exacto de qué
-- pasó, cuándo, y si fue automático (webhook/trigger) o manual (admin).
-- ============================================

CREATE TABLE IF NOT EXISTS registro_auditoria (
  id       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email    TEXT,
  accion   TEXT NOT NULL,        -- 'login','cambio_plan','compra','backup_exportado','error', etc.
  detalle  JSONB,
  origen   TEXT,                 -- 'trigger_db','admin','cliente','webhook'
  fecha    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE registro_auditoria ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden INSERTAR sus propios eventos (login, error) pero
-- nunca leer ni modificar el registro — así nadie puede borrar su rastro.
CREATE POLICY "usuario_inserta_su_evento" ON registro_auditoria
  FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = email);

-- Solo el admin puede leer el historial completo
CREATE POLICY "admin_lee_auditoria" ON registro_auditoria
  FOR SELECT USING (auth.jwt() ->> 'email' = 'franzelectricidad@gmail.com');

-- ────────────────────────────────────────────
-- Trigger automático: cada cambio de plan/activo/vence en licencias
-- queda registrado solo, sin importar si lo disparó el admin, el
-- webhook de MercadoPago, o la auto-expiración.
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION auditar_cambio_licencia()
RETURNS TRIGGER AS $$
DECLARE
  v_origen TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.plan IS NOT DISTINCT FROM OLD.plan
     AND NEW.activo IS NOT DISTINCT FROM OLD.activo
     AND NEW.vence IS NOT DISTINCT FROM OLD.vence THEN
    RETURN NEW; -- no cambió nada relevante, no ensuciamos el log
  END IF;

  v_origen := CASE
    WHEN auth.role() = 'service_role' THEN 'webhook'
    WHEN auth.jwt() ->> 'email' = 'franzelectricidad@gmail.com' THEN 'admin'
    ELSE 'cliente'
  END;

  INSERT INTO registro_auditoria (email, accion, detalle, origen)
  VALUES (
    NEW.email, 'cambio_plan',
    jsonb_build_object(
      'plan_anterior', CASE WHEN TG_OP='UPDATE' THEN OLD.plan ELSE NULL END,
      'plan_nuevo', NEW.plan,
      'activo_anterior', CASE WHEN TG_OP='UPDATE' THEN OLD.activo ELSE NULL END,
      'activo_nuevo', NEW.activo,
      'vence', NEW.vence
    ),
    v_origen
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auditar_licencia ON licencias;
CREATE TRIGGER trg_auditar_licencia
  AFTER INSERT OR UPDATE ON licencias
  FOR EACH ROW EXECUTE FUNCTION auditar_cambio_licencia();

-- ────────────────────────────────────────────
-- Trigger automático: cada pago insertado queda registrado
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION auditar_pago()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO registro_auditoria (email, accion, detalle, origen)
  VALUES (
    NEW.email, 'compra',
    jsonb_build_object('monto', NEW.monto, 'plan', NEW.plan, 'metodo', NEW.metodo, 'referencia', NEW.referencia),
    CASE WHEN NEW.metodo = 'mercadopago' THEN 'webhook' ELSE 'admin' END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auditar_pago ON pagos;
CREATE TRIGGER trg_auditar_pago
  AFTER INSERT ON pagos
  FOR EACH ROW EXECUTE FUNCTION auditar_pago();

-- FIN
-- ============================================
