# FASE G — ESCALABILIDAD ENTERPRISE
## Diseño para 100+ Proyectos, 50.000+ Equipos, 1.000.000+ Evidencias

---

## PROYECCIONES DE VOLUMEN

| Entidad            | MVP (1 proyecto) | Mid (10 proyectos) | Enterprise (100 proyectos) |
|--------------------|------------------|--------------------|---------------------------|
| Proyectos          | 1                | 10                 | 100+                      |
| Equipos            | 500              | 5.000              | 50.000+                   |
| Tests/Protocolos   | 2.000            | 20.000             | 200.000+                  |
| Checklist items    | 100.000          | 1.000.000          | 10.000.000+               |
| Evidencias         | 10.000           | 100.000            | 1.000.000+                |
| Audit log filas    | 500.000          | 5.000.000          | 50.000.000+               |
| Usuarios           | 20               | 200                | 2.000+                    |
| Almacenamiento     | 50 GB            | 500 GB             | 5+ TB                     |

---

## INDICES CRITICOS ADICIONALES

```sql
-- ============================================================
-- INDICES COMPUESTOS PARA CONSULTAS DE DASHBOARD
-- ============================================================

-- Para filtros combinados de tests (proyecto + tipo + status)
create index idx_tests_project_type_status
  on tests(project_id, type, status)
  where deleted_at is null;

-- Para busqueda de tests por equipo + tipo
create index idx_tests_equipment_type
  on tests(equipment_id, type)
  where deleted_at is null;

-- Para evidencias por proyecto (dashboard)
create index idx_evidences_project
  on evidences(project_id, captured_at desc)
  where deleted_at is null;

-- Para punch list con filtros combinados
create index idx_punch_project_priority_status
  on punch_items(project_id, priority, status)
  where deleted_at is null;

-- Para equipos por area (jerarquia completa sin JOIN)
create index idx_equipment_project_status_criticality
  on equipment(project_id, status, criticality)
  where deleted_at is null;

-- Para audit_log (tabla que crece mas rapido)
create index idx_audit_entity_time
  on audit_log(entity, entity_id, created_at desc);

-- Para notificaciones no leidas
create index idx_notifications_pending
  on notifications(user_id, created_at desc)
  where read_at is null;

-- Para sync queue (procesamiento de cola)
create index idx_sync_queue_entity_attempts
  on syncQueue(entity, attempts, createdAt)
  where attempts < 5;
```

---

## PARTICIONAMIENTO DE TABLAS

### audit_log — Particion por mes
```sql
-- Convertir audit_log a tabla particionada
-- (requiere recrear la tabla con PARTITION BY)

create table audit_log (
  id          bigserial,
  user_id     uuid,
  entity      text not null,
  entity_id   uuid,
  action      text not null,
  before      jsonb,
  after       jsonb,
  ip          inet,
  device      text,
  created_at  timestamptz not null default now()
) partition by range (created_at);

-- Crear particiones mensuales
create table audit_log_2025_01 partition of audit_log
  for values from ('2025-01-01') to ('2025-02-01');
create table audit_log_2025_02 partition of audit_log
  for values from ('2025-02-01') to ('2025-03-01');
-- ... crear particiones futuras con pg_cron automaticamente

-- Retener solo ultimos 2 anos en hot storage, archivar anteriores
```

### evidences — Particion por proyecto
```sql
-- Para proyectos con 1M+ evidencias, particionar por project_id hash
create table evidences (
  -- ...columnas...
) partition by hash (project_id);

create table evidences_p0 partition of evidences for values with (modulus 4, remainder 0);
create table evidences_p1 partition of evidences for values with (modulus 4, remainder 1);
create table evidences_p2 partition of evidences for values with (modulus 4, remainder 2);
create table evidences_p3 partition of evidences for values with (modulus 4, remainder 3);
```

---

## ESTRATEGIA DE ALMACENAMIENTO SUPABASE STORAGE

### Estructura de buckets
```
Bucket: evidences (publico con autenticacion)
  /projects/{project_id}/
    /equipment/{equipment_id}/
      /tests/{test_id}/
        {evidence_id}.jpg
        {evidence_id}_thumb.jpg       <- Thumbnail generado automaticamente
    /punch/{punch_id}/
      {evidence_id}.jpg

Bucket: documents (privado)
  /projects/{project_id}/
    /pid/
    /planos/
    /certificados/
    /manuales/
    /datasheets/

Bucket: dossiers (privado)
  /projects/{project_id}/
    /dossiers/{dossier_id}/
      dossier_completo.pdf
      dossier_completo.zip

Bucket: signatures (privado)
  /signatures/{test_id}/
    {signature_id}.png
```

### Optimizacion de imagenes
```
Al subir una evidencia fotografica:
1. Guardar original: evidences/{evidence_id}.jpg
2. Generar thumbnail 400x300: evidences/{evidence_id}_thumb.jpg
   (via Supabase Edge Function con sharp)
3. Generar version comprimida 1920px: evidences/{evidence_id}_web.jpg

En la UI:
- Lista de evidencias: mostrar thumbnail (rapido)
- Vista detalle: mostrar version web
- Dossier PDF: usar version web
- Descarga: ofrecer original
```

---

## OPTIMIZACIONES OFFLINE (Dexie/IndexedDB)

### Estrategia de descarga selectiva
```typescript
// NO descargar todo al iniciar sesion
// Descargar solo lo que el usuario necesita para trabajar hoy

interface SyncScope {
  projectId: string;
  // Solo sincronizar entidades asignadas al usuario
  myEquipmentOnly: boolean;
  // Solo sincronizar datos de los ultimos N dias
  daysBack: number;
  // Descargar evidencias como blobs o solo URLs
  downloadBlobs: boolean;
}

// Configuracion recomendada para dispositivos de campo:
const fieldDeviceScope: SyncScope = {
  myEquipmentOnly: true,
  daysBack: 7,
  downloadBlobs: false  // Solo URLs, no blobs (ahorrar espacio)
};
```

### Control de cuota IndexedDB
```typescript
// Verificar cuota disponible antes de guardar
async function checkStorageQuota(): Promise<{
  available: boolean;
  usedMB: number;
  totalMB: number;
  warningLevel: boolean;
}> {
  if (!navigator.storage?.estimate) {
    return { available: true, usedMB: 0, totalMB: 0, warningLevel: false };
  }
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  const usedMB = usage / 1024 / 1024;
  const totalMB = quota / 1024 / 1024;
  const pctUsed = usage / quota;
  return {
    available: pctUsed < 0.85,
    usedMB: Math.round(usedMB),
    totalMB: Math.round(totalMB),
    warningLevel: pctUsed > 0.75
  };
}
```

---

## ESTRATEGIA DE CONEXION SUPABASE (Connection Pooling)

### Problema: Supabase Free tier limita a 60 conexiones

Para manejar 2.000+ usuarios concurrentes:

```
ARQUITECTURA DE CONEXIONES:

Usuarios (2000+)
    |
    v
Next.js (Vercel Edge — sin estado)
    |
    v
Supabase REST API (PostgREST)
    |
    v
PgBouncer (connection pooler de Supabase)
    |  Modo: Transaction pooling (para APIs stateless)
    |  Pool size: 25-50 conexiones reales a Postgres
    v
PostgreSQL (Supabase)
```

**Configuracion recomendada:**
- Usar `?pgbouncer=true` en connection strings de Edge Functions
- Usar Transaction mode (no Session mode) para APIs REST
- Session mode solo para funciones que usan `SET LOCAL` (como fn_audit)

---

## CACHING EN CDN (Vercel Edge)

```typescript
// Respuestas del dashboard cacheadas en el CDN
export async function GET(request: Request) {
  const stats = await getProjectStats(projectId);
  return Response.json(stats, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      // Cache en CDN por 5 minutos, servir stale mientras refresca
    }
  });
}

// Invalidar cache al completar una prueba
await fetch('/api/revalidate?tag=project-stats-' + projectId, {
  method: 'POST',
  headers: { 'x-revalidate-token': process.env.REVALIDATE_TOKEN }
});
```

---

## PLAN DE BACKUP Y RECUPERACION

### Backups de base de datos
```
Supabase Pro/Enterprise:
- Point-in-Time Recovery (PITR): hasta 7 dias
- Snapshots diarios automaticos: retener 30 dias
- Snapshots semanales: retener 1 ano

Self-hosted:
- pg_dump diario completo a S3
- WAL archiving continuo (PITR hasta minutos)
- Prueba de restauracion mensual obligatoria
```

### Backups de Storage
```
- Supabase Storage se replica en S3 internamente
- Configurar replicacion a segundo bucket (diferente region):
  bucket: evidences → replica: evidences-backup-us

- Para archivos criticos (dossiers firmados):
  Guardar copia adicional en almacenamiento inmutable (S3 Object Lock)
  con retencion de 10 anos (requisito contractual EPC)
```

---

## ROADMAP DE ESCALABILIDAD

### Fase MVP (1-3 proyectos)
- Supabase Free/Pro plan
- Sin particionamiento
- Vista materializada simple
- Sin CDN cache

### Fase Growth (10-30 proyectos)
- Supabase Pro
- Indices compuestos adicionales
- Vista materializada con refresh automatico (pg_cron)
- CDN cache para dashboards
- Monitoring con Sentry

### Fase Enterprise (100+ proyectos)
- Supabase Enterprise o self-hosted
- Particionamiento de audit_log y evidences
- Read replicas para dashboards y reportes
- CDN cache agresivo
- Alertas de performance (PagerDuty)
- SLA 99.9% uptime

---

## ESTIMACION DE COSTOS (Referencia)

| Escenario       | Supabase      | Storage | Total/mes |
|-----------------|---------------|---------|-----------|
| MVP             | Free ($0)     | Free    | $0        |
| 5 proyectos     | Pro ($25)     | ~$5     | ~$30      |
| 20 proyectos    | Pro ($25)     | ~$50    | ~$75      |
| 50+ proyectos   | Team ($599)   | ~$200   | ~$800     |
| Enterprise      | Custom        | Custom  | $2.000+   |
