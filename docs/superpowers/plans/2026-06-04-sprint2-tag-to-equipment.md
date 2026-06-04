# Sprint 2 — Pipeline TAG → Equipo: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cuando un TAG es aprobado o fusionado en la bandeja de revisión de ingeniería, el usuario puede crear los equipos correspondientes en el registro de equipos del proyecto con un clic.

**Architecture:** Dos migraciones SQL (0016 enriquece `equipment`, 0017 crea jerarquía "SIN CLASIFICAR" + función idempotente), un API route serverless que mapea tags aprobados → equipment records, un hook cliente, y un botón en la tabla de revisión existente. Los equipos creados se marcan con `metadata.unclassified=true` hasta que se clasifiquen en Sprint 3.

**Tech Stack:** PostgreSQL/Supabase, Next.js 16 App Router (Node.js runtime), TanStack Query v5, TypeScript, Tailwind CSS, Lucide React.

---

## File Map

| Acción | Archivo | Responsabilidad |
|--------|---------|----------------|
| CREATE | `database/migrations/0016_equipment_engineering_fields.sql` | Agrega 6 columnas + índice único project/tag |
| CREATE | `database/migrations/0017_default_hierarchy.sql` | Función `get_or_create_unclassified_subsystem` + constraints |
| CREATE | `app/src/app/api/create-equipment-from-tags/route.ts` | API POST: tags aprobados → INSERT en equipment |
| MODIFY | `app/src/types/index.ts` | Agregar 6 campos a `Equipment` interface |
| MODIFY | `app/src/hooks/useEngineering.ts` | Agregar `useCreateEquipmentFromTags` |
| MODIFY | `app/src/components/engineering/TagReviewTable.tsx` | Botón "Crear Equipos" en barra bulk + imports |
| MODIFY | `app/src/app/(workspace)/projects/[projectId]/equipment/page.tsx` | Badge "Pendiente de clasificar" |

---

## Task 1: Migración 0016 — Campos de ingeniería en equipment

**Files:**
- Create: `database/migrations/0016_equipment_engineering_fields.sql`

- [ ] **Step 1.1: Crear el archivo SQL**

```sql
-- database/migrations/0016_equipment_engineering_fields.sql
-- ============================================================
-- 0016 — Campos de ingeniería en equipment
-- Requeridos para importar PTAR Zipaquirá:
--   DATOS_INST: 360 instrumentos con service, io_type, rtu, location, pid
--   DATOS_POT:  29 equipos de potencia con power_kw
-- ============================================================

BEGIN;

ALTER TABLE equipment
  ADD COLUMN IF NOT EXISTS service         TEXT,
  ADD COLUMN IF NOT EXISTS io_type         TEXT,
  ADD COLUMN IF NOT EXISTS rtu_destination TEXT,
  ADD COLUMN IF NOT EXISTS location_system TEXT,
  ADD COLUMN IF NOT EXISTS pid_reference   TEXT,
  ADD COLUMN IF NOT EXISTS power_kw        NUMERIC(10,3);

-- Unicidad a nivel de proyecto (previene duplicados en el pipeline TAG→Equipo)
CREATE UNIQUE INDEX IF NOT EXISTS uq_equipment_project_tag
  ON equipment(project_id, tag)
  WHERE deleted_at IS NULL;

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

-- ROLLBACK:
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

- [ ] **Step 1.2: Ejecutar en Supabase SQL Editor y verificar**

Pegar el contenido del archivo en Supabase Dashboard → SQL Editor → Run.

Verificar con:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'equipment'
  AND column_name IN ('service','io_type','rtu_destination','location_system','pid_reference','power_kw')
ORDER BY column_name;
```

Resultado esperado: 6 filas, tipos `text` / `numeric`.

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'equipment'
  AND indexname IN ('uq_equipment_project_tag','idx_equipment_io_type');
```

Resultado esperado: 2 índices visibles.

- [ ] **Step 1.3: Commit del archivo SQL**

```bash
git add database/migrations/0016_equipment_engineering_fields.sql
git commit -m "feat: migración 0016 — campos de ingeniería en equipment (service, io_type, rtu, location, pid, power_kw)"
```

---

## Task 2: Migración 0017 — Jerarquía SIN CLASIFICAR

**Files:**
- Create: `database/migrations/0017_default_hierarchy.sql`

- [ ] **Step 2.1: Crear el archivo SQL**

```sql
-- database/migrations/0017_default_hierarchy.sql
-- ============================================================
-- 0017 — Jerarquía "SIN CLASIFICAR" por proyecto
-- Crea una área/sistema/subsistema placeholder para equipos
-- importados desde documentos sin clasificación de jerarquía.
-- La función es idempotente y segura para llamadas concurrentes.
-- ============================================================

BEGIN;

-- Constraints necesarios para ON CONFLICT en sistemas y subsistemas
ALTER TABLE systems
  ADD CONSTRAINT IF NOT EXISTS uq_systems_area_code
    UNIQUE (area_id, code);

ALTER TABLE subsystems
  ADD CONSTRAINT IF NOT EXISTS uq_subsystems_system_code
    UNIQUE (system_id, code);

-- Función: obtener o crear jerarquía SIN CLASIFICAR para un proyecto
CREATE OR REPLACE FUNCTION get_or_create_unclassified_subsystem(
  p_project_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_code       CONSTANT text := '__UNCLASSIFIED__';
  c_name       CONSTANT text := 'SIN CLASIFICAR';
  v_area_id    uuid;
  v_system_id  uuid;
  v_subsys_id  uuid;
BEGIN
  -- 1. Área
  INSERT INTO areas (project_id, code, name, sort_order)
  VALUES (p_project_id, c_code, c_name, 9999)
  ON CONFLICT (project_id, code) DO NOTHING;

  SELECT id INTO v_area_id
  FROM areas
  WHERE project_id = p_project_id AND code = c_code;

  -- 2. Sistema
  INSERT INTO systems (area_id, code, name, sort_order)
  VALUES (v_area_id, c_code, c_name, 9999)
  ON CONFLICT (area_id, code) DO NOTHING;

  SELECT id INTO v_system_id
  FROM systems
  WHERE area_id = v_area_id AND code = c_code;

  -- 3. Subsistema
  INSERT INTO subsystems (system_id, code, name, sort_order)
  VALUES (v_system_id, c_code, c_name, 9999)
  ON CONFLICT (system_id, code) DO NOTHING;

  SELECT id INTO v_subsys_id
  FROM subsystems
  WHERE system_id = v_system_id AND code = c_code;

  RETURN v_subsys_id;
END;
$$;

-- Pre-seed: crear jerarquía para proyectos existentes
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

-- ROLLBACK:
-- BEGIN;
-- DROP FUNCTION IF EXISTS get_or_create_unclassified_subsystem(uuid);
-- ALTER TABLE systems    DROP CONSTRAINT IF EXISTS uq_systems_area_code;
-- ALTER TABLE subsystems DROP CONSTRAINT IF EXISTS uq_subsystems_system_code;
-- COMMIT;
```

- [ ] **Step 2.2: Ejecutar en Supabase SQL Editor y verificar**

Pegar en SQL Editor → Run.

Verificar función creada:
```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'get_or_create_unclassified_subsystem';
```

Verificar que el seed creó jerarquías para proyectos existentes:
```sql
SELECT p.name AS proyecto, a.name AS area, sy.name AS sistema, su.name AS subsistema
FROM projects p
JOIN areas      a  ON a.project_id = p.id  AND a.code  = '__UNCLASSIFIED__'
JOIN systems    sy ON sy.area_id   = a.id  AND sy.code = '__UNCLASSIFIED__'
JOIN subsystems su ON su.system_id = sy.id AND su.code = '__UNCLASSIFIED__'
WHERE p.deleted_at IS NULL;
```

Resultado esperado: una fila por cada proyecto activo.

- [ ] **Step 2.3: Commit**

```bash
git add database/migrations/0017_default_hierarchy.sql
git commit -m "feat: migración 0017 — jerarquía SIN CLASIFICAR + función get_or_create_unclassified_subsystem"
```

---

## Task 3: Actualizar tipos TypeScript

**Files:**
- Modify: `app/src/types/index.ts` (líneas 125–147, interfaz Equipment)

- [ ] **Step 3.1: Agregar campos a la interfaz Equipment**

Localizar la interfaz `Equipment` en `app/src/types/index.ts` y agregar los 6 campos nuevos al final, antes del bloque `// sync`:

```typescript
export interface Equipment {
  id: string;
  // [A-001 FIX] project_id desnormalizado para RLS eficiente sin JOINs
  project_id: string;
  subsystem_id: string;
  tag: string;
  name: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  power?: string;
  voltage?: string;
  current?: string;
  criticality: Criticality;
  status: EquipmentStatus;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  // Sprint 2: campos de ingeniería (0016)
  service?: string;
  io_type?: string;
  rtu_destination?: string;
  location_system?: string;
  pid_reference?: string;
  power_kw?: number;
  // sync
  version?: number;
  sync_status?: SyncStatus;
}
```

- [ ] **Step 3.2: Verificar TypeScript**

```bash
cd app && npx tsc --noEmit 2>&1
```

Resultado esperado: sin output (0 errores).

- [ ] **Step 3.3: Commit**

```bash
git add app/src/types/index.ts
git commit -m "feat: agregar campos de ingeniería a Equipment interface (service, io_type, rtu_destination, location_system, pid_reference, power_kw)"
```

---

## Task 4: API Route — POST /api/create-equipment-from-tags

**Files:**
- Create: `app/src/app/api/create-equipment-from-tags/route.ts`

- [ ] **Step 4.1: Crear el archivo del API route**

```typescript
// app/src/app/api/create-equipment-from-tags/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime    = "nodejs";
export const dynamic    = "force-dynamic";
export const maxDuration = 30;

// Mapeo detected_type (extractor de TAGs) → io_type (estándar ingeniería)
const IO_TYPE_MAP: Record<string, string> = {
  motor:         "DO",
  valvula:       "DO",
  sensor:        "AI",
  instrumento:   "AI",
  panel:         "COMM",
  transformador: "DO",
  cable:         "",
};

// Extrae código RTU/PLC del texto de contexto del tag
function extractRtu(context: string | null): string | null {
  if (!context) return null;
  const m = context.match(/\bRTU-\d+\b|\bPLC-\d+\b/i);
  return m ? m[0].toUpperCase() : null;
}

export async function POST(req: NextRequest) {
  // ── Validar body ────────────────────────────────────────────
  const body = await req.json().catch(() => null);
  if (!body?.project_id || !Array.isArray(body?.tag_ids) || body.tag_ids.length === 0) {
    return NextResponse.json(
      { error: "project_id y tag_ids[] requeridos" },
      { status: 400 }
    );
  }
  const { project_id, tag_ids } = body as { project_id: string; tag_ids: string[] };

  // ── Autenticación (patrón Sprint 1) ─────────────────────────
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const token = req.headers.get("authorization")?.slice(7) ?? null;
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: { user: authUser }, error: authErr } = await serviceClient.auth.getUser(token);
  if (authErr || !authUser) return NextResponse.json({ error: "Token inválido" }, { status: 401 });

  // ── Verificar membresía al proyecto ─────────────────────────
  const { data: appUser } = await serviceClient
    .from("users")
    .select("id, roles(key)")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();

  if (!appUser) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isAdmin = ((appUser as any).roles as Array<{ key: string }> | null)?.[0]?.key === "admin";

  if (!isAdmin) {
    const { count } = await serviceClient
      .from("project_members")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project_id)
      .eq("user_id", appUser.id);
    if ((count ?? 0) === 0) return NextResponse.json({ error: "Sin acceso al proyecto" }, { status: 403 });
  }

  // ── Cargar tags solicitados ──────────────────────────────────
  const { data: tags, error: tagsErr } = await serviceClient
    .from("engineering_extracted_tags")
    .select("id, tag, description, detected_type, extracted_data_json, document_id, status")
    .in("id", tag_ids)
    .eq("project_id", project_id)
    .in("status", ["approved", "merged"]);

  if (tagsErr) return NextResponse.json({ error: tagsErr.message }, { status: 500 });
  if (!tags || tags.length === 0) {
    return NextResponse.json({ created: 0, skipped: 0, existing: [], errors: [] });
  }

  // ── Obtener/crear subsistema SIN CLASIFICAR ──────────────────
  const { data: subsystemId, error: rpcErr } = await serviceClient.rpc(
    "get_or_create_unclassified_subsystem",
    { p_project_id: project_id }
  );
  if (rpcErr || !subsystemId) {
    return NextResponse.json({ error: "No se pudo obtener subsistema destino" }, { status: 500 });
  }

  // ── Check de TAGs que ya tienen equipo ──────────────────────
  const tagCodes = tags.map((t) => t.tag as string);
  const { data: existingRows } = await serviceClient
    .from("equipment")
    .select("tag")
    .eq("project_id", project_id)
    .in("tag", tagCodes)
    .is("deleted_at", null);

  const existingSet = new Set((existingRows ?? []).map((r) => r.tag as string));

  // ── Construir payload ────────────────────────────────────────
  const now     = new Date().toISOString();
  const toInsert: Record<string, unknown>[] = [];
  const skipped: string[] = [];

  for (const t of tags) {
    const tagCode = t.tag as string;
    if (existingSet.has(tagCode)) continue; // será parte de 'existing'

    const detectedType = (t.detected_type as string) ?? "";
    const context      = (t.extracted_data_json as Record<string, unknown> | null)
      ?.context as string | null ?? null;

    const name = (t.description as string | null) || tagCode;
    if (!name) { skipped.push(tagCode); continue; }

    toInsert.push({
      project_id,
      subsystem_id: subsystemId as string,
      tag:          tagCode,
      name,
      io_type:      IO_TYPE_MAP[detectedType] || null,
      rtu_destination: extractRtu(context),
      criticality:  "media",
      status:       "pendiente",
      created_at:   now,
      updated_at:   now,
      metadata: {
        unclassified:       true,
        from_tag:           true,
        source_document_id: t.document_id,
      },
    });
  }

  // ── Bulk INSERT ──────────────────────────────────────────────
  let created = 0;
  const errors: { tag: string; reason: string }[] = [];

  if (toInsert.length > 0) {
    const { error: insertErr } = await serviceClient
      .from("equipment")
      .insert(toInsert);

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }
    created = toInsert.length;
  }

  // ── Marcar tags recién convertidos como 'merged' ─────────────
  const newTagCodes = toInsert.map((r) => r.tag as string);
  const toMergeIds = tags
    .filter((t) => newTagCodes.includes(t.tag as string) && t.status === "approved")
    .map((t) => t.id as string);

  if (toMergeIds.length > 0) {
    await serviceClient
      .from("engineering_extracted_tags")
      .update({ status: "merged", updated_at: now })
      .in("id", toMergeIds)
      .eq("project_id", project_id);
  }

  return NextResponse.json({
    created,
    skipped:  skipped.length,
    existing: Array.from(existingSet),
    errors,
  });
}
```

- [ ] **Step 4.2: Verificar TypeScript y ESLint**

```bash
cd app && npx tsc --noEmit 2>&1
```
Resultado esperado: sin output.

```bash
cd app && npx eslint src/app/api/create-equipment-from-tags/route.ts 2>&1
```
Resultado esperado: sin errores (solo warnings opcionales de unused-vars si los hay).

- [ ] **Step 4.3: Commit**

```bash
git add app/src/app/api/create-equipment-from-tags/route.ts
git commit -m "feat: API route POST /api/create-equipment-from-tags — pipeline TAG→Equipo"
```

---

## Task 5: Hook useCreateEquipmentFromTags

**Files:**
- Modify: `app/src/hooks/useEngineering.ts` (agregar al final del archivo)

- [ ] **Step 5.1: Agregar el hook al final de useEngineering.ts**

Agregar después de la función `useBulkReviewTags` existente:

```typescript
// ── Pipeline TAG → Equipo ─────────────────────────────────────

export interface CreateEquipmentFromTagsResult {
  created:  number;
  skipped:  number;
  existing: string[];
  errors:   { tag: string; reason: string }[];
}

export function useCreateEquipmentFromTags() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      tagIds,
    }: {
      projectId: string;
      tagIds:    string[];
    }): Promise<CreateEquipmentFromTagsResult> => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sin sesión activa");

      const res = await fetch("/api/create-equipment-from-tags", {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ project_id: projectId, tag_ids: tagIds }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error desconocido" }));
        throw new Error((err as { error?: string }).error ?? "Error al crear equipos");
      }

      return res.json() as Promise<CreateEquipmentFromTagsResult>;
    },
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["equipment", projectId] });
      qc.invalidateQueries({ queryKey: ["eng-tags", projectId] });
      qc.invalidateQueries({ queryKey: ["eng-tags-stats", projectId] });
    },
  });
}
```

- [ ] **Step 5.2: Verificar TypeScript**

```bash
cd app && npx tsc --noEmit 2>&1
```
Resultado esperado: sin output.

- [ ] **Step 5.3: Commit**

```bash
git add app/src/hooks/useEngineering.ts
git commit -m "feat: hook useCreateEquipmentFromTags — consume POST /api/create-equipment-from-tags"
```

---

## Task 6: Botón "Crear Equipos" en TagReviewTable

**Files:**
- Modify: `app/src/components/engineering/TagReviewTable.tsx`

- [ ] **Step 6.1: Actualizar imports al inicio del archivo**

Reemplazar la línea de imports de lucide-react y añadir el hook nuevo:

```typescript
// Línea 3 — agregar useCreateEquipmentFromTags
import { useApproveTag, useRejectTag, useMergeTag, useResetTag, useBulkReviewTags, useCreateEquipmentFromTags } from "@/hooks/useEngineering";
```

```typescript
// Línea 10 — agregar PackagePlus a los imports de lucide-react
import {
  CheckCircle, XCircle, GitMerge, ChevronDown, ChevronRight,
  CheckSquare, Square, AlertTriangle, PackagePlus,
} from "lucide-react";
```

- [ ] **Step 6.2: Agregar estado de resultado en TagReviewTable**

Dentro de `export function TagReviewTable`, después de la línea `const bulkReview = useBulkReviewTags();`:

```typescript
const createEquipment = useCreateEquipmentFromTags();
const [createResult, setCreateResult] = useState<string | null>(null);
```

- [ ] **Step 6.3: Agregar función handleCreateEquipment**

Después de la función `bulkAction` existente:

```typescript
const handleCreateEquipment = () => {
  const eligibleIds = Array.from(selected).filter((id) => {
    const t = tags.find((x) => x.id === id);
    return t && (t.status === "approved" || t.status === "merged");
  });

  if (eligibleIds.length === 0) return;

  createEquipment.mutate(
    { projectId, tagIds: eligibleIds },
    {
      onSuccess: (result) => {
        setSelected(new Set());
        setCreateResult(
          result.created > 0
            ? `✓ ${result.created} equipo(s) creado(s)${result.existing.length > 0 ? `, ${result.existing.length} ya existían` : ""}`
            : result.existing.length > 0
            ? `Todos los equipos ya existen (${result.existing.length})`
            : "Sin equipos nuevos"
        );
        setTimeout(() => setCreateResult(null), 4000);
      },
    }
  );
};
```

- [ ] **Step 6.4: Agregar botón en la barra de acciones bulk**

En el bloque `{selected.size > 0 && (...)`, dentro del `<div>` de acciones masivas, agregar el botón después del botón "Rechazar seleccionados" y antes del botón "Cancelar":

```tsx
{/* Contar cuántos seleccionados son elegibles para crear equipo */}
{(() => {
  const eligibleCount = Array.from(selected).filter((id) => {
    const t = tags.find((x) => x.id === id);
    return t && (t.status === "approved" || t.status === "merged");
  }).length;
  return eligibleCount > 0 ? (
    <Button
      size="sm"
      variant="success"
      icon={<PackagePlus size={14} />}
      loading={createEquipment.isPending}
      onClick={handleCreateEquipment}
    >
      Crear {eligibleCount} equipo(s)
    </Button>
  ) : null;
})()}
```

- [ ] **Step 6.5: Mostrar mensaje de resultado debajo de la barra de acciones**

Inmediatamente después del cierre del bloque `{selected.size > 0 && (...)}`, agregar:

```tsx
{createResult && (
  <div className="px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-700 dark:text-emerald-300">
    {createResult}
  </div>
)}
```

- [ ] **Step 6.6: Verificar TypeScript**

```bash
cd app && npx tsc --noEmit 2>&1
```
Resultado esperado: sin output.

- [ ] **Step 6.7: Commit**

```bash
git add app/src/components/engineering/TagReviewTable.tsx
git commit -m "feat: botón 'Crear Equipos' en TagReviewTable — convierte tags aprobados/fusionados en equipment"
```

---

## Task 7: Badge "Pendiente de clasificar" en pantalla de equipos

**Files:**
- Modify: `app/src/app/(workspace)/projects/[projectId]/equipment/page.tsx`

- [ ] **Step 7.1: Agregar badge en la tarjeta de equipo**

Dentro del componente `EquipmentPage`, en el mapa de `filtered.map((eq) => ...)`, después del badge de criticidad existente, agregar el badge condicional:

```tsx
{/* Badge "Pendiente de clasificar" — aparece cuando el equipo viene de un TAG sin clasificar */}
{eq.metadata?.unclassified === true && (
  <Badge variant="warning">
    Sin clasificar
  </Badge>
)}
```

El bloque completo de badges queda:

```tsx
<div className="flex items-center gap-2 mt-3 flex-wrap">
  <Badge variant={criticalityColor[eq.criticality]}>
    Crit. {eq.criticality}
  </Badge>
  {eq.metadata?.unclassified === true && (
    <Badge variant="warning">
      Sin clasificar
    </Badge>
  )}
  {eq.manufacturer && (
    <span className="text-xs text-slate-500">{eq.manufacturer}</span>
  )}
</div>
```

- [ ] **Step 7.2: Verificar que Badge acepta variant="warning"**

Revisar `app/src/components/ui/Badge.tsx`. Si no tiene variant `warning`, agregar:

```typescript
// En Badge.tsx, añadir a variants si falta:
warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
```

- [ ] **Step 7.3: Agregar io_type y service como info secundaria (opcional)**

Después del bloque de `(eq.voltage || eq.power)` existente, agregar:

```tsx
{(eq.service || eq.io_type || eq.rtu_destination) && (
  <p className="text-xs text-slate-400 mt-1 truncate">
    {[eq.io_type, eq.rtu_destination, eq.service].filter(Boolean).join(" · ")}
  </p>
)}
```

- [ ] **Step 7.4: Verificar TypeScript**

```bash
cd app && npx tsc --noEmit 2>&1
```
Resultado esperado: sin output.

- [ ] **Step 7.5: Commit**

```bash
git add app/src/app/\(workspace\)/projects/\[projectId\]/equipment/page.tsx
git add app/src/components/ui/Badge.tsx
git commit -m "feat: badge 'Sin clasificar' en pantalla de equipos para equipos importados desde TAGs"
```

---

## Task 8: Build final y verificación funcional

**Files:** Ninguno (verificación)

- [ ] **Step 8.1: TypeScript check completo**

```bash
cd app && npx tsc --noEmit 2>&1
```
Resultado esperado: sin output.

- [ ] **Step 8.2: ESLint check**

```bash
cd app && npx eslint src/ --ext .ts,.tsx 2>&1 | grep -E "^\s+[0-9]+:[0-9]+\s+error"
```
Resultado esperado: sin output (0 errores).

- [ ] **Step 8.3: Build de producción**

```bash
cd app && npx next build --webpack 2>&1 | tail -15
```
Resultado esperado: `EXIT:0`, todas las rutas listadas incluyendo `/api/create-equipment-from-tags`.

- [ ] **Step 8.4: Test funcional rápido via Node**

```bash
cd app && node --env-file=.env.local -e "
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function run() {
  // Verificar función RPC
  const { data, error } = await sb.rpc('get_or_create_unclassified_subsystem', {
    p_project_id: '9023a92f-5294-4a20-ac20-1c579662340a'
  });
  console.log('Subsistema SIN CLASIFICAR (Zipaquirá):', data, 'error:', error?.message ?? 'none');

  // Verificar columnas nuevas
  const { data: eq, error: eqErr } = await sb.from('equipment').select('service, io_type, rtu_destination, location_system, pid_reference, power_kw').limit(1);
  console.log('Columnas nuevas accesibles:', eqErr ? 'ERROR: ' + eqErr.message : 'OK');
}
run().catch(console.error);
"
```

Resultado esperado:
```
Subsistema SIN CLASIFICAR (Zipaquirá): <uuid> error: none
Columnas nuevas accesibles: OK
```

- [ ] **Step 8.5: Commit final si hay cambios menores**

```bash
git add -A
git status
```

Si quedan archivos sin commit, hacer un commit final:
```bash
git commit -m "build: verificación final Sprint 2 — pipeline TAG→Equipo completo"
```

---

## Resumen de criterios de éxito

| Criterio | Verificación |
|----------|-------------|
| 0016 ejecutada | 6 columnas en `equipment`, índice `uq_equipment_project_tag` activo |
| 0017 ejecutada | función `get_or_create_unclassified_subsystem` existe, proyectos actuales tienen jerarquía SIN CLASIFICAR |
| API route funciona | `POST /api/create-equipment-from-tags` retorna `{ created: N, skipped, existing }` |
| No duplicados | Llamar dos veces crea 0 en la segunda llamada (existing: [...]) |
| Hook disponible | `useCreateEquipmentFromTags` importable desde `@/hooks/useEngineering` |
| Botón visible | Aparece en TagReviewTable al seleccionar tags approved/merged |
| Badge visible | Equipment con `metadata.unclassified=true` muestra badge naranja "Sin clasificar" |
| Build limpio | `tsc --noEmit` + ESLint + `next build` sin errores |
