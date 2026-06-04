# Sprint 2 — Pipeline TAG → Equipo
**Fecha:** 2026-06-04  
**Basado en:** Auditoría funcional PTAR Zipaquirá (360 instrumentos, 29 equipos de potencia)

---

## Contexto

El motor de extracción de TAGs produce registros en `engineering_extracted_tags` con status `approved` o `merged`. Este sprint cierra el gap: convertir esos TAGs revisados en registros de `equipment` que el sistema de comisionamiento pueda usar para asignar pruebas, protocolos y firmas.

La documentación de PTAR Zipaquirá demuestra que un proyecto real tiene ~400 TAGs con campos ricos (service, io_type, rtu_destination) que el esquema actual de `equipment` no puede almacenar. La migración 0016 resuelve esto antes de importar los primeros equipos.

---

## Auditoría de Esquema — equipment (estado previo a 0016)

| Columna | Tipo | Origen |
|---------|------|--------|
| id | uuid PK | 0003 |
| subsystem_id | uuid NOT NULL FK | 0003 |
| project_id | uuid FK | 0009 |
| tag | text NOT NULL | 0003 |
| name | text NOT NULL | 0003 |
| manufacturer | text | 0003 |
| model | text | 0003 |
| serial_number | text | 0003 |
| power | text | 0003 — texto libre, ej: "150 HP" |
| voltage | text | 0003 |
| current | text | 0003 |
| criticality | criticality enum | 0003 |
| status | equipment_status enum | 0003 |
| metadata | jsonb | 0003 |
| created_at / updated_at / deleted_at | timestamptz | 0003 |
| created_by / updated_by | uuid FK | 0003 |

**Ninguno de los 6 campos nuevos existe** bajo ningún alias. El campo `power` (TEXT) es diferente de `power_kw` (NUMERIC).

---

## Migración 0016 — Campos de Ingeniería en equipment

```sql
-- ============================================================
-- 0016 — Campos de ingeniería en equipment
-- Requeridos para importar documentos de PTAR Zipaquirá:
--   DATOS_INST: 360 instrumentos con service, io_type, rtu, location, pid
--   DATOS_POT:  29 equipos de potencia con power_kw
-- ============================================================

BEGIN;

-- ── Campos de ingeniería de proceso ──────────────────────────

ALTER TABLE equipment
  ADD COLUMN IF NOT EXISTS service         TEXT,          -- "LECTURA DE CAUDAL A LA ENTRADA..."
  ADD COLUMN IF NOT EXISTS io_type         TEXT,          -- AI / AO / DI / DO / COMM / RS485
  ADD COLUMN IF NOT EXISTS rtu_destination TEXT,          -- "RTU-0101 PTR", "PLC-2501"
  ADD COLUMN IF NOT EXISTS location_system TEXT,          -- "PRETRATAMIENTO", "CUARTO DE SOPLADORES"
  ADD COLUMN IF NOT EXISTS pid_reference   TEXT,          -- "INS-PID-01", "ZIPA-DET-INS-02"
  ADD COLUMN IF NOT EXISTS power_kw        NUMERIC(10,3); -- 112.500, 7.457, 5.593

-- ── Unicidad a nivel de proyecto (no solo subsistema) ────────
-- La constraint existente uq_equipment_tag_project es (subsystem_id, tag).
-- El pipeline TAG→Equipo necesita prevenir duplicados project-wide.
-- Condición: un TAG solo puede aparecer una vez por proyecto (vivo).

CREATE UNIQUE INDEX IF NOT EXISTS uq_equipment_project_tag
  ON equipment(project_id, tag)
  WHERE deleted_at IS NULL;

-- ── Índices de soporte para filtros de UI ────────────────────
CREATE INDEX IF NOT EXISTS idx_equipment_io_type
  ON equipment(project_id, io_type)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_equipment_rtu
  ON equipment(project_id, rtu_destination)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_equipment_location
  ON equipment(project_id, location_system)
  WHERE deleted_at IS NULL;

COMMIT;

-- ── ROLLBACK ──────────────────────────────────────────────────
-- BEGIN;
-- ALTER TABLE equipment
--   DROP COLUMN IF EXISTS service,
--   DROP COLUMN IF EXISTS io_type,
--   DROP COLUMN IF EXISTS rtu_destination,
--   DROP COLUMN IF EXISTS location_system,
--   DROP COLUMN IF EXISTS pid_reference,
--   DROP COLUMN IF EXISTS power_kw;
-- DROP INDEX IF EXISTS uq_equipment_project_tag;
-- DROP INDEX IF EXISTS idx_equipment_io_type;
-- DROP INDEX IF EXISTS idx_equipment_rtu;
-- DROP INDEX IF EXISTS idx_equipment_location;
-- COMMIT;
```

---

## Migración 0017 — Jerarquía SIN CLASIFICAR + función RPC

```sql
-- ============================================================
-- 0017 — Jerarquía "SIN CLASIFICAR" por proyecto
-- Provee un subsystem_id de destino para TAGs sin jerarquía asignada.
-- La función es idempotente: llamadas concurrentes son seguras.
-- ============================================================

BEGIN;

-- ── Constraints de unicidad necesarios para ON CONFLICT ─────
-- systems y subsystems no tenían unique por (parent_id, code).
-- Se agregan solo con IF NOT EXISTS para ser idempotentes.

ALTER TABLE systems
  ADD CONSTRAINT uq_systems_area_code
    UNIQUE (area_id, code)
  DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE subsystems
  ADD CONSTRAINT uq_subsystems_system_code
    UNIQUE (system_id, code)
  DEFERRABLE INITIALLY DEFERRED;

-- ── Función: obtener o crear jerarquía SIN CLASIFICAR ────────

CREATE OR REPLACE FUNCTION get_or_create_unclassified_subsystem(
  p_project_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  c_code    CONSTANT text := '__UNCLASSIFIED__';
  c_name    CONSTANT text := 'SIN CLASIFICAR';
  v_area_id    uuid;
  v_system_id  uuid;
  v_subsys_id  uuid;
BEGIN
  -- Área
  INSERT INTO areas (project_id, code, name)
  VALUES (p_project_id, c_code, c_name)
  ON CONFLICT (project_id, code) DO NOTHING;

  SELECT id INTO v_area_id
  FROM areas
  WHERE project_id = p_project_id AND code = c_code;

  -- Sistema
  INSERT INTO systems (area_id, code, name)
  VALUES (v_area_id, c_code, c_name)
  ON CONFLICT (area_id, code) DO NOTHING;

  SELECT id INTO v_system_id
  FROM systems
  WHERE area_id = v_area_id AND code = c_code;

  -- Subsistema
  INSERT INTO subsystems (system_id, code, name)
  VALUES (v_system_id, c_code, c_name)
  ON CONFLICT (system_id, code) DO NOTHING;

  SELECT id INTO v_subsys_id
  FROM subsystems
  WHERE system_id = v_system_id AND code = c_code;

  RETURN v_subsys_id;
END;
$$;

-- ── Pre-seed: crear jerarquía para proyectos existentes ──────
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM projects WHERE deleted_at IS NULL LOOP
    PERFORM get_or_create_unclassified_subsystem(r.id);
  END LOOP;
END;
$$;

COMMIT;

-- ── ROLLBACK ──────────────────────────────────────────────────
-- BEGIN;
-- DROP FUNCTION IF EXISTS get_or_create_unclassified_subsystem(uuid);
-- ALTER TABLE systems    DROP CONSTRAINT IF EXISTS uq_systems_area_code;
-- ALTER TABLE subsystems DROP CONSTRAINT IF EXISTS uq_subsystems_system_code;
-- COMMIT;
```

---

## Pipeline TAG → Equipo — Diseño Actualizado

### Mapeo de campos: engineering_extracted_tags → equipment

| Campo equipment | Fuente | Lógica |
|----------------|--------|--------|
| `tag` | `engineering_extracted_tags.tag` | Directo (normalizado UPPER) |
| `name` | `engineering_extracted_tags.description` | Fallback: tag si description es null |
| `service` | `extracted_data_json.context` | Extraer hasta 200 chars de contexto; null si no hay |
| `io_type` | `detected_type` → mapeo | motor→"DO", sensor/instrumento→"AI", valvula→"DO", panel→"COMM", cable→null |
| `rtu_destination` | `extracted_data_json.context_keywords` | Buscar patrón RTU-\d+ en contexto |
| `location_system` | `extracted_data_json.context_keywords` | null (requiere parser estructurado) |
| `pid_reference` | — | null (requiere parser estructurado) |
| `power_kw` | — | null (requiere parser estructurado) |
| `subsystem_id` | `get_or_create_unclassified_subsystem()` | Siempre SIN CLASIFICAR en Sprint 2 |
| `project_id` | payload | Directo |
| `criticality` | — | `'media'` (default) |
| `status` | — | `'pendiente'` (default) |
| `metadata` | — | `{unclassified: true, from_tag: true, source_document_id: "..."}` |

### Extractores de Instrument Index y Equipment Register

**Diseño para clasificación futura automática (ruta IA):**
```
Documento subido
  → DetectDocumentType() → 'instrument_index' | 'equipment_register' | 'unknown'
  → Parser específico por tipo
  → Bulk upsert a equipment con todos los campos
```

La función `get_or_create_unclassified_subsystem(project_id, target_subsystem_id?)` acepta un `target_subsystem_id` opcional. Cuando el clasificador automático determine el subsistema correcto desde el documento, pasa ese ID y el equipo se crea ya clasificado.

#### Parser: Instrument Index (`1_MEMORIA_CONTROL_EIT-V2.xlsx` tipo DATOS_INST)

Columnas detectadas por nombre (case-insensitive, fuzzy match):

| Header detectado | Campo equipment |
|-----------------|----------------|
| `TAG NO.` / `TAG` | `tag` |
| `SERVICIO` / `SERVICE` | `service` |
| `INSTRUMENTO` / `INSTRUMENT` | `name` |
| `UBICACIÓN` / `SISTEMA` / `LOCATION` | `location_system` |
| `RTU` / `RTU DESTINO` | `rtu_destination` |
| `TIPO` / `TYPE` | `io_type` |
| `RANGO` / `RANGE` | `metadata.range` |
| `UNIDAD` / `UNIT` | `metadata.engineering_units` |
| `METROS` | `metadata.cable_length_m` |
| `CABLEADO` / `CABLE` | `metadata.cable_spec` |
| `INSTALADO` / `INSTALLED` | `metadata.installed` |

Estrategia de detección:
1. Buscar fila donde ≥4 de los headers esperados coinciden
2. Registrar índice de columna por nombre
3. Iterar filas de datos (saltar vacías y filas de título)
4. Para cada fila con TAG válido: upsert a equipment

#### Parser: Equipment Register (`DATOS_POT` style)

| Header detectado | Campo equipment |
|-----------------|----------------|
| `TAG` / `TAG 2` | `tag` |
| `DESCRIPCION` / `APLICACION` | `name` + `service` |
| `RTU` | `rtu_destination` |
| `KW` / `kW` | `power_kw` |
| `HP` | `metadata.power_hp` |
| `VOLTAJE` / `VOLTAGE` | `voltage` |
| `CALIBRE` / `GAUGE` | `metadata.cable_gauge` |
| `CABLE` | `metadata.cable_spec` |

---

## API Route — POST /api/create-equipment-from-tags

**Scope Sprint 2:** Crea equipos desde tags aprobados/merged únicamente.  
**Scope Sprint 3:** Parser Instrument Index (bulk desde Excel, vía POST /api/import-document-equipment).

```typescript
// Request
{ project_id: string; tag_ids: string[] }

// Response
{
  created:  number;          // equipos nuevos creados
  skipped:  number;          // tags sin description o con error
  existing: string[];        // tags que ya tenían equipo (omitidos)
  errors:   { tag: string; reason: string }[];
}
```

**Flujo interno:**
1. Verificar JWT (`auth.getUser`) + membresía al proyecto
2. Cargar tags: `SELECT * FROM engineering_extracted_tags WHERE id IN (...) AND project_id = ?`
3. Filtrar solo status `approved` o `merged`
4. Llamar RPC `get_or_create_unclassified_subsystem(project_id)` → `subsystem_id`
5. Check de existentes: `SELECT tag FROM equipment WHERE project_id = ? AND tag IN (...) AND deleted_at IS NULL`
6. Construir payload con mapeo de campos
7. Bulk INSERT con `on_conflict: 'project_id,tag' + ignoreDuplicates: true`
8. UPDATE tags creados exitosamente: `status = 'merged'` (si no lo estaban)
9. Invalidar cache del cliente vía respuesta

---

## Plan de Implementación Sprint 2

### Fase 1 — Migraciones (0016 + 0017)
- [ ] Crear `database/migrations/0016_equipment_engineering_fields.sql`
- [ ] Crear `database/migrations/0017_default_hierarchy.sql`
- [ ] Ejecutar ambas en Supabase Dashboard SQL Editor
- [ ] Verificar con script de validación

### Fase 2 — Tipos TypeScript
- [ ] Actualizar `Equipment` interface en `types/index.ts` con 6 campos nuevos
- [ ] Agregar tipo `DocumentImportType` para clasificación futura

### Fase 3 — API Route
- [ ] Crear `app/src/app/api/create-equipment-from-tags/route.ts`
- [ ] Auth + membresía (patrón Sprint 1)
- [ ] Lógica de mapeo TAG → Equipment
- [ ] Bulk insert + skip duplicates

### Fase 4 — Hook
- [ ] Agregar `useCreateEquipmentFromTags()` en `useEngineering.ts`
- [ ] Invalidación de queries `["equipment", projectId]` y `["eng-tags-stats", projectId]`

### Fase 5 — UI TagReviewTable
- [ ] Botón "Crear Equipos" en barra de bulk actions
- [ ] Estado de carga + toast de resultado
- [ ] Badge "Pendiente de clasificar" en equipment list

### Fase 6 — Build y Verificación
- [ ] TypeScript check: 0 errores
- [ ] ESLint: 0 errores
- [ ] next build: EXIT 0
- [ ] Test funcional: crear 3 equipos desde tags de prueba

### Sprint 3 (fuera de alcance ahora)
- Parser Instrument Index (DATOS_INST de Excel)
- Parser Equipment Register (DATOS_POT de Excel)
- Clasificación automática de subsistema por location_system
- Pantalla de reclasificación de equipos SIN CLASIFICAR

---

## Criterios de éxito Sprint 2

1. Migración 0016: `equipment` tiene los 6 nuevos campos, constraint `uq_equipment_project_tag` activo
2. Migración 0017: función `get_or_create_unclassified_subsystem()` deployada, jerarquía SIN CLASIFICAR creada para proyectos existentes
3. API route: `/api/create-equipment-from-tags` retorna `{ created: N, skipped: M, existing: [] }`
4. Hook: `useCreateEquipmentFromTags` disponible
5. UI: botón "Crear Equipos" visible y funcional en TagReviewTable
6. Badge "Pendiente de clasificar" visible en equipment list
7. No duplicados: llamar al botón dos veces no crea registros repetidos
