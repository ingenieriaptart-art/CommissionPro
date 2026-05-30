# Base de Datos — CommissionPro

Esquema PostgreSQL 16 / Supabase para la plataforma de comisionamiento industrial.

## Tablas principales (23 tablas + vistas + triggers)

| Tabla | Descripción |
|---|---|
| companies | Empresas (cliente, contratista, EPC, integrador) |
| roles / permissions | RBAC configurable |
| users | Usuarios con rol, empresa, firma, estado |
| projects | Proyectos con estado y fechas |
| areas / systems / subsystems | Jerarquía del proyecto |
| equipment | Equipos con TAG, estado y metadatos técnicos |
| form_templates / form_versions / form_fields | Formularios dinámicos versionados |
| tests | Protocolos de prueba (precom, FAT, SAT, loop, energización, funcional) |
| checklist_items | Ítems cumple/no cumple/no aplica |
| evidences | Fotos/videos/archivos con GPS y anotaciones |
| signatures | Firmas electrónicas asociadas a pruebas |
| approvals | Flujo de aprobación multinivel (7 niveles) |
| punch_items | Punch list con prioridad y estado |
| documents / document_versions | Repositorio documental con versiones |
| notifications | Sistema de alertas por usuario |
| audit_log | Auditoría legal append-only (triggers automáticos) |
| access_log | Registro de accesos y eventos de autenticación |
| sync_log | Historial de sincronizaciones offline→cloud |

## Orden de migraciones

1. `0001_extensions_enums.sql` — extensiones PostgreSQL + tipos enum
2. `0002_rbac.sql` — empresas, usuarios, roles, permisos
3. `0003_project_hierarchy.sql` — proyecto→área→sistema→subsistema→equipo
4. `0004_forms_tests.sql` — formularios dinámicos, pruebas, checklists, evidencias
5. `0005_punch_docs_notifications.sql` — punch list, repositorio documental, notificaciones
6. `0006_audit_sync_triggers.sql` — auditoría, sync_log, triggers automáticos
7. `0007_rls.sql` — Row Level Security (acceso por membresía + rol)
+ `seeds/0001_roles_permissions.sql` — roles y permisos base

## Cómo aplicar

### Opción A — Supabase (recomendado para producción)
1. Crear proyecto en https://supabase.com
2. SQL Editor → pegar y ejecutar `schema_completo.sql` (ya viene en orden correcto).

### Opción B — PostgreSQL local con Docker
```bash
docker run --name commissionpro-db \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 -d postgres:16

psql postgresql://postgres:postgres@localhost:5432/postgres \
  -f database/schema_completo.sql
```

### Opción C — Supabase CLI
```bash
supabase init
supabase db push
```

## Características de seguridad
- **RLS** activo en todas las tablas de dominio.
- **Auditoría** automática vía triggers → `audit_log` (append-only).
- **Borrado lógico** con `deleted_at` — nunca se elimina información.
- **Sincronización offline**: columnas `version`, `sync_status`, `origin_device_id`.
- **RBAC** configurable sin programar desde la UI de administración.
