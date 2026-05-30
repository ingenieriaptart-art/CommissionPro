# FASE C — TRAZABILIDAD TOTAL
## Diseño del Sistema de Trazabilidad Legal y Tecnica

---

## OBJETIVO

Responder con certeza juridica y tecnica a las preguntas:
- Quien ejecuto la prueba y con que dispositivo
- Que version del protocolo se uso
- Que evidencias se capturaron y cuando
- Que coordenadas GPS registro
- Que modificaciones se hicieron despues de la firma
- Quien aprobo y en que orden

---

## PROBLEMA CON EL DISEÑO ACTUAL

El `audit_log` actual (trigger generico) registra INSERT/UPDATE/DELETE pero:
- No distingue eventos de negocio significativos (firma, aprobacion, rechazo)
- Guarda JSONB completo incluyendo datos binarios (problema A-004)
- No registra device_id, app_version, gps del dispositivo
- No hay tabla de metadatos enriquecidos para evidencias
- No hay historial de ejecucion de protocolo paso a paso

---

## TABLAS PROPUESTAS

### audit_events (NUEVA — reemplaza uso de audit_log para eventos de negocio)
```sql
create table audit_events (
  id            bigserial primary key,
  -- Contexto del evento
  event_type    text not null,
  -- test.created | test.executed | test.signed | test.approved | test.rejected
  -- test.reopened | punch.created | punch.closed | evidence.captured
  -- user.login | user.logout | user.password_changed | document.uploaded
  entity        text not null,     -- nombre de la tabla afectada
  entity_id     uuid not null,     -- id del registro afectado
  project_id    uuid references projects(id),
  -- Actor
  user_id       uuid references users(id),
  user_name     text,              -- snapshot del nombre (no cambia si user se edita)
  user_role     text,              -- snapshot del rol al momento del evento
  user_company  text,              -- snapshot de empresa
  -- Dispositivo y ubicacion
  device_id     text,              -- UUID unico del dispositivo (generado por la app)
  device_type   text,              -- mobile_android | mobile_ios | tablet | desktop
  app_version   text,              -- version de CommissionPro instalada
  user_agent    text,
  ip_address    inet,
  gps_lat       double precision,  -- ubicacion del dispositivo al momento del evento
  gps_lng       double precision,
  gps_accuracy  numeric,           -- precision en metros
  -- Datos del evento
  description   text,              -- descripcion legible del evento
  metadata      jsonb,             -- datos adicionales especificos del tipo de evento
  -- NO guardar datos binarios aqui (ver evidence_metadata)
  -- Timestamps
  occurred_at   timestamptz not null default now(),
  -- cuando ocurrio el evento (puede ser diferente a inserted_at en offline)
  inserted_at   timestamptz not null default now()
  -- cuando se inserto en la DB (puede ser despues si estaba offline)
);

-- Solo indices de lectura eficiente. Esta tabla es append-only.
create index idx_audit_events_entity    on audit_events(entity, entity_id);
create index idx_audit_events_project   on audit_events(project_id, occurred_at desc);
create index idx_audit_events_user      on audit_events(user_id, occurred_at desc);
create index idx_audit_events_type      on audit_events(event_type, occurred_at desc);
-- Particion por mes para tablas grandes
-- create table audit_events_2025_01 partition of audit_events
--   for values from ('2025-01-01') to ('2025-02-01');
```

### evidence_metadata (NUEVA — metadatos ricos de cada evidencia)
```sql
create table evidence_metadata (
  id              uuid primary key references evidences(id) on delete cascade,
  -- Dispositivo de captura
  device_id       text,
  device_model    text,         -- Samsung Galaxy Tab S9 | iPhone 15 Pro
  device_os       text,         -- Android 14 | iOS 17.2
  app_version     text,
  camera_facing   text,         -- front | back | upload
  -- GPS al momento de captura
  gps_lat         double precision,
  gps_lng         double precision,
  gps_altitude    double precision,
  gps_accuracy    numeric,      -- metros
  gps_provider    text,         -- gps | network | fused
  -- Datos de la imagen/video
  file_size_bytes bigint,
  file_hash_sha256 text,        -- hash para verificar integridad
  width_px        int,
  height_px       int,
  duration_sec    int,          -- para videos
  mime_type       text,
  -- Contexto industrial
  stage           evidence_stage,
  weather         text,         -- descripcion clima opcional en campo
  ambient_temp_c  numeric,      -- temperatura ambiente
  -- Anotaciones sobre la imagen
  annotations     jsonb,        -- array de {x,y,text,color} sobre la imagen
  -- Trazabilidad
  captured_at     timestamptz not null,
  captured_by     uuid references users(id),
  user_name_snap  text,         -- snapshot del nombre del tecnico
  inserted_at     timestamptz not null default now()
);

create index idx_evidence_meta_device on evidence_metadata(device_id);
create index idx_evidence_meta_captured on evidence_metadata(captured_at);
```

### protocol_execution_history (NUEVA — historial paso a paso de un protocolo)
```sql
create table protocol_execution_history (
  id              uuid primary key default gen_random_uuid(),
  test_id         uuid not null references tests(id),
  -- Que ocurrio
  step            text not null,
  -- form_opened | field_filled | section_completed | checklist_item_marked
  -- evidence_attached | signature_captured | submitted | approved | rejected | reopened
  field_key       text,         -- si aplica a un campo especifico
  field_label     text,
  old_value       text,         -- valor anterior (para campos editados)
  new_value       text,         -- valor nuevo
  -- Actor
  user_id         uuid references users(id),
  user_name       text,
  device_id       text,
  -- Ubicacion
  gps_lat         double precision,
  gps_lng         double precision,
  -- Timestamp
  occurred_at     timestamptz not null default now()
);

create index idx_proto_exec_test on protocol_execution_history(test_id, occurred_at);
```

### signature_metadata (NUEVA — metadatos ricos de cada firma)
```sql
create table signature_metadata (
  id              uuid primary key references signatures(id) on delete cascade,
  -- Datos biometricos de la firma (para validacion legal)
  stroke_count    int,          -- numero de trazos
  signing_duration_ms int,      -- tiempo que tomo firmar en ms
  canvas_width    int,
  canvas_height   int,
  -- Dispositivo
  device_id       text,
  device_type     text,
  input_type      text,         -- touch | stylus | mouse
  -- Ubicacion al momento de la firma
  gps_lat         double precision,
  gps_lng         double precision,
  -- Hash de la firma para verificacion de integridad
  signature_hash  text,
  -- IP y contexto de red
  ip_address      inet,
  signed_at       timestamptz not null
);
```

---

## EVENTOS DE NEGOCIO ESTANDARIZADOS

### Catalogo de event_type para audit_events

```
AUTENTICACION:
  user.login_ok          | user.login_fail | user.logout
  user.password_changed  | user.password_reset_requested

PROYECTOS:
  project.created | project.updated | project.status_changed
  project.member_added | project.member_removed

EQUIPOS:
  equipment.created | equipment.updated | equipment.status_changed
  equipment.document_attached

PROTOCOLOS:
  test.created | test.assigned | test.opened | test.field_filled
  test.section_completed | test.evidence_attached
  test.signature_captured | test.submitted | test.reviewed
  test.approved_supervisor | test.approved_qaqc | test.approved_client
  test.rejected | test.reopened | test.closed

PUNCH LIST:
  punch.created | punch.assigned | punch.status_changed
  punch.evidence_attached | punch.closed

DOCUMENTOS:
  document.uploaded | document.version_added | document.approved
  document.downloaded

DOSSIER:
  dossier.generation_started | dossier.section_completed
  dossier.generated | dossier.downloaded

SYNC:
  sync.started | sync.completed | sync.conflict_detected | sync.conflict_resolved
```

---

## RESPUESTA A PREGUNTAS DE TRAZABILIDAD

Con este diseño se puede responder:

| Pregunta                              | Fuente                                      |
|---------------------------------------|---------------------------------------------|
| Quien ejecuto la prueba               | audit_events WHERE event_type=test.submitted|
| Cuando la ejecuto                     | audit_events.occurred_at                    |
| Que version del protocolo uso         | tests.form_version_id + form_versions       |
| Que evidencias cargo                  | evidences JOIN evidence_metadata            |
| Que firma utilizo                     | signatures JOIN signature_metadata          |
| Que dispositivo uso                   | audit_events.device_id + device_model       |
| Que coordenadas registro              | evidence_metadata.gps_* + audit_events.gps_*|
| Que modificaciones se hicieron        | protocol_execution_history WHERE step=field_filled |
| Quien aprobo y en que orden           | approvals JOIN audit_events(test.approved_*)|

---

## CONSIDERACIONES LEGALES

1. Todas las tablas de trazabilidad son APPEND-ONLY. Ningun trigger de borrado.
2. Los snapshots de nombre/rol/empresa en audit_events preservan la identidad historica aunque el usuario se edite despues.
3. El file_hash_sha256 en evidence_metadata permite verificar que una foto no fue alterada.
4. El signature_hash permite detectar si una firma fue manipulada.
5. Los timestamps tienen doble valor: occurred_at (cuando paso) e inserted_at (cuando llego al servidor). Util para demostrar trabajo offline.
