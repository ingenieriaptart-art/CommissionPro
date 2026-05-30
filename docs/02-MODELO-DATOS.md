# Modelo de Datos — CommissionPro

## Diagrama Entidad-Relación (resumen)

```
companies ──< users >── roles
                │
                └──< user_permissions

projects ──< areas ──< systems ──< subsystems ──< equipment
   │                                                  │
   │                                                  ├──< equipment_photos
   │                                                  └──< documents
   │
   ├──< project_members (users del proyecto)
   │
   └──< form_templates ──< form_versions ──< form_fields
                │
                └──< tests ──< test_results
                       │         └──< checklist_items
                       │         └──< evidences (fotos/video/pdf)
                       │         └──< signatures
                       │         └──< approvals (flujo multinivel)
                       │
                       └──< punch_items

audit_log   (todas las acciones)
sync_log    (eventos de sincronización)
notifications
documents   (repositorio + versiones)
```

## Entidades principales

### companies
Empresas (cliente, contratistas, integradores).
`id, name, type(cliente|contratista|integrador|epc), nit, contact, created_at`

### users
`id, company_id, full_name, position(cargo), email, phone, signature_url,
status(active|inactive|blocked), role_id, must_change_password, last_login_at`

### roles / permissions / role_permissions / user_permissions
RBAC configurable. Roles base: `admin, supervisor, tecnico, cliente`.
Permisos atómicos (ej. `user.create`, `test.approve`, `report.export`).

### projects
`id, code, name, client_company_id, location, start_date, end_date,
status, description`

### areas / systems / subsystems
Jerarquía. Cada nivel: `id, parent_id, code, name, description, order`.

### equipment (equipos)
`id, subsystem_id, tag, name, manufacturer, model, serial_number,
power, voltage, current, criticality(alta|media|baja),
status(pendiente|en_ejecucion|aprobado|rechazado|bloqueado|
listo_energizacion|listo_arranque|operativo)`

### form_templates / form_versions / form_fields
Formularios dinámicos versionados. `form_fields` describe tipo de campo
(texto, número, fecha, hora, moneda, select, checkbox, radio, firma,
imagen, video, pdf, archivo), validaciones, orden, requerido.

### tests (pruebas / protocolos)
`id, project_id, equipment_id, form_version_id, type(precom|fat|sat|loop|
energizacion|funcional), status(borrador|ejecutado|revisado|aprob_sup|
aprob_qaqc|aprob_cliente|cerrado), assigned_to, executed_by, executed_at`

### test_results / checklist_items
Respuestas. checklist: `result(cumple|no_cumple|no_aplica), observation,
responsible, signature_id`.

### evidences
`id, test_id|equipment_id|punch_id, type(foto|video|pdf|archivo), storage_url,
local_blob_ref, gps_lat, gps_lng, captured_at, captured_by, stage(antes|durante|despues),
annotations(jsonb), observations`

### signatures
`id, user_id, test_id, role_at_sign, image_url, signed_at, ip, device`

### approvals
Flujo multinivel: `id, test_id, level(1..7), status, approver_id, approved_at,
observations`

### punch_items (punch list)
`id, project_id, equipment_id, title, description, priority(critica|alta|media|baja),
status(abierto|en_proceso|corregido|cerrado), responsible_id, due_date, closed_at`

### documents
Repositorio versionado: `id, project_id, scope_ref, name, file_type, storage_url,
version, uploaded_by, uploaded_at`. Tabla `document_versions` para historial.

### audit_log
`id, user_id, entity, entity_id, action, before(jsonb), after(jsonb), ip,
device, created_at`  — poblada por triggers, append-only.

### sync_log
`id, device_id, user_id, direction(push|pull), entity, records, conflicts,
started_at, finished_at, status`

### notifications
`id, user_id, type, title, body, entity_ref, read_at, created_at`

## Convenciones comunes (todas las tablas de dominio)
`id uuid pk`, `created_at`, `updated_at`, `deleted_at` (borrado lógico),
`version int`, `created_by`, `updated_by`.
