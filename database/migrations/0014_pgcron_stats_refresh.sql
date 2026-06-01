-- ============================================================
-- 0014 — Refresco automático de mv_project_stats con pg_cron
--
-- PREREQUISITO:
--   Habilitar la extensión pg_cron en Supabase ANTES de ejecutar.
--   Ruta: Dashboard → Database → Extensions → pg_cron → Enable
--
-- EJECUTAR en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. Verificar que pg_cron está activa ─────────────────────
-- (Debe retornar una fila con extname = 'pg_cron')
SELECT extname, extversion
  FROM pg_extension
  WHERE extname = 'pg_cron';

-- ── 2. Crear el job de refresco ───────────────────────────────
-- Nombre único: 'refresh-project-stats'
-- Frecuencia:   cada 5 minutos (*/5 * * * *)
-- Comando:      llama la función creada en 0010
SELECT cron.schedule(
  'refresh-project-stats',         -- nombre del job
  '*/5 * * * *',                   -- cada 5 minutos
  'SELECT refresh_project_stats()' -- función de 0010
);

-- ── 3. Verificar que el job fue registrado ────────────────────
SELECT jobid, jobname, schedule, command, active
  FROM cron.job
  WHERE jobname = 'refresh-project-stats';

-- ── 4. Verificar historial de ejecuciones (tras 5 minutos) ───
-- Ejecutar esta query 5+ minutos después para confirmar
SELECT jobid, runid, job_pid, status, start_time, end_time, return_message
  FROM cron.job_run_details
  WHERE job_pid IN (
    SELECT jobid FROM cron.job WHERE jobname = 'refresh-project-stats'
  )
  ORDER BY start_time DESC
  LIMIT 10;

-- ── ROLLBACK (si es necesario eliminar el job) ────────────────
-- SELECT cron.unschedule('refresh-project-stats');
