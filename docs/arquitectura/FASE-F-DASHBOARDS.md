# FASE F — DASHBOARDS EJECUTIVOS
## Diseño de Indicadores y Vistas de Control

---

## NIVELES DE DASHBOARD

### Nivel 1 — Dashboard Organizacional
Vista global de TODOS los proyectos activos.

### Nivel 2 — Dashboard de Proyecto
Vista completa de un proyecto especifico.

### Nivel 3 — Dashboard de Area/Sistema
Vista de un area o sistema dentro del proyecto.

### Nivel 4 — Dashboard de Contratista
Vista del avance y rendimiento de un contratista especifico.

---

## TABLAS DE SOPORTE PARA DASHBOARDS

### progress_snapshots (NUEVA — para Curva S)
```sql
create table progress_snapshots (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id),
  snapshot_date   date not null,
  -- Avance real acumulado
  equipment_total          int,
  equipment_approved       int,
  equipment_pct            numeric(5,2),
  -- Por tipo de prueba
  tests_precom_total       int,
  tests_precom_approved    int,
  tests_fat_total          int,
  tests_fat_approved       int,
  tests_sat_total          int,
  tests_sat_approved       int,
  tests_loop_total         int,
  tests_loop_approved      int,
  tests_energy_total       int,
  tests_energy_approved    int,
  tests_functional_total   int,
  tests_functional_approved int,
  -- Punch list
  punch_total              int,
  punch_open               int,
  punch_critical_open      int,
  -- Plan vs real
  planned_pct              numeric(5,2),
  -- % planificado para esta fecha segun cronograma
  created_at               timestamptz not null default now(),
  unique (project_id, snapshot_date)
);

create index idx_snapshots_project on progress_snapshots(project_id, snapshot_date);
```

### weekly_summaries (NUEVA — para productividad semanal)
```sql
create table weekly_summaries (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id),
  week_start      date not null,     -- lunes de la semana
  week_end        date not null,     -- domingo de la semana
  -- Actividad de la semana
  tests_executed  int default 0,     -- protocolos ejecutados en la semana
  tests_approved  int default 0,
  tests_rejected  int default 0,
  punch_created   int default 0,
  punch_closed    int default 0,
  evidences_added int default 0,
  -- Por contratista (jsonb array)
  by_contractor   jsonb,
  -- [{contractor_id, name, tests_executed, equipment_approved}]
  -- Por disciplina
  by_discipline   jsonb,
  -- [{discipline, tests_executed, equipment_approved}]
  -- Notas del supervisor
  supervisor_notes text,
  created_at      timestamptz not null default now(),
  unique (project_id, week_start)
);
```

### mv_project_stats (VISTA MATERIALIZADA — reemplaza queries de dashboard)
```sql
create materialized view mv_project_stats as
select
  p.id as project_id,
  p.name as project_name,
  p.status as project_status,
  -- Equipos
  count(e.id)                                                          as equipment_total,
  count(e.id) filter (where e.status = 'aprobado')                    as equipment_aprobado,
  count(e.id) filter (where e.status = 'pendiente')                   as equipment_pendiente,
  count(e.id) filter (where e.status = 'rechazado')                   as equipment_rechazado,
  count(e.id) filter (where e.status = 'operativo')                   as equipment_operativo,
  count(e.id) filter (where e.criticality = 'alta')                   as equipment_criticos,
  -- Pruebas
  count(t.id)                                                          as tests_total,
  count(t.id) filter (where t.status = 'cerrado')                     as tests_cerrados,
  count(t.id) filter (where t.status = 'borrador')                    as tests_borrador,
  count(t.id) filter (where t.status = 'rechazado')                   as tests_rechazados,
  count(t.id) filter (where t.type = 'precomisionamiento')            as tests_precom,
  count(t.id) filter (where t.type = 'precomisionamiento' and t.status = 'cerrado') as tests_precom_ok,
  count(t.id) filter (where t.type = 'fat')                           as tests_fat,
  count(t.id) filter (where t.type = 'fat' and t.status = 'cerrado') as tests_fat_ok,
  count(t.id) filter (where t.type = 'sat')                           as tests_sat,
  count(t.id) filter (where t.type = 'sat' and t.status = 'cerrado') as tests_sat_ok,
  count(t.id) filter (where t.type = 'loop_check')                    as tests_loop,
  count(t.id) filter (where t.type = 'loop_check' and t.status = 'cerrado') as tests_loop_ok,
  count(t.id) filter (where t.type = 'energizacion')                  as tests_energy,
  count(t.id) filter (where t.type = 'energizacion' and t.status = 'cerrado') as tests_energy_ok,
  count(t.id) filter (where t.type = 'funcional')                     as tests_functional,
  count(t.id) filter (where t.type = 'funcional' and t.status = 'cerrado') as tests_functional_ok,
  -- Punch list
  count(pi.id)                                                         as punch_total,
  count(pi.id) filter (where pi.status = 'abierto')                   as punch_abierto,
  count(pi.id) filter (where pi.status = 'cerrado')                   as punch_cerrado,
  count(pi.id) filter (where pi.priority = 'critica' and pi.status != 'cerrado') as punch_critico_abierto,
  -- Documentos
  count(d.id)                                                          as docs_total,
  count(d.id) filter (where d.status = 'approved')                    as docs_aprobados,
  -- Fecha de calculo
  now() as calculated_at
from projects p
left join equipment e  on e.project_id = p.id and e.deleted_at is null
left join tests t      on t.project_id = p.id and t.deleted_at is null
left join punch_items pi on pi.project_id = p.id and pi.deleted_at is null
left join documents d  on d.project_id = p.id and d.deleted_at is null
where p.deleted_at is null
group by p.id, p.name, p.status;

create unique index on mv_project_stats(project_id);

-- Refrescar (llamar desde pg_cron o Edge Function cada 5 minutos)
-- select cron.schedule('refresh-stats', '*/5 * * * *',
--   'refresh materialized view concurrently mv_project_stats');
```

---

## KPIs DEFINIDOS

### KPIs de Avance (calculados desde mv_project_stats)

| KPI                    | Formula                                              | Meta tipica |
|------------------------|------------------------------------------------------|-------------|
| % Avance Equipos       | equipment_aprobado / equipment_total * 100           | 100%        |
| % Avance Precom        | tests_precom_ok / tests_precom * 100                 | 100%        |
| % Avance FAT           | tests_fat_ok / tests_fat * 100                       | 100%        |
| % Avance SAT           | tests_sat_ok / tests_sat * 100                       | 100%        |
| % Avance Loop Check    | tests_loop_ok / tests_loop * 100                     | 100%        |
| % Avance Energizacion  | tests_energy_ok / tests_energy * 100                 | 100%        |
| % Avance Funcional     | tests_functional_ok / tests_functional * 100         | 100%        |
| % Punch Cerrados       | punch_cerrado / punch_total * 100                    | 100%        |
| % Documentacion        | docs_aprobados / docs_total * 100                    | 95%+        |
| Punch Criticos Abiertos| punch_critico_abierto                                | 0           |

### KPIs de Rendimiento (calculados desde weekly_summaries)

| KPI                      | Formula                                            |
|--------------------------|----------------------------------------------------|
| Productividad semanal    | tests_executed / semana                            |
| Tasa de aprobacion       | tests_approved / tests_executed * 100              |
| Tasa de rechazo          | tests_rejected / tests_executed * 100              |
| Velocidad punch closure  | punch_closed / punch_created (ratio)               |
| Tendencia vs plan        | real_pct - planned_pct (positivo = adelantado)     |

---

## CURVA S

La Curva S compara avance planificado vs real a lo largo del tiempo.

### Datos necesarios
- `progress_snapshots.planned_pct` — avance planificado por fecha (del cronograma)
- `progress_snapshots.equipment_pct` — avance real por fecha

### Estructura del grafico
```
100% |                                    .....----
     |                              .....
     |                        .....          <- Curva real
  75%|                   .....
     |             -----                    <- Curva plan
     |        -----
  50%|   -----
     |---
   0%+--+--+--+--+--+--+--+--+--+--+--+--+
     Ene Feb Mar Abr May Jun Jul Ago Sep Oct
```

### Interpretacion
- Real SOBRE plan → adelantado (verde)
- Real BAJO plan → retrasado (rojo)
- La diferencia es el indicador de alerta principal

---

## DISEÑO VISUAL DE TARJETAS KPI

### Tarjeta de Avance por Tipo de Prueba
```
┌─────────────────────────────────────┐
│  PRECOMISIONAMIENTO                 │
│  ████████████░░░░  78%             │
│  234 / 300 protocolos               │
│  ▲ +12 esta semana                  │
└─────────────────────────────────────┘
```

### Semaforo de Estado del Proyecto
```
● VERDE  — Avance >= 95% del plan
● AMARILLO — Avance entre 85% y 95%
● ROJO   — Avance < 85% del plan
● NEGRO  — Sin actividad en 7 dias
```

### Heat Map de Avance por Sistema
```
         Area A    Area B    Area C
Sistema 1 [████]   [████]   [░░░░]
Sistema 2 [████]   [██░░]   [████]
Sistema 3 [░░░░]   [████]   [████]

■ Verde (100%) ▓ Amarillo (75-99%) ░ Rojo (0-74%)
```

---

## ENDPOINT DE API PARA DASHBOARDS

```
GET /api/dashboard/project/{projectId}
  Response: datos de mv_project_stats (cached 5 min)

GET /api/dashboard/project/{projectId}/scurve
  Query: ?from=2025-01-01&to=2025-12-31
  Response: array de progress_snapshots

GET /api/dashboard/project/{projectId}/weekly
  Query: ?weeks=12
  Response: ultimas N semanas de weekly_summaries

GET /api/dashboard/project/{projectId}/by-area
  Response: avance desglosado por area

GET /api/dashboard/project/{projectId}/by-contractor
  Response: avance desglosado por contratista

GET /api/dashboard/project/{projectId}/by-discipline
  Response: avance desglosado por disciplina
```
