# Mapa Interactivo de Planta — Design Spec
**Fecha:** 2026-06-07  
**Proyecto:** CommissionPro  
**Estado:** Aprobado para implementación (v2 — Visual Plant Layer agregado)

---

## 1. Objetivo

Permitir que el usuario visualice gráficamente la planta (PTAP, PTAR, estación de bombeo u otra instalación industrial) en **dos capas complementarias**:

1. **Visual Plant Layer** — imagen física real de la planta (PNG/JPG/SVG/plano CAD) con áreas como overlays interactivos. Punto de entrada principal.
2. **React Flow Layer** — diagrama de proceso tipo unifilar con drill-down jerárquico (Área → Sistema → Subsistema → Equipos). Motor de ingeniería.

La navegación fluye de lo visual (imagen) hacia lo técnico (diagrama de proceso), sin salir de la pantalla.

---

## 2. Arquitectura de navegación

```
Visual Plant Layer          ← entrada principal (imagen física de la planta)
  │  clic en área → panel + botón "Explorar Área"
  ↓
React Flow — Área           ← drill-down nivel 1 (sistemas del área como nodos)
  │  clic en sistema
  ↓
React Flow — Sistema        ← drill-down nivel 2 (subsistemas como nodos)
  │  clic en subsistema
  ↓
Panel flotante — Equipos    ← lista de equipos del subsistema
  │  clic en equipo
  ↓
Panel flotante — Ficha      ← ficha técnica del equipo
```

> **React Flow no reemplaza la Visual Plant Layer** — es el nivel de ingeniería al que se accede desde ella. La imagen física es siempre el punto de entrada.

---

## 3. Decisiones de diseño

| Decisión | Elección | Razón |
|---|---|---|
| Layout | Canvas completo + panel flotante (overlay) | Máximo espacio para el diagrama |
| Entrada principal | Visual Plant Layer (imagen real) | El usuario quiere ver la planta físicamente primero |
| Tecnología Visual Layer | SVG overlays sobre `<img>` con zoom/pan CSS | Sin dependencias extra, máxima compatibilidad |
| Motor de ingeniería | `@xyflow/react` (react-flow v12) | Purpose-built para grafos arrastrables con edges |
| Drill-down | Multi-nivel React Flow: Área → Sistema → Subsistema | Navegación jerárquica sin salir de la pantalla |
| Posicionamiento React Flow | Drag & drop con persistencia por proyecto en BD | El usuario configura una vez, se reutiliza |
| Coordenadas Visual Layer | `x, y, width, height` en pixeles sobre la imagen | Simple, editables, persistidas en BD |
| Imagen por proyecto | Upload a Supabase Storage, URL guardada en BD | Cada proyecto tiene su propio plano |
| Navegación retorno | Breadcrumb + botón Volver | Orientación clara en jerarquía profunda |

---

## 4. Nueva ruta

```
/projects/[projectId]/plant-map
```

Se añade al `ProjectSidebar` (`app/src/components/layout/ProjectSidebar.tsx`) un nuevo ítem:

```ts
{ segment: "plant-map", icon: Map, label: "Mapa de Planta" }
```

La página usa el layout existente: `ProjectSidebar + DashboardShell + Topbar`. No se modifica el layout.

---

## 5. DrillLevel — estado de navegación

```ts
export type DrillLevel =
  | { level: 'visual' }                                        // Visual Plant Layer (entrada)
  | { level: 'area';   areaId: string; areaName: string }      // React Flow — sistemas del área
  | { level: 'system'; areaId: string; systemId: string; systemName: string }; // React Flow — subsistemas
```

La página arranca en `{ level: 'visual' }`. Cuando el usuario hace clic en "Explorar Área" en el panel, transiciona a `{ level: 'area', areaId, areaName }` y monta el React Flow de ese área directamente.

> No existe un nivel "plant" (todas las áreas en React Flow) — para eso está la Visual Plant Layer. React Flow empieza siempre en el nivel de un área específica.

---

## 6. PanelState — panel flotante

```ts
export type PanelState =
  | { open: false }
  | { open: true; view: 'area';      areaId: string }      // detalle del área (Visual Layer)
  | { open: true; view: 'equipment'; subsystemId: string } // lista equipos (React Flow)
  | { open: true; view: 'detail';    equipmentId: string }; // ficha técnica
```

---

## 7. Modelo de datos

### 7.1 Tabla `plant_map_layouts` (migración 0019)

```sql
CREATE TABLE plant_map_layouts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  level          TEXT NOT NULL CHECK (level IN ('visual', 'area', 'system')),
  parent_id      UUID,
  -- NULL       → Visual Plant Layer (nivel raíz del proyecto)
  -- area_id    → React Flow del área (nodos = systems)
  -- system_id  → React Flow del sistema (nodos = subsystems)
  nodes_json     JSONB NOT NULL DEFAULT '[]',   -- posiciones React Flow
  edges_json     JSONB NOT NULL DEFAULT '[]',   -- edges React Flow
  overlays_json  JSONB NOT NULL DEFAULT '[]',   -- overlays Visual Layer (solo level='visual')
  image_url      TEXT,                           -- URL imagen planta (solo level='visual')
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX uq_plant_map_layout
  ON plant_map_layouts (
    project_id,
    level,
    COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

ALTER TABLE plant_map_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project members can manage plant map"
  ON plant_map_layouts
  USING (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );
```

### 7.2 Forma de los JSON

**`overlays_json`** — coordenadas de cada área sobre la imagen (Visual Layer):
```json
[
  { "id": "uuid-area", "x": 420, "y": 180, "width": 220, "height": 120 },
  { "id": "uuid-area2", "x": 680, "y": 240, "width": 180, "height": 100 }
]
```

**`nodes_json`** — posiciones de nodos React Flow (niveles area/system):
```json
[
  { "id": "uuid-system-o-subsystem", "x": 155, "y": 100 },
  { "id": "uuid-system-o-subsystem2", "x": 315, "y": 100 }
]
```

**`edges_json`** — conexiones React Flow:
```json
[
  { "id": "e1", "source": "uuid-origen", "target": "uuid-destino" }
]
```

### 7.3 Imagen de planta

- Subida a **Supabase Storage** bucket `plant-maps` (público o signed URL)
- Ruta: `plant-maps/{project_id}/{filename}`
- URL guardada en `plant_map_layouts.image_url` del registro `level='visual'`
- Un proyecto puede tener una imagen. Para cambiarla: re-upload reemplaza el registro

### 7.4 Tablas existentes (sin cambios)

| Tabla | Rol |
|---|---|
| `areas` | Entidades para overlays Visual Layer y nodos React Flow nivel 'area' |
| `systems` | Nodos React Flow nivel 'area' |
| `subsystems` | Nodos React Flow nivel 'system' |
| `equipment` | Lista en panel flotante |
| `project_members` | RLS de `plant_map_layouts` |

### 7.5 Sin sincronización offline

`plant_map_layouts` no pasa por `enqueueSync` ni `localDB`. Es configuración/visualización, no trabajo de campo.

---

## 8. Tipos nuevos (`app/src/types/index.ts`)

```ts
// ── BD ──────────────────────────────────────────────────────────
export type PlantMapLevel = 'visual' | 'area' | 'system';

export interface PlantMapLayout {
  id: string;
  project_id: string;
  level: PlantMapLevel;
  parent_id: string | null;
  nodes_json: PlantMapNodePosition[];
  edges_json: PlantMapEdgeConfig[];
  overlays_json: PlantMapAreaOverlay[];
  image_url?: string;
  created_at: string;
  updated_at: string;
}

// Posición de nodo en React Flow
export interface PlantMapNodePosition {
  id: string;
  x: number;
  y: number;
}

// Edge en React Flow
export interface PlantMapEdgeConfig {
  id: string;
  source: string;
  target: string;
}

// Overlay de área sobre la imagen física
export interface PlantMapAreaOverlay {
  id: string;      // area.id
  x: number;       // píxeles desde la esquina superior izquierda de la imagen
  y: number;
  width: number;
  height: number;
}

// ── Estado cliente ───────────────────────────────────────────────
export type DrillLevel =
  | { level: 'visual' }
  | { level: 'area';   areaId: string; areaName: string }
  | { level: 'system'; areaId: string; systemId: string; systemName: string };

export type PanelState =
  | { open: false }
  | { open: true; view: 'area';      areaId: string }
  | { open: true; view: 'equipment'; subsystemId: string }
  | { open: true; view: 'detail';    equipmentId: string };
```

---

## 9. Árbol de componentes

```
app/src/
├── app/(workspace)/projects/[projectId]/
│   └── plant-map/
│       └── page.tsx                              ← estado DrillLevel + PanelState
│
└── components/plant-map/
    │
    ├── visual/                                   ── VISUAL PLANT LAYER ──
    │   ├── PlantVisualMap.tsx                    ← imagen + overlays SVG
    │   ├── PlantAreaOverlay.tsx                  ← rect SVG por área (hover/click)
    │   ├── PlantVisualToolbar.tsx                ← upload imagen, zoom, modo edición overlays
    │   └── OverlayEditor.tsx                     ← drag-resize para posicionar overlays
    │
    ├── flow/                                     ── REACT FLOW LAYER ──
    │   ├── PlantFlowCanvas.tsx                   ← wrapper @xyflow/react
    │   └── nodes/
    │       ├── PlantSystemNode.tsx               ← nodo Sistema (nivel area)
    │       └── PlantSubsystemNode.tsx            ← nodo Subsistema (nivel system)
    │
    ├── panel/                                    ── PANEL FLOTANTE ──
    │   ├── PlantMapPanel.tsx                     ← gestor de capas del panel
    │   ├── AreaPanelContent.tsx                  ← KPIs + botón "Explorar Área"
    │   ├── EquipmentListContent.tsx              ← lista equipos del subsistema
    │   └── EquipmentDetailContent.tsx            ← ficha técnica del equipo
    │
    ├── PlantMapBreadcrumb.tsx                    ← breadcrumb + botón Volver
    └── PlantMapToolbar.tsx                       ← toolbar contextual según DrillLevel
```

---

## 10. Responsabilidades por componente

### `page.tsx`
- Estado `drillLevel: DrillLevel` (inicia en `{ level: 'visual' }`)
- Estado `panelState: PanelState`
- Renderiza Visual Layer o React Flow según `drillLevel`
- Callbacks: `onAreaClick`, `onExploreArea`, `onBack`, `onPanelNavigate`, `onClosePanel`

### `PlantVisualMap.tsx`
- Renderiza `<img>` con la imagen de la planta
- Superpone `<svg>` con `position: absolute` encima de la imagen
- Zoom/pan con CSS `transform: scale() translate()` + mouse wheel + drag
- Si no hay imagen: estado vacío con botón "Subir imagen de planta"
- Si no hay overlays: banner "Configurá las áreas arrastrando zonas sobre la imagen"

```tsx
interface PlantVisualMapProps {
  imageUrl: string | null
  overlays: PlantMapAreaOverlay[]
  areas: Area[]
  selectedAreaId: string | null
  onAreaClick: (areaId: string) => void
  onOverlaysChange?: (overlays: PlantMapAreaOverlay[]) => void  // modo edición
  editMode: boolean
}
```

### `PlantAreaOverlay.tsx`
Rectángulo SVG por área:
- Normal: `fill="currentColor" opacity-0 stroke` (invisible pero clickeable)
- Hover: `fill` con color de tema, `opacity-20`, tooltip con nombre + % avance
- Seleccionado: `stroke` azul + `fill opacity-30`

```tsx
interface PlantAreaOverlayProps {
  overlay: PlantMapAreaOverlay
  area: Area
  completionPct: number
  selected: boolean
  onHover: (id: string | null) => void
  onClick: (id: string) => void
}
```

### `OverlayEditor.tsx`
Modo edición del Visual Layer:
- Permite dibujar nuevos overlays arrastrando sobre la imagen
- Permite mover y redimensionar overlays existentes
- Cada overlay tiene un selector de área (dropdown con las áreas del proyecto)
- Botón "Guardar posiciones" → `usePlantMapLayout.saveOverlays()`

### `PlantVisualToolbar.tsx`
- Botón **Subir imagen** → input file, upload a Storage, guarda `image_url`
- Botón **Editar áreas** → activa `editMode` en `PlantVisualMap`
- Botones zoom + / - / fit
- Badge con nombre del proyecto

### `PlantFlowCanvas.tsx`
Igual que el `PlantMapCanvas` original pero:
- Recibe `level: 'area' | 'system'` (sin nivel 'visual' ni 'plant')
- `fitView` al montar
- `nodesDraggable={true}`
- Botón "Guardar layout" en toolbar cuando hay cambios pendientes

### `AreaPanelContent.tsx`
- Nombre, código y descripción del área
- Barra de progreso + KPIs (equipos, actividades, documentos)
- **Botón primario: "Explorar Área →"** → llama `onExploreArea(areaId)` → transiciona a React Flow
- Botón: Checklists → navega a `/tests` filtrado por área
- Botón: Documentos → navega a `/documents` filtrado por área
- Botón: Fotografías → deshabilitado en MVP

### `EquipmentListContent.tsx`
- Lista de `Equipment` por `subsystem_id` (usa `useEquipment` existente)
- Cada fila: TAG + nombre + `Badge` de estado (`EquipmentStatus`)
- Clic → `panelState.view = 'detail'`

### `EquipmentDetailContent.tsx`
- TAG + nombre completo
- Campos de ingeniería: `service`, `io_type`, `rtu_destination`, `location_system`, `pid_reference`, `power_kw`
- Badge de estado y criticidad
- Botón "Ver ficha completa" → navega a `/equipment`

### `PlantMapBreadcrumb.tsx`
```
// Visual Layer:   [PTAR Zipaquirá]
// Nivel area:     [PTAR Zipaquirá] > [Captación]  > botón ← Volver al mapa
// Nivel system:   [PTAR Zipaquirá] > [Captación] > [Sistema de Bombeo]
```
Posición `absolute top-4 left-4 z-10`. Fondo `bg-slate-900/80 backdrop-blur-sm`.

---

## 11. Hook `usePlantMapLayout`

```ts
function usePlantMapLayout(projectId: string, drill: DrillLevel): {
  // Visual Layer
  imageUrl: string | null
  overlays: PlantMapAreaOverlay[]
  saveOverlays: (overlays: PlantMapAreaOverlay[], imageUrl?: string) => Promise<void>

  // React Flow
  nodes: Node[]
  edges: Edge[]
  isLoading: boolean
  isFirstTime: boolean
  hasPendingChanges: boolean
  updatePositions: (nodes: Node[]) => void
  updateEdges: (edges: Edge[]) => void
  saveLayout: () => Promise<void>
}
```

- Para `drill.level === 'visual'`: carga el registro `level='visual', parent_id=NULL`
- Para `drill.level === 'area'`: carga `level='area', parent_id=areaId`
- Para `drill.level === 'system'`: carga `level='system', parent_id=systemId`
- `mergeIntoNodes()` combina entidades reales + posiciones guardadas
- Sin posición guardada → auto-arrange en grilla por `sort_order`

---

## 12. Cálculo de stats de áreas (avance %)

```ts
// EquipmentStatus reales: "pendiente" | "en_ejecucion" | "aprobado" | "rechazado"
//                       | "bloqueado" | "listo_energizacion" | "listo_arranque" | "operativo"
// Cuentan como completado: listo_arranque + operativo

const DONE_STATUSES = new Set(['listo_arranque', 'operativo']);

const pctByArea = useMemo(() => {
  // Lookup: subsystem_id → system_id → area_id
  const subToSystem = new Map(subsystems.map(s => [s.id, s.system_id]));
  const sysToArea   = new Map(systems.map(s   => [s.id, s.area_id]));

  const map: Record<string, { total: number; done: number }> = {};
  for (const eq of equipment) {
    const systemId = subToSystem.get(eq.subsystem_id);
    const areaId   = systemId ? sysToArea.get(systemId) : undefined;
    if (!areaId) continue;
    if (!map[areaId]) map[areaId] = { total: 0, done: 0 };
    map[areaId].total++;
    if (DONE_STATUSES.has(eq.status)) map[areaId].done++;
  }
  return Object.fromEntries(
    Object.entries(map).map(([k, v]) => [k, v.total ? Math.round(v.done / v.total * 100) : 0])
  );
}, [equipment, subsystems, systems]);
```

Usa `systems` y `subsystems` de `useHierarchy` (ya cargados). Sin query adicional.

---

## 13. Flujo de primer uso

### Visual Layer — sin imagen
1. Canvas muestra placeholder con ícono de planta
2. Mensaje: *"Subí el plano de tu planta para comenzar"*
3. Botón **Subir imagen** → file picker → upload a Storage → guarda `image_url`

### Visual Layer — imagen cargada, sin overlays
1. Se muestra la imagen con controles de zoom
2. Banner: *"Marcá las áreas arrastrando zonas sobre la imagen"*
3. Botón **Editar áreas** → activa `OverlayEditor`
4. Usuario dibuja rectángulos y los asocia a cada `Area` del proyecto
5. Guarda → overlays persistidos en `overlays_json`

### React Flow — sin layout guardado
1. Nodos de sistemas/subsistemas en auto-arrange (grilla por `sort_order`)
2. Banner: *"Arrastrá los nodos para organizar el diagrama y guardá el layout"*
3. Sin edges iniciales — el usuario los dibuja desde los handles de react-flow

---

## 14. Ciclo drag → save (React Flow)

```
Usuario arrastra nodo
  → react-flow onNodesChange (type: 'position')
  → pendingPositions actualizado en estado local
  → Toolbar muestra "● Guardar layout"

Usuario clic "Guardar layout"
  → usePlantMapLayout.saveLayout()
  → UPSERT plant_map_layouts SET nodes_json = pendingPositions
  → React Query invalida cache
  → Indicador desaparece
```

---

## 15. Responsive

| Dispositivo | Comportamiento |
|---|---|
| Desktop (≥1024px) | Canvas completo, panel flotante 300px a la derecha |
| Tablet (768–1023px) | Canvas completo, panel ocupa 100% del ancho en posición `bottom` |
| Móvil (<768px) | Out of scope |

---

## 16. Dependencia nueva

```bash
npm install @xyflow/react
```

`@xyflow/react` v12 — React 18/19, Next.js 16, MIT, ~200KB gzipped.

El Visual Layer no requiere librerías adicionales — usa SVG nativo + CSS transforms.

---

## 17. Fuera de scope (MVP)

- Edición de overlays con formas no rectangulares (polígonos)
- Múltiples imágenes de planta por proyecto (plantas de varios pisos)
- Exportar el mapa como imagen/PDF
- Animaciones de flujo sobre los edges de React Flow
- Modo "solo lectura" para usuarios sin permiso de edición
- Historial de versiones del layout
- Fotografías y observaciones (botón presente, deshabilitado)

---

## 18. Archivos a crear / modificar

| Archivo | Acción |
|---|---|
| `app/src/app/(workspace)/projects/[projectId]/plant-map/page.tsx` | Crear |
| `app/src/components/plant-map/visual/PlantVisualMap.tsx` | Crear |
| `app/src/components/plant-map/visual/PlantAreaOverlay.tsx` | Crear |
| `app/src/components/plant-map/visual/PlantVisualToolbar.tsx` | Crear |
| `app/src/components/plant-map/visual/OverlayEditor.tsx` | Crear |
| `app/src/components/plant-map/flow/PlantFlowCanvas.tsx` | Crear |
| `app/src/components/plant-map/flow/nodes/PlantSystemNode.tsx` | Crear |
| `app/src/components/plant-map/flow/nodes/PlantSubsystemNode.tsx` | Crear |
| `app/src/components/plant-map/panel/PlantMapPanel.tsx` | Crear |
| `app/src/components/plant-map/panel/AreaPanelContent.tsx` | Crear |
| `app/src/components/plant-map/panel/EquipmentListContent.tsx` | Crear |
| `app/src/components/plant-map/panel/EquipmentDetailContent.tsx` | Crear |
| `app/src/components/plant-map/PlantMapBreadcrumb.tsx` | Crear |
| `app/src/components/plant-map/PlantMapToolbar.tsx` | Crear |
| `app/src/hooks/usePlantMapLayout.ts` | Crear |
| `app/src/types/index.ts` | Modificar (agregar 7 tipos nuevos) |
| `app/src/components/layout/ProjectSidebar.tsx` | Modificar (agregar navItem) |
| `database/migrations/0019_plant_map_layouts.sql` | Crear |

---

## 19. Orden de implementación

1. Migración 0019 + crear bucket `plant-maps` en Supabase Storage + aplicar en Supabase
2. Tipos nuevos en `index.ts`
3. `usePlantMapLayout` hook (Visual Layer + React Flow)
4. `PlantVisualMap` + `PlantAreaOverlay` (imagen + overlays, sin editor aún)
5. `PlantVisualToolbar` + upload de imagen
6. `OverlayEditor` (dibujar y posicionar overlays)
7. `AreaPanelContent` con botón "Explorar Área"
8. `PlantFlowCanvas` + `PlantSystemNode` + `PlantSubsystemNode`
9. `page.tsx` integrando ambas capas + transición Visual → React Flow
10. `PlantMapBreadcrumb` + navegación retorno
11. `EquipmentListContent` + `EquipmentDetailContent`
12. `PlantMapPanel` integrando las tres capas del panel
13. Agregar ítem en `ProjectSidebar`
