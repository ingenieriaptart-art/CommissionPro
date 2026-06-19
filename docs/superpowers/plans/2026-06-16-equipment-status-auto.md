# Estado Automático de Equipos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Actualizar automáticamente el estado y porcentaje de precomisionamiento de cada equipo cuando el técnico avanza secciones del formulario o lo envía, y mostrarlo como indicador dual (barra de ejecución + check de aprobación) en tarjetas y panel flotante.

**Architecture:** Se agrega una función utilitaria `syncEquipmentStatus` que escribe en `equipment.status` y `equipment.metadata.form_pct` vía Supabase. Se llama desde `useSubmitInspection` (al enviar form) e `InspectionPage` (al navegar entre secciones). El componente `EquipmentProgressBadge` lee esos campos y renderiza el indicador visual. Sin cambios de esquema en BD.

**Tech Stack:** Next.js 15 App Router, React 19, Supabase JS v2, TypeScript, inline styles (consistente con PlantEquipmentView)

---

## Mapa de archivos

| Acción | Archivo |
|---|---|
| **Crear** | `src/hooks/useEquipmentStatusSync.ts` |
| **Crear** | `src/components/equipment/EquipmentProgressBadge.tsx` |
| **Modificar** | `src/hooks/useSubmitInspection.ts` |
| **Modificar** | `src/app/(workspace)/equipment/[equipmentId]/inspection/[templateId]/page.tsx` |
| **Modificar** | `src/components/plant-map/PlantEquipmentView.tsx` |
| **Modificar** | `src/components/plant-map/panel/FloatingEquipmentPanel.tsx` |

---

## Task 1: Crear `useEquipmentStatusSync`

**Files:**
- Create: `app/src/hooks/useEquipmentStatusSync.ts`

- [ ] **Step 1: Crear el archivo con la función utilitaria y el helper de cálculo**

```typescript
// app/src/hooks/useEquipmentStatusSync.ts
import { createClient } from "@/lib/supabase/client";
import type { EquipmentStatus } from "@/types";
import type { SectionStatus } from "@/types/inspection";

/** Calcula % de secciones procesadas (complete o failed) sobre el total */
export function calcFormPct(sectionStatus: Record<string, SectionStatus>): number {
  const total = Object.keys(sectionStatus).length;
  if (total === 0) return 0;
  const done = Object.values(sectionStatus)
    .filter(s => s === "complete" || s === "failed").length;
  return Math.round((done / total) * 100);
}

/**
 * Actualiza equipment.status y (opcionalmente) equipment.metadata.form_pct en Supabase.
 * Fire-and-forget: no lanza excepción, falla silenciosa para no bloquear el UX.
 */
export async function syncEquipmentStatus(
  equipmentId: string,
  status: EquipmentStatus,
  formPct?: number,
): Promise<void> {
  try {
    const supabase = createClient();
    const now = new Date().toISOString();

    const patch: Record<string, unknown> = { status, updated_at: now };

    if (formPct !== undefined) {
      // Leer metadata actual para hacer merge (evitar pisar otros campos del objeto)
      const { data: current } = await supabase
        .from("equipment")
        .select("metadata")
        .eq("id", equipmentId)
        .single();

      patch.metadata = {
        ...(current?.metadata ?? {}),
        form_pct: formPct,
      };
    }

    await supabase.from("equipment").update(patch).eq("id", equipmentId);
  } catch {
    // falla silenciosa — el UX no se bloquea
  }
}
```

- [ ] **Step 2: Verificar que TypeScript no tenga errores**

```powershell
cd app; npx tsc --noEmit --project tsconfig.json 2>&1 | Select-String "useEquipmentStatusSync"
```

Esperado: sin salida (sin errores en ese archivo).

- [ ] **Step 3: Commit**

```powershell
cd ..; git add "app/src/hooks/useEquipmentStatusSync.ts"
git commit -m "feat(equipment): agregar syncEquipmentStatus y calcFormPct"
```

---

## Task 2: Crear `EquipmentProgressBadge`

**Files:**
- Create: `app/src/components/equipment/EquipmentProgressBadge.tsx`

- [ ] **Step 1: Crear el directorio si no existe y escribir el componente**

```typescript
// app/src/components/equipment/EquipmentProgressBadge.tsx
import type { EquipmentStatus } from "@/types";

interface Props {
  status: EquipmentStatus;
  formPct?: number;
}

/**
 * Indicador dual: barra de ejecución (azul/verde) + check APROBADO (negro→verde).
 * No renderiza nada si el equipo está pendiente y sin progreso.
 */
export function EquipmentProgressBadge({ status, formPct }: Props) {
  if (status === "pendiente" && !formPct) return null;

  const pct        = formPct ?? 0;
  const isApproved = status === "aprobado";
  const barColor   = isApproved ? "#22C55E" : "#38BDF8";
  const checkColor = isApproved ? "#22C55E" : "#374151";

  return (
    <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "5px" }}>
      {/* Label ejecución */}
      <span style={{
        fontSize: "7px", color: "rgba(255,255,255,0.35)",
        fontWeight: "700", letterSpacing: "1px", flexShrink: 0,
      }}>
        EJEC
      </span>

      {/* Barra de progreso */}
      <div style={{
        flex: 1, height: "3px",
        background: "rgba(255,255,255,0.1)",
        borderRadius: "2px", overflow: "hidden",
      }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: barColor, borderRadius: "2px",
          transition: "width 300ms ease",
        }} />
      </div>

      {/* Porcentaje */}
      <span style={{
        fontSize: "7px", color: barColor,
        fontWeight: "700", flexShrink: 0,
        minWidth: "22px", textAlign: "right",
      }}>
        {pct}%
      </span>

      {/* Check + label aprobado */}
      <span style={{ fontSize: "9px", color: checkColor, fontWeight: "700", flexShrink: 0 }}>
        ✓
      </span>
      <span style={{
        fontSize: "7px", color: checkColor,
        fontWeight: "700", letterSpacing: "0.5px", flexShrink: 0,
      }}>
        APR
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

```powershell
cd app; npx tsc --noEmit --project tsconfig.json 2>&1 | Select-String "EquipmentProgressBadge"
```

Esperado: sin salida.

- [ ] **Step 3: Commit**

```powershell
cd ..; git add "app/src/components/equipment/EquipmentProgressBadge.tsx"
git commit -m "feat(equipment): componente EquipmentProgressBadge (barra + check aprobado)"
```

---

## Task 3: Integrar badge en `PlantEquipmentView`

**Files:**
- Modify: `app/src/components/plant-map/PlantEquipmentView.tsx`

- [ ] **Step 1: Agregar el import de `EquipmentProgressBadge` al inicio del archivo**

Buscar la línea:
```typescript
import type { Equipment, EquipmentStatus } from '@/types';
```

Reemplazar con:
```typescript
import type { Equipment, EquipmentStatus } from '@/types';
import { EquipmentProgressBadge } from '@/components/equipment/EquipmentProgressBadge';
```

- [ ] **Step 2: Agregar el badge dentro de cada card del grid**

Localizar dentro del map de equipos (línea ~330) el bloque del status dot:

```typescript
                      <div style={{ marginTop: '7px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: cfg.color, flexShrink: 0, display: 'inline-block' }} />
                        <span style={{ fontSize: '8px', fontWeight: '600', color: cfg.color, letterSpacing: '0.3px' }}>
                          {cfg.label}
                        </span>
                      </div>
```

Reemplazar con:
```typescript
                      <div style={{ marginTop: '7px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: cfg.color, flexShrink: 0, display: 'inline-block' }} />
                        <span style={{ fontSize: '8px', fontWeight: '600', color: cfg.color, letterSpacing: '0.3px' }}>
                          {cfg.label}
                        </span>
                      </div>
                      <EquipmentProgressBadge
                        status={eq.status}
                        formPct={typeof eq.metadata?.form_pct === 'number' ? eq.metadata.form_pct : undefined}
                      />
```

- [ ] **Step 3: Verificar TypeScript**

```powershell
cd app; npx tsc --noEmit --project tsconfig.json 2>&1 | Select-String "PlantEquipmentView"
```

Esperado: sin salida.

- [ ] **Step 4: Commit**

```powershell
cd ..; git add "app/src/components/plant-map/PlantEquipmentView.tsx"
git commit -m "feat(plant-map): integrar EquipmentProgressBadge en cards de equipos"
```

---

## Task 4: Integrar badge en `FloatingEquipmentPanel`

**Files:**
- Modify: `app/src/components/plant-map/panel/FloatingEquipmentPanel.tsx`

- [ ] **Step 1: Agregar el import de `EquipmentProgressBadge`**

Buscar el bloque de imports al inicio del archivo y añadir:
```typescript
import { EquipmentProgressBadge } from "@/components/equipment/EquipmentProgressBadge";
```

- [ ] **Step 2: Agregar el badge después del status dot en el header del panel**

Localizar el bloque (líneas ~137-142):
```typescript
          <div className="flex items-center gap-1 mt-1">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
            <span className="text-[10px] text-slate-400">
              {STATUS_LABELS[equipment.status] ?? equipment.status}
            </span>
          </div>
```

Reemplazar con:
```typescript
          <div className="flex items-center gap-1 mt-1">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
            <span className="text-[10px] text-slate-400">
              {STATUS_LABELS[equipment.status] ?? equipment.status}
            </span>
          </div>
          <div className="mt-1 pr-1">
            <EquipmentProgressBadge
              status={equipment.status}
              formPct={typeof equipment.metadata?.form_pct === "number" ? equipment.metadata.form_pct : undefined}
            />
          </div>
```

- [ ] **Step 3: Verificar TypeScript**

```powershell
cd app; npx tsc --noEmit --project tsconfig.json 2>&1 | Select-String "FloatingEquipmentPanel"
```

Esperado: sin salida.

- [ ] **Step 4: Commit**

```powershell
cd ..; git add "app/src/components/plant-map/panel/FloatingEquipmentPanel.tsx"
git commit -m "feat(plant-map): integrar EquipmentProgressBadge en FloatingEquipmentPanel"
```

---

## Task 5: Modificar `useSubmitInspection` para sincronizar al enviar

**Files:**
- Modify: `app/src/hooks/useSubmitInspection.ts`

- [ ] **Step 1: Agregar el import de `syncEquipmentStatus`**

Añadir al inicio del archivo, después de los imports existentes:
```typescript
import { syncEquipmentStatus } from "@/hooks/useEquipmentStatusSync";
```

- [ ] **Step 2: Agregar el paso 3 de sync después de las evidencias**

Localizar la línea:
```typescript
      return { testId: test.id };
```

Reemplazar con:
```typescript
      // ── 3. Sync equipo → en_ejecucion + form_pct: 100 ──────────────────────
      await syncEquipmentStatus(state.equipmentId, "en_ejecucion", 100);

      return { testId: test.id };
```

- [ ] **Step 3: Verificar TypeScript**

```powershell
cd app; npx tsc --noEmit --project tsconfig.json 2>&1 | Select-String "useSubmitInspection"
```

Esperado: sin salida.

- [ ] **Step 4: Commit**

```powershell
cd ..; git add "app/src/hooks/useSubmitInspection.ts"
git commit -m "feat(inspection): sincronizar equipo a en_ejecucion 100% al enviar formulario"
```

---

## Task 6: Modificar `InspectionPage` para sincronizar al navegar secciones

**Files:**
- Modify: `app/src/app/(workspace)/equipment/[equipmentId]/inspection/[templateId]/page.tsx`

- [ ] **Step 1: Agregar los imports de sync y calcFormPct**

Añadir al bloque de imports existente:
```typescript
import { syncEquipmentStatus, calcFormPct } from "@/hooks/useEquipmentStatusSync";
```

- [ ] **Step 2: Actualizar `handleNext` para sincronizar al avanzar sección**

Localizar:
```typescript
  const handleNext = useCallback(() => {
    setState(prev => {
      if (!prev || !template) return prev;
      const next = Math.min(prev.activeSectionIndex + 1, template.sections.length - 1);
      return { ...prev, activeSectionIndex: next };
    });
  }, [template]);
```

Reemplazar con:
```typescript
  const handleNext = useCallback(() => {
    setState(prev => {
      if (!prev || !template) return prev;
      const next = Math.min(prev.activeSectionIndex + 1, template.sections.length - 1);
      return { ...prev, activeSectionIndex: next };
    });
    // Sync progreso al BD al avanzar sección (fire-and-forget)
    if (state && equipment) {
      const pct = calcFormPct(state.sectionStatus);
      if (pct > 0) syncEquipmentStatus(equipment.id, "en_ejecucion", pct);
    }
  }, [template, state, equipment]);
```

- [ ] **Step 3: Actualizar `handleSectionSelect` para sincronizar al saltar sección**

Localizar:
```typescript
  const handleSectionSelect = useCallback((index: number) => {
    setState(prev => prev ? { ...prev, activeSectionIndex: index } : prev);
  }, []);
```

Reemplazar con:
```typescript
  const handleSectionSelect = useCallback((index: number) => {
    setState(prev => prev ? { ...prev, activeSectionIndex: index } : prev);
    // Sync progreso al BD al cambiar sección (fire-and-forget)
    if (state && equipment) {
      const pct = calcFormPct(state.sectionStatus);
      if (pct > 0) syncEquipmentStatus(equipment.id, "en_ejecucion", pct);
    }
  }, [state, equipment]);
```

- [ ] **Step 4: Verificar que `equipment` esté disponible en el scope**

Confirmar que la variable `equipment` (de `useEquipmentForInspection`) está declarada antes de los callbacks. En el archivo actual está en la línea:
```typescript
  const { data: equipment, isLoading: eqLoading }  = useEquipmentForInspection(equipmentId);
```
Correcto — está en el scope del componente.

- [ ] **Step 5: Verificar TypeScript**

```powershell
cd app; npx tsc --noEmit --project tsconfig.json 2>&1 | Select-String "inspection"
```

Esperado: sin errores relacionados con el archivo de inspección.

- [ ] **Step 6: Commit**

```powershell
cd ..; git add "app/src/app/(workspace)/equipment/[equipmentId]/inspection/[templateId]/page.tsx"
git commit -m "feat(inspection): sincronizar progreso de secciones al equipo al navegar"
```

---

## Task 7: Push final y verificación

- [ ] **Step 1: Verificar TypeScript global**

```powershell
cd app; npx tsc --noEmit --project tsconfig.json 2>&1 | head -20
```

Esperado: sin errores (o solo errores preexistentes no relacionados con los archivos modificados).

- [ ] **Step 2: Push a master para deploy automático**

```powershell
cd ..; git push ptart master
```

- [ ] **Step 3: Verificar comportamiento en producción**

1. Abrir `https://<dominio>/projects/<project-id>/plant-map` → tab Equipos
2. Elegir un equipo → click → panel flotante → confirmar que muestra `EJEC 0% ✓ APR` (negro, sin barra)
3. Iniciar formulario de inspección para ese equipo → completar 2-3 secciones → click "Siguiente"
4. Volver al mapa de planta → el equipo debe mostrar la barra azul con % y estado `en_ejecucion`
5. Completar y enviar el formulario → volver → barra al 100%, check negro
6. (Cuando se implemente la aprobación) Aprobar test → check verde, estado `aprobado`

---

## Checklist de cobertura del spec

| Requisito del spec | Tarea |
|---|---|
| `calcFormPct` calcula secciones complete+failed / total | Task 1 |
| `syncEquipmentStatus` actualiza status + metadata.form_pct | Task 1 |
| `EquipmentProgressBadge` renderiza barra + check | Task 2 |
| Badge en tarjetas de `PlantEquipmentView` | Task 3 |
| Badge en `FloatingEquipmentPanel` | Task 4 |
| Sync al enviar formulario completo (form_pct=100) | Task 5 |
| Sync al navegar secciones (form_pct parcial) | Task 6 |
| Equipos pendientes sin progreso: no muestran barra | Task 2 (return null) |
| Aprobado: barra verde + check verde | Task 2 (isApproved) |
| Rechazado: sin barra, sin check verde | Task 2 (status!='aprobado') |
| Sin cambios de esquema BD | ✓ usa metadata existente |
| Falla silenciosa en sync | Task 1 (try/catch) |
