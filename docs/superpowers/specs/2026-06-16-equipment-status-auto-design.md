# Spec: Estado Automático de Equipos con Indicador Dual de Progreso

**Fecha:** 2026-06-16  
**Estado:** Aprobado por usuario  
**Proyecto:** CommissionPro — Planta LDC (Zipaquirá)

---

## 1. Problema

Todos los equipos quedan permanentemente en estado `pendiente` porque:
- `useUpdateEquipment` está definido pero nunca se invoca desde ningún componente.
- No existe lógica que conecte el progreso del formulario de inspección con el estado del equipo en BD.
- No existe UI para cambiar el estado manualmente.

---

## 2. Solución: indicador dual automático

Cada tarjeta de equipo muestra dos indicadores independientes derivados de los datos reales de pruebas:

```
┌─────────────────────────────────────────────┐
│  CCM1N                                      │
│  Centro de Control de Motores 1 Normal      │
│  ● EN EJECUCIÓN                             │
│                                             │
│  Ejecución  [████████░░] 80%   ✓ APROBADO  │
└─────────────────────────────────────────────┘
```

### Indicador 1 — Barra de ejecución (azul)

- **Qué mide:** porcentaje de secciones del formulario de precomisionamiento completadas.
- **Fuente de datos:** `equipment.metadata.form_pct` (número 0–100).
- **Se actualiza:** cada vez que el técnico guarda o envía el formulario de inspección.
- **No aparece** si `form_pct` es `undefined` / `0` y `status === 'pendiente'`.

### Indicador 2 — Check de aprobación

- **Qué muestra:** ícono `✓ APROBADO`
- **Color negro/gris:** el equipo aún no ha sido aprobado (`status !== 'aprobado'`)
- **Color verde:** el equipo está aprobado (`status === 'aprobado'`)
- Siempre visible cuando `form_pct > 0` o `status !== 'pendiente'`.

---

## 3. Flujo de estados automático

```
pendiente
   │
   │ Técnico abre formulario → avanza secciones
   ▼
en_ejecucion  ← equipment.metadata.form_pct se actualiza en cada guardado
   │
   │ form_pct llega a 100% (formulario enviado)
   │   → useSubmitInspection crea test con status='ejecutado'
   │   → llama useUpdateEquipment({ status: 'en_ejecucion', metadata: { form_pct: 100 } })
   ▼
en_ejecucion (100%) + ✓ negro
   │
   │ Supervisor cierra test (status='cerrado', result_summary='cumple')
   │   → hook de aprobación llama useUpdateEquipment({ status: 'aprobado' })
   ▼
aprobado + ✓ verde
   │
   │ (si rechazado: status='rechazado')
   │
   │ Manual por supervisor:
   ▼
listo_energizacion → listo_arranque → operativo
```

### Tabla de transiciones

| Trigger | Campo BD que cambia | Nuevo status |
|---|---|---|
| Sección del form completada (guardado parcial) | `equipment.metadata.form_pct = X` | `en_ejecucion` |
| Form enviado completo | `form_pct = 100` + `test.status = ejecutado` | `en_ejecucion` |
| Test cerrado + cumple | — | `aprobado` |
| Test rechazado | — | `rechazado` |
| Supervisor activa energización | — | `listo_energizacion` |
| Supervisor activa arranque | — | `listo_arranque` |
| Operativo confirmado | — | `operativo` |

Los tres últimos (listo_energizacion, listo_arranque, operativo) son **manuales** — botones en el panel del equipo, fuera del alcance de este spec.

---

## 4. Cambios de datos

### 4.1 Campo `equipment.metadata.form_pct`

- Tipo: `number` (0–100), almacenado en el campo JSON `metadata` existente.
- No requiere migración de BD — `metadata` ya es `Record<string, unknown>`.
- Actualizado por `useUpdateEquipment({ id, metadata: { form_pct: X }, status: 'en_ejecucion' })`.

### 4.2 Cálculo del porcentaje de ejecución

```typescript
function calcFormPct(sectionStatus: Record<string, SectionStatus>): number {
  const total = Object.keys(sectionStatus).length;
  if (total === 0) return 0;
  const done = Object.values(sectionStatus)
    .filter(s => s === 'complete' || s === 'failed').length;
  return Math.round((done / total) * 100);
}
```

- `complete` y `failed` cuentan como secciones procesadas (ambas avanzaron la ejecución).
- Se llama en dos momentos: al navegar entre secciones (guardado en sessionStorage) y al enviar el form.

### 4.3 Derivación del check de aprobación

```typescript
const isApproved = equipment.status === 'aprobado';
```

Simple. No requiere consulta extra de tests.

---

## 5. Componentes y hooks afectados

### 5.1 Nuevo hook: `useEquipmentStatusSync`

```typescript
// src/hooks/useEquipmentStatusSync.ts
export function useEquipmentStatusSync() {
  const updateEquipment = useUpdateEquipment();

  const syncFromInspection = (equipmentId: string, pct: number) => {
    updateEquipment.mutate({
      id: equipmentId,
      status: 'en_ejecucion',
      metadata: { form_pct: pct },
    });
  };

  const syncApproved = (equipmentId: string) => {
    updateEquipment.mutate({ id: equipmentId, status: 'aprobado' });
  };

  const syncRechazado = (equipmentId: string) => {
    updateEquipment.mutate({ id: equipmentId, status: 'rechazado' });
  };

  return { syncFromInspection, syncApproved, syncRechazado };
}
```

### 5.2 `useSubmitInspection` — agregar llamada al sync

Después del INSERT de test exitoso, agregar:

```typescript
// Paso 3 (nuevo): actualizar equipo
await updateEquipmentStatus(state.equipmentId, {
  status: 'en_ejecucion',
  metadata: { form_pct: 100 },
});
```

Usa `createClient()` directamente (igual que el resto del hook) con la sesión del usuario autenticado. No requiere service role key.

### 5.3 `InspectionPage` — guardado parcial al navegar secciones

Cuando el usuario hace click en "Siguiente sección" (evento de navegación, no por cada tecla), también actualizar BD:

```typescript
const pct = calcFormPct(state.sectionStatus);
if (pct > 0) syncFromInspection(equipmentId, pct);
```

Una sola llamada por cambio de sección — sin debounce necesario.

### 5.4 Nuevo componente: `EquipmentProgressBadge`

```typescript
// src/components/equipment/EquipmentProgressBadge.tsx
interface Props {
  status: EquipmentStatus;
  formPct?: number;  // de equipment.metadata.form_pct
}
```

Renderiza:
- Si `status === 'pendiente'` y `formPct` es 0 o undefined → nada (no mostrar barra)
- Si `formPct > 0` → barra azul con % + check negro/verde
- Si `status === 'aprobado'` → barra llena verde + check verde

### 5.5 `PlantEquipmentView` — integrar el badge

En cada card del grid, debajo del status badge actual, agregar `<EquipmentProgressBadge>`.

El dato `form_pct` se lee de `eq.metadata?.form_pct as number | undefined` — sin consultas extra.

### 5.6 `FloatingEquipmentPanel` — mostrar el badge también

En el panel flotante que abre al hacer click en el SCADA/mapa, agregar el mismo badge bajo el estado.

---

## 6. Flujo de aprobación (test cerrado)

Cuando un supervisor cierra un test como `cerrado`:

- Si `test.result_summary === 'cumple'` → llamar `syncApproved(equipment_id)`
- Si `test.result_summary === 'no_cumple'` → llamar `syncRechazado(equipment_id)`

Este punto de invocación está en el componente/hook que gestiona los cambios de estado de tests (a identificar durante la implementación — actualmente no existe UI de aprobación completa, por lo que se dejará un TODO claro con el hook listo para enganchar).

---

## 7. Qué NO cambia

- El campo `status` de `Equipment` sigue siendo la fuente de verdad para el estado categórico.
- Los estados `listo_energizacion`, `listo_arranque`, `operativo` son manuales — fuera de este spec.
- No se agrega una columna nueva a la tabla `equipment` — se usa `metadata` existente.
- No se modifica el esquema de `tests` ni `checklist_items`.
- El `SCADA_POTENCIA_TAGS` filter en `PlantEquipmentView` no cambia.

---

## 8. Archivos a crear / modificar

| Archivo | Acción |
|---|---|
| `src/hooks/useEquipmentStatusSync.ts` | **Crear** — nuevo hook |
| `src/hooks/useSubmitInspection.ts` | **Modificar** — agregar step 3 de sync |
| `src/app/(workspace)/equipment/[equipmentId]/inspection/[templateId]/page.tsx` | **Modificar** — guardado parcial por sección |
| `src/components/equipment/EquipmentProgressBadge.tsx` | **Crear** — nuevo componente visual |
| `src/components/plant-map/PlantEquipmentView.tsx` | **Modificar** — integrar badge en cards |
| `src/components/plant-map/FloatingEquipmentPanel.tsx` | **Modificar** — integrar badge en panel flotante |

---

## 9. Criterios de éxito

1. Cuando un técnico completa el 50% del formulario de un equipo y guarda → ese equipo aparece en la lista con barra al 50% y estado `en_ejecucion`.
2. Al enviar el formulario completo → barra al 100%, check negro.
3. Cuando el supervisor aprueba → check verde, estado `aprobado`.
4. Si el test es rechazado → estado `rechazado` (sin barra, sin check verde).
5. Equipos sin formulario iniciado → solo estado `pendiente`, sin barra.
6. El indicador aparece en `PlantEquipmentView` (tarjetas) y en `FloatingEquipmentPanel`.
