# Backups — cómo protegerte de perder datos

## Lo que ya te da Supabase (según tu plan)
- **Plan Free de Supabase:** el proyecto se pausa si no tiene actividad por 7 días
  seguidos (hay que "despertarlo" a mano), y **no incluye backups automáticos**.
  Si tu proyecto está en este plan, es el punto más flojo de tu infraestructura.
- **Plan Pro de Supabase (USD 25/mes):** incluye **backups diarios automáticos**,
  con 7 días de historial para restaurar. Es el mínimo razonable si vas a cobrar
  por el servicio a otras personas.
- **Plan Team/Enterprise:** backups más frecuentes y point-in-time recovery
  (restaurar a un minuto exacto, no solo al último backup diario).

**Recomendación concreta:** si vas a vender licencias Pro a otros electricistas
de verdad, pasate al plan Pro de Supabase antes de lanzar — vos le vas a estar
cobrando a la gente y necesitás poder responder si algo se corrompe.
Lo activás en: Dashboard de tu proyecto → Settings → Add-ons → Backups.

## La red de seguridad extra que sí te dejo en código
Además de lo que haga Supabase, agregué un botón en el Panel Admin para que
puedas descargarte **una copia completa de todos los datos en un archivo**,
cuando quieras, sin depender de nadie. Sirve como respaldo manual antes de
un cambio grande, o simplemente para dormir tranquilo.

Está en: Panel Admin → "Exportar backup completo" (ver más abajo el detalle
de qué hace).

## Si alguna vez necesitás restaurar
1. Backups automáticos de Supabase: Dashboard → Database → Backups → elegís
   la fecha → "Restore".
2. Backup manual (el JSON que descargás con el botón nuevo): quedaría como
   referencia de lo que había en un momento dado; restaurarlo requeriría
   volver a insertar esos datos a mano o con un script — no es un botón de
   "un clic" como el de Supabase, es más una copia de emergencia para no
   perder la información en caso de catástrofe total.
