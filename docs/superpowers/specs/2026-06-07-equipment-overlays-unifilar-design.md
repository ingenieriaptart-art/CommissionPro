# Spec: Equipment Overlays en Unifilar por Área

**Fecha:** 2026-06-07  
**Estado:** Aprobado

---

## Problema

El Mapa de Planta actual permite subir una imagen general de la planta y marcar áreas sobre ella. Sin embargo, cada área tiene su propio diagrama unifilar (p.ej. el CCM de Cloración) con equipos individuales. El usuario necesita subir ese unifilar al nivel del área y marcar cada equipo con un rectángulo para poder hacer clic sobre él y ver su ficha técnica.

---

## Arquitectura

### Jerarquía de niveles

```
level='visual'   parent_id=NULL       → plano general de la planta + overlays de áreas
level='area'     parent_id=area.id    → unifilar del área + overlays de equipos  ← NUEVO
level='system'   parent_id=system.id  → React Flow de subsistemas (existente)
```

La tabla `plant_map_layouts` ya soporta este modelo con los campos `level`, `parent_id`, `overlays_json`, `image_url`. **No se requiere migración de base de datos.**

### Extensión del tipo de overlay

Se agrega un campo `type` opcional al tipo existente (backward-compatible):

```ts
interface PlantMapAreaOverlay {
  id: string;                          // area.id o equipment.id según type
  type?: 'area' | 'equipment';         // ausente se trata como 'area'
  x: number;
  y: number;
  width: number;
  height: number;
}
```

Los overlays de nivel `level='area'` tendrán `type='equipment'`. Los de nivel `level='visual'` tienen `type='area'` (implícito).

### Storage de imágenes

Las imágenes por área se suben al bucket `plant-maps` con la ruta:
```
{projectId}/{areaId}/plano.{ext}
```

---

## Vista del nivel área: Tabs

Al hacer drill-down a un área, la pantalla muestra dos pestañas:

- **Unifilar** — imagen del CCM con rectángulos de equipos superpuestos. Si no hay imagen, muestra un estado vacío con botón "Subir imagen".
- **Diagrama** — el React Flow existente con nodos de sistemas (comportamiento actual sin cambios).

El estado del tab activo se maneja en `page.tsx` con `useState<'unifilar' | 'diagrama'>('unifilar')`.

---

## Colores de overlays por estado de equipo

| Estado | Color |
|--------|-------|
| `pendiente` | Azul (`#3b82f6`) |
| `en_ejecucion` | Naranja (`#f59e0b`) |
| `aprobado` / `revisado` | Amarillo (`#eab308`) |
| `listo_energizacion` / `listo_arranque` | Verde claro (`#84cc16`) |
| `operativo` | Verde (`#22c55e`) |
| `rechazado` / `bloqueado` | Rojo (`#ef4444`) |

---

## Flujo de usuario

1. **Nivel visual** → usuario hace clic en rectángulo de área → panel lateral → botón "Explorar Área"
2. **Nivel área** → aparecen tabs Unifilar / Diagrama
3. **Tab Unifilar (sin imagen)** → botón "Subir imagen" en toolbar → usuario sube el CCM
4. **Tab Unifilar (con imagen)** → botón "Editar equipos" → modo edición activo
5. **Modo edición** → usuario arrastra para dibujar rectángulo sobre un símbolo del unifilar → popup "Asignar a equipo" → dropdown con equipos del proyecto → "Asignar" → rectángulo queda con color según estado
6. **Guardar** → clic "Guardar equipos" → se persiste en `plant_map_layouts` (level='area', parent_id=areaId)
7. **Modo lectura** → usuario hace clic en rectángulo → panel lateral muestra `EquipmentDetailContent` (tag, nombre, estado, criticidad, I/O, RTU, servicio, P&ID, potencia, botón a ficha completa)

---

## Componentes a modificar

### `app/src/types/index.ts`
- Agregar `type?: 'area' | 'equipment'` a `PlantMapAreaOverlay`.

### `app/src/components/plant-map/visual/PlantVisualToolbar.tsx`
- Agregar prop `overlayMode: 'area' | 'equipment'`.
- Cuando `overlayMode='equipment'`: label "Editar equipos" en lugar de "Editar áreas".

### `app/src/components/plant-map/visual/OverlayEditor.tsx`
- Agregar props `overlayMode: 'area' | 'equipment'` y `equipment: Equipment[]`.
- Cuando `overlayMode='equipment'`: el dropdown "Asignar zona a…" muestra equipos (`tag — name`) en lugar de áreas.
- El overlay creado incluye `type: overlayMode`.

### `app/src/components/plant-map/visual/PlantVisualMap.tsx`
- Agregar prop `equipment: Equipment[]`.
- Al renderizar overlays: si `overlay.type === 'equipment'`, buscar el equipo por id y usar el color de su estado; si no, usar azul (comportamiento actual).

### `app/src/app/(workspace)/projects/[projectId]/plant-map/page.tsx`
- Agregar estado `activeTab: 'unifilar' | 'diagrama'` (default `'unifilar'`).
- Al `drill.level === 'area'`: renderizar tabs + contenido según tab activo.
  - Tab **Unifilar**: `PlantVisualToolbar` + `PlantVisualMap` con `overlayMode='equipment'`.
  - Tab **Diagrama**: `PlantFlowCanvas` existente (sin cambios).
- Al cambiar de área (`drill.level` pasa a `'area'`): resetear tab a `'unifilar'`.
- `PlantVisualMap` recibe `onAreaClick`. En `level='visual'` el handler existente abre `{ view: 'area', areaId }`. En `level='area'` (tab Unifilar) se pasa un nuevo handler `handleEquipmentOverlayClick` que abre `{ view: 'detail', equipmentId: overlayId }` — mismo prop, distinto callback según drill level.
- Agregar `handleEquipmentOverlayClick(equipmentId: string)` → `setPanelState({ open: true, view: 'detail', equipmentId })`.

### `app/src/hooks/usePlantMapLayout.ts`
- Sin cambios de lógica. Ya maneja cualquier combinación de `level`/`parent_id`.

### `app/src/components/plant-map/panel/PlantMapPanel.tsx`
- Sin cambios. Ya soporta `view: 'detail'` con `EquipmentDetailContent`.

---

## Fuera de scope

- Overlays de equipos en el nivel `level='system'`.
- Mover la imagen subida actualmente (nivel visual) al nivel área automáticamente — el usuario la re-sube en el tab Unifilar del área.
- Editar la posición/tamaño de un overlay existente (solo crear y eliminar).
- Zoom/pan independiente por tab.

---

## Criterios de aceptación

1. Al estar en `drill.level === 'area'` se muestran dos tabs: Unifilar y Diagrama.
2. Tab Diagrama muestra el React Flow existente sin regresiones.
3. Tab Unifilar permite subir una imagen para el área.
4. En modo edición se pueden dibujar rectángulos y asignarlos a equipos del proyecto.
5. Los rectángulos se colorean según el estado del equipo.
6. Al guardar, los overlays persisten en Supabase (level='area', parent_id=areaId).
7. Al hacer clic en un rectángulo en modo lectura, el panel muestra la ficha técnica del equipo.
8. El tab Diagrama y el React Flow existente siguen funcionando sin cambios.
