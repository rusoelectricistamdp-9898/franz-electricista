-- ============================================
-- FRANZ ELECTRICIDAD PRO — SUPABASE SQL
-- Ejecutar en: Supabase → SQL Editor → New query
-- ============================================

-- 1. TABLA DE LICENCIAS (suscriptores)
CREATE TABLE IF NOT EXISTS licencias (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email           TEXT UNIQUE NOT NULL,
  nombre          TEXT,
  avatar          TEXT,
  empresa         TEXT,
  empresa_data    JSONB,
  logo_url        TEXT,
  plan            TEXT DEFAULT 'gratis',  -- 'gratis', 'pro', 'admin'
  activo          BOOLEAN DEFAULT true,
  vence           TIMESTAMPTZ,            -- NULL = sin vencimiento
  fecha_registro  TIMESTAMPTZ DEFAULT NOW(),
  notas_admin     TEXT
);

-- 2. TABLA DE DATOS DE USUARIO (sync multi-dispositivo)
CREATE TABLE IF NOT EXISTS datos_usuario (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email       TEXT NOT NULL,
  tabla       TEXT NOT NULL,             -- 'clientes', 'obras', etc.
  datos       TEXT,                      -- JSON serializado
  actualizado TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email, tabla)
);

-- 3. TABLA DE NOTIFICACIONES (admin → usuarios)
CREATE TABLE IF NOT EXISTS notificaciones (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_destino  TEXT NOT NULL,
  mensaje        TEXT NOT NULL,
  tipo           TEXT DEFAULT 'verde',   -- 'verde', 'yellow', 'red', 'cyan'
  leido          BOOLEAN DEFAULT false,
  fecha          TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA DE PAGOS (registro de pagos recibidos)
CREATE TABLE IF NOT EXISTS pagos (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email           TEXT NOT NULL,
  monto           NUMERIC,
  plan            TEXT,
  metodo          TEXT,                  -- 'mercadopago', 'transferencia'
  referencia      TEXT,
  fecha           TIMESTAMPTZ DEFAULT NOW(),
  notas           TEXT
);

-- ══════════════════════════════════════
-- SEGURIDAD: Row Level Security (RLS)
-- ══════════════════════════════════════

-- Habilitar RLS en todas las tablas
ALTER TABLE licencias       ENABLE ROW LEVEL SECURITY;
ALTER TABLE datos_usuario   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos           ENABLE ROW LEVEL SECURITY;

-- LICENCIAS: cada usuario solo ve la suya
CREATE POLICY "usuario_ve_su_licencia" ON licencias
  FOR SELECT USING (auth.jwt() ->> 'email' = email);

CREATE POLICY "usuario_inserta_su_licencia" ON licencias
  FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = email);

CREATE POLICY "usuario_actualiza_su_licencia" ON licencias
  FOR UPDATE USING (auth.jwt() ->> 'email' = email);

-- DATOS_USUARIO: cada usuario solo ve los suyos
CREATE POLICY "usuario_ve_sus_datos" ON datos_usuario
  FOR ALL USING (auth.jwt() ->> 'email' = email);

-- NOTIFICACIONES: cada usuario solo ve las suyas
CREATE POLICY "usuario_ve_sus_notifs" ON notificaciones
  FOR ALL USING (auth.jwt() ->> 'email' = email_destino);

-- ADMIN: tu email tiene acceso total (reemplazá con tu Gmail)
CREATE POLICY "admin_acceso_total_licencias" ON licencias
  FOR ALL USING (auth.jwt() ->> 'email' = 'franzelectricidad@gmail.com');

CREATE POLICY "admin_acceso_total_datos" ON datos_usuario
  FOR ALL USING (auth.jwt() ->> 'email' = 'franzelectricidad@gmail.com');

CREATE POLICY "admin_acceso_total_notifs" ON notificaciones
  FOR ALL USING (auth.jwt() ->> 'email' = 'franzelectricidad@gmail.com');

CREATE POLICY "admin_acceso_total_pagos" ON pagos
  FOR ALL USING (auth.jwt() ->> 'email' = 'franzelectricidad@gmail.com');

-- ══════════════════════════════════════
-- STORAGE: bucket para logos de empresas
-- ══════════════════════════════════════
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "logos_publicos" ON storage.objects
  FOR SELECT USING (bucket_id = 'logos');

CREATE POLICY "usuario_sube_su_logo" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'logos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "usuario_actualiza_su_logo" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'logos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ══════════════════════════════════════
-- FUNCIÓN: vencer licencias automáticamente
-- (ejecutar como cron job en Supabase Edge Functions)
-- ══════════════════════════════════════
CREATE OR REPLACE FUNCTION vencer_licencias_expiradas()
RETURNS void AS $$
BEGIN
  UPDATE licencias
  SET activo = false
  WHERE vence IS NOT NULL
    AND vence < NOW()
    AND activo = true;
END;
$$ LANGUAGE plpgsql;

-- ══════════════════════════════════════
-- DATOS INICIALES: tu propia licencia admin
-- (reemplazá el email con tu Gmail real)
-- ══════════════════════════════════════
INSERT INTO licencias (email, nombre, plan, activo, vence)
VALUES ('franzelectricidad@gmail.com', 'Franz Admin', 'admin', true, NULL)
ON CONFLICT (email) DO UPDATE SET plan = 'admin', activo = true;

-- FIN DEL SETUP
-- ============================================
