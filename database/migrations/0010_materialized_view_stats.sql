-- ============================================================
-- 0010 — [A-003 FIX] Vista materializada de estadísticas
-- Elimina el problema de descargar 50k filas al cliente
-- ============================================================

create materialized view if not exists mv_project_stats as
select
  p.id                                                                    as project_id,
  p.name                                                                  as project_name,
  p.status                                                                as project_status,
  -- Equipos
  count(distinct e.id)                                                    as equipment_total,
  count(distinct e.id) filter (where e.status = 'aprobado')              as equipment_aprobado,
  count(distinct e.id) filter (where e.status = 'pendiente')             as equipment_pendiente,
  count(distinct e.id) filter (where e.status = 'rechazado')             as equipment_rechazado,
  count(distinct e.id) filter (where e.status = 'en_ejecucion')          as equipment_en_ejecucion,
  count(distinct e.id) filter (where e.status = 'operativo')             as equipment_operativo,
  count(distinct e.id) filter (where e.criticality = 'alta')             as equipment_criticos,
  -- Tests por tipo (totales y aprobados)
  count(distinct t.id)                                                    as tests_total,
  count(distinct t.id) filter (where t.status = 'cerrado')               as tests_cerrados,
  count(distinct t.id) filter (where t.status = 'rechazado')             as tests_rechazados,
  count(distinct t.id) filter (where t.type = 'precomisionamiento')       as tests_precom_total,
  count(distinct t.id) filter (where t.type = 'precomisionamiento' and t.status = 'cerrado') as tests_precom_ok,
  count(distinct t.id) filter (where t.type = 'fat')                     as tests_fat_total,
  count(distinct t.id) filter (where t.type = 'fat' and t.status = 'cerrado')  as tests_fat_ok,
  count(distinct t.id) filter (where t.type = 'sat')                     as tests_sat_total,
  count(distinct t.id) filter (where t.type = 'sat' and t.status = 'cerrado')  as tests_sat_ok,
  count(distinct t.id) filter (where t.type = 'loop_check')              as tests_loop_total,
  count(distinct t.id) filter (where t.type = 'loop_check' and t.status = 'cerrado') as tests_loop_ok,
  count(distinct t.id) filter (where t.type = 'energizacion')            as tests_energy_total,
  count(distinct t.id) filter (where t.type = 'energizacion' and t.status = 'cerrado') as tests_energy_ok,
  count(distinct t.id) filter (where t.type = 'funcional')               as tests_functional_total,
  count(distinct t.id) filter (where t.type = 'funcional' and t.status = 'cerrado') as tests_functional_ok,
  -- Punch list
  count(distinct pi.id)                                                   as punch_total,
  count(distinct pi.id) filter (where pi.status = 'abierto')             as punch_abierto,
  count(distinct pi.id) filter (where pi.status = 'cerrado')             as punch_cerrado,
  count(distinct pi.id) filter (where pi.priority = 'critica' and pi.status != 'cerrado') as punch_critico_abierto,
  -- Timestamp de cálculo
  now()                                                                   as calculated_at
from projects p
left join equipment  e  on e.project_id  = p.id and e.deleted_at  is null
left join tests      t  on t.project_id  = p.id and t.deleted_at  is null
left join punch_items pi on pi.project_id = p.id and pi.deleted_at is null
where p.deleted_at is null
group by p.id, p.name, p.status;

-- Índice único para refresh concurrente
create unique index if not exists idx_mv_project_stats_pk
  on mv_project_stats(project_id);

-- Función para refrescar la vista (llamar desde pg_cron o Edge Function)
create or replace function refresh_project_stats()
returns void as $$
begin
  refresh materialized view concurrently mv_project_stats;
end;
$$ language plpgsql;

-- ROLLBACK:
-- drop materialized view if exists mv_project_stats;
-- drop function if exists refresh_project_stats();
