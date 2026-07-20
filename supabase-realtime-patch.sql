-- ============================================
-- FRANZ ELECTRICIDAD PRO — HABILITAR REALTIME
-- Ejecutar en: Supabase → SQL Editor → New query
-- ============================================
-- Sin esto, la sincronización entre dispositivos funciona
-- (sync.js ya está corregido), pero solo se actualiza cada
-- vez que abrís la app o cada 5 min (auto-sync de respaldo).
-- Con esto, un dato cargado en el celular aparece en la PC
-- en pocos segundos, sin recargar la página.
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE datos_usuario;

-- Verificación (opcional): tablas con Realtime activo
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- FIN DEL PATCH
-- ============================================
