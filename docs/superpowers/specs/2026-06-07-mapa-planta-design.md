# Mapa Interactivo de Planta — Design Spec
**Fecha:** 2026-06-07  
**Proyecto:** CommissionPro  
**Estado:** Aprobado para implementación

---

## 1. Objetivo

Permitir que el usuario visualice gráficamente la planta (PTAP, PTAR, estación de bombeo u otra instalación industrial) como un **diagrama de proceso interactivo tipo unifilar**, navegando desde la acometida principal hacia cada área, sistema y subsistema mediante clics, sin salir de la pantalla.

---

## 2. Decisiones de diseño (resultado del brainstorming)

| Decisión | Elección | Razón |
|---|---|---|
| Layout | Canvas completo + panel flotante (overlay) | Máximo espacio para el diagrama |
| Concepto visual | Diagrama de proceso tipo unifilar | El usuario pidió ver el flujo desde la acometida principal |
| Drill-down | Multi-nivel en el mismo canvas (Planta → Área → Sistema/Subsistema) | Navegación jerárquica sin salir de la pantalla |
| Panel de equipos | Panel flotante multi-capa (sin cambio de canvas al llegar a equipos) | Mantiene contexto visual del diagrama |
| Posicionamiento nodos | Drag & drop con persistencia por proyecto en BD | El usuario configura el layout una vez, se reutiliza |
| Imagen de fondo | Opcional (el diagrama funciona sin ella) | Simplicidad en MVP, extensible después |
| Navegación retorno | Breadcrumb + botón Volver | Orientación clara en jerarquía profunda |
| Tecnología canvas | `@xyflow/react` (react-flow v12) | Purpose-built para grafos arrastrables con edges |

---

## 3. Nueva ruta

```
/projects/[projectId]/plant-map
```

Se añade al `ProjectSidebar` (`app/src/components/layout/ProjectSidebar.tsx`) un nuevo ítem en el array `navItems`:

```ts
{ segment: "plant-map", icon: Map, label: "Mapa de Planta" }
```

La página usa el layout existente: `ProjectSidebar + DashboardShell + Topbar`. No se modifica el layout.

---

## 4. Navegación por niveles (drill-down)

El canvas reemplaza su contenido al navegar entre niveles. Los nodos representan entidades reales de la BD.

```
Nivel 0 — Planta completa
  Nodos : todas las Áreas del proyecto
  Edges : flujo de proceso (configurable por el usuario)
  Breadcrumb: [nombre del proyecto]

Nivel 1 — Área seleccionada
  Nodos : todos los Sistemas del área
  Edges : flujo interno del área
  Breadcrumb: [proyecto] > [Área]

Nivel 2 — Sistema seleccionado
  Nodos : todos los Subsistemas del sistema
  Edges : relaciones entre subsistemas
  Breadcrumb: [proyecto] > [Área] > [Sistema]

Nivel 3 — Panel de equipos (sin cambio de canvas)
  El panel flotante muestra Equipment del subsistema seleccionado
  Clic en equipo → ficha técnica (nivel 4 del panel)
```

El estado de navegación se maneja como `DrillLevel` en `PlantMapPage`. No se usan rutas anidadas adicionales para los niveles — todo es estado local de la página.

---

## 5. Modelo de datos

### 5.1 Nueva tabla: `plant_map_layouts` (migración 0019)

```sql
CREATE TABLE plant_map_layouts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  level          TEXT NOT NULL CHECK (level IN ('plant', 'area', 'system')),
  parent_id      UUID,
  -- NULL  → nivel planta
  -- area_id  → nivel área (nodos = systems del área)
  -- system_id → nivel sistema (nodos = subsystems del sistema)
  nodes_json     JSONB NOT NULL DEFAULT '[]',
  edges_json     JSONB NOT NULL DEFAULT '[]',
  background_url TEXT,
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

### 5.2 Forma de los JSON

**`nodes_json`** — posiciones de nodos en el canvas:
```json
[
  { "id": "uuid-del-area-o-system", "x": 155, "y": 100 },
  { "id": "uuid-del-area-o-system", "x": 315, "y": 100 }
]
```

**`edges_json`** — conexiones (flujo de proceso):
```json
[
  { "id": "e1", "source": "uuid-origen", "target": "uuid-destino" },
  { "id": "e2", "source": "uuid-origen2", "target": "uuid-destino2" }
]
```

Los IDs son los UUIDs de `areas`, `systems` o `subsystems` según el nivel. React Flow los usa directamente.

### 5.3 Tablas existentes (sin cambios)

| Tabla | Rol en el mapa |
|---|---|
| `areas` | Nodos nivel 0. `sort_order` define orden en auto-arrange |
| `systems` | Nodos nivel 1 |
| `subsystems` | Nodos nivel 2 |
| `equipment` | Lista en panel flotante nivel 3–4 |
| `project_members` | RLS de `plant_map_layouts` |

### 5.4 Sincronización offline

`plant_map_layouts` **no** pasa por `enqueueSync` ni `localDB`. Es una herramienta de configuración/visualización — no es crítica para trabajo en campo offline.

---

## 6. Tipos nuevos (`app/src/types/index.ts`)

```ts
// ── BD ──────────────────────────────────────────────────────────
export type PlantMapLevel = 'plant' | 'area' | 'system';

export interface PlantMapLayout {
  id: string;
  project_id: string;
  level: PlantMapLevel;
  parent_id: string | null;
  nodes_json: PlantMapNodePosition[];
  edges_json: PlantMapEdgeConfig[];
  background_url?: string;
  created_at: string;
  updated_at: string;
}

export interface PlantMapNodePosition {
  id: string;
  x: number;
  y: number;
}

export interface PlantMapEdgeConfig {
  id: string;
  source: string;
  target: string;
}

// ── Estado cliente ───────────────────────────────────────────────
export type DrillLevel =
  | { level: 'plant' }
  | { level: 'area';   areaId: string;   areaName: string }
  | { level: 'system'; areaId: string;   systemId: string; systemName: string };

export type PanelState =
  | { open: false }
  | { open: true; view: 'area';      areaId: string }
  | { open: true; view: 'equipment'; subsystemId: string }
  | { open: true; view: 'detail';    equipmentId: string };
```

---

## 7. Árbol de componentes

```
app/src/
├── app/(workspace)/projects/[projectId]/
│   └── plant-map/
│       └── page.tsx                         ← página Next.js, estado DrillLevel + PanelState
│
└── components/plant-map/
    ├── PlantMapCanvas.tsx                   ← wrapper @xyflow/react
    ├── PlantMapBreadcrumb.tsx               ← breadcrumb + botón Volver
    ├── PlantMapToolbar.tsx                  ← modo vista, zoom, imagen de fondo, guardar layout
    ├── nodes/
    │   ├── PlantAreaNode.tsx                ← nodo Área (nivel 0): ícono, nombre, barra %, KPIs
    │   └── PlantSystemNode.tsx              ← nodo Sistema/Subsistema (nivel 1-2): compacto
    └── panel/
        ├── PlantMapPanel.tsx                ← panel flotante, gestiona capas
        ├── AreaPanelContent.tsx             ← capa área: KPIs + acciones de navegación
        ├── EquipmentListContent.tsx         ← capa equipos: lista filtrada por subsystem
        └── EquipmentDetailContent.tsx       ← capa ficha: tag, nombre, estado, fotos, historial
```

### Nuevo hook

```
app/src/hooks/
└── usePlantMapLayout.ts     ← CRUD del layout + merge entidades+posiciones
```

### Hooks existentes reutilizados (sin modificar)

| Hook | Uso |
|---|---|
| `useAreas(projectId)` | Entidades para nodos nivel 0 |
| `useSystems(areaId)` | Entidades para nodos nivel 1 |
| `useSubsystems(systemId)` | Entidades para nodos nivel 2 |
| `useEquipment(projectId, subsystemId)` | Lista en panel nivel 3 |
| `useProject(projectId)` | Nombre del proyecto en breadcrumb |

---

## 8. Responsabilidades por componente

### `page.tsx`
- Declara `drillLevel: DrillLevel` y `panelState: PanelState`
- Renderiza `PlantMapBreadcrumb`, `PlantMapToolbar`, `PlantMapCanvas`, `PlantMapPanel`
- Callbacks: `onNodeClick`, `onDrillDown`, `onBack`, `onPanelNavigate`, `onClosePanel`
- Sin lógica de datos — delega a hooks

### `PlantMapCanvas`
```tsx
interface PlantMapCanvasProps {
  nodes: Node[]
  edges: Edge[]
  nodeType: 'area' | 'system'
  onNodeClick: (id: string) => void
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
}
```
Configuración react-flow:
- `fitView` al montar y al cambiar de nivel
- `nodesDraggable={true}`
- `<Background variant="dots" />`
- `<Controls />` (zoom in/out/fit)

### `PlantAreaNode`
```tsx
interface PlantAreaNodeData {
  area: Area
  equipmentCount: number
  completionPct: number   // calculado en cliente desde equipment[]
  selected: boolean
}
```
Diseño: ícono (emoji o Lucide) + nombre en mayúsculas + código + barra de progreso + contadores. Color de borde derivado del `sort_order` (mismo esquema de `ProjectSidebar`).

### `PlantSystemNode`
Versión compacta para Sistemas y Subsistemas. Muestra nombre, código y conteo de equipos. Misma estructura de datos adaptada.

### `PlantMapPanel`
- Posición: `fixed right-6 top-1/2 -translate-y-1/2`, ancho 300px
- Animación: `animate-in slide-in-from-right` (Tailwind)
- Header: título de la capa activa + botón `←` para retroceder una capa
- Cierre completo con `✕`
- Renderiza `AreaPanelContent | EquipmentListContent | EquipmentDetailContent` según `panelState.view`

### `AreaPanelContent`
- Nombre y código del área
- Barra de progreso de precomisionamiento
- KPIs: equipos, actividades, documentos
- Botones de acción:
  - **Ver equipos** → `panelState.view = 'equipment'`
  - **Checklists** → navega a `/projects/[id]/tests` filtrado por área
  - **Documentos** → navega a `/projects/[id]/documents` filtrado por área
  - **Fotografías y observaciones** → botón deshabilitado en MVP (out of scope)

### `EquipmentListContent`
- Título: nombre del subsistema
- Lista de `Equipment` filtrada por `subsystem_id` (usa `useEquipment` existente)
- Cada fila: TAG + nombre + badge de estado (`EquipmentStatus`)
- Clic en fila → `panelState.view = 'detail'`

### `EquipmentDetailContent`
- TAG + nombre completo
- Campos: `service`, `io_type`, `rtu_destination`, `location_system`, `pid_reference`, `power_kw`
- Badge de estado y criticidad
- Botón "Ver ficha completa" → navega a `/projects/[id]/equipment` con el equipo seleccionado

### `PlantMapBreadcrumb`
```tsx
// Nivel 0: [PTAR Zipaquirá]
// Nivel 1: [PTAR Zipaquirá] > [Captación]
// Nivel 2: [PTAR Zipaquirá] > [Captación] > [Sistema de bombeo]
```
Posición: `absolute top-4 left-4 z-10`. Fondo `bg-slate-900/80 backdrop-blur-sm`. Cada segmento es clickeable y llama `onBack(level)`.

### `PlantMapToolbar`
- Botón **Guardar layout** (visible solo cuando hay cambios pendientes de drag)
- Botones zoom + (delega a react-flow)
- Botón **Subir imagen de fondo** (futuro — disabled en MVP con tooltip)
- Indicador de nivel activo

### `usePlantMapLayout`
```ts
function usePlantMapLayout(projectId: string, drill: DrillLevel): {
  nodes: Node[]
  edges: Edge[]
  isLoading: boolean
  isFirstTime: boolean      // true si no hay layout guardado
  hasPendingChanges: boolean
  updatePositions: (nodes: Node[]) => void   // actualiza estado local
  updateEdges: (edges: Edge[]) => void
  saveLayout: () => Promise<void>
}
```

Internamente:
1. `useQuery` lee `plant_map_layouts` para el nivel activo
2. `useAreas | useSystems | useSubsystems` según el nivel
3. `mergeIntoNodes()` combina entidades + posiciones guardadas
4. Si posición no guardada → auto-arrange en grilla por `sort_order`
5. `useMutation` para UPSERT al guardar

---

## 9. Ciclo drag → save

```
Usuario arrastra nodo
  → react-flow onNodesChange (type: 'position')
  → PlantMapPage actualiza pendingPositions (estado local)
  → Toolbar muestra "Guardar layout" con indicador •

Usuario clic "Guardar layout"
  → usePlantMapLayout.saveLayout()
  → UPSERT plant_map_layouts WHERE project_id + level + parent_id
  → React Query invalida ["plant-map-layout"]
  → Indicador desaparece
```

No se guardan posiciones por cada pixel de drag — solo al confirmar con el botón.

---

## 10. Stats de áreas (avance)

Para el MVP, el porcentaje de completitud por área se calcula en el cliente:

```ts
// equipment ya está cargado en useEquipment(projectId)
// EquipmentStatus real: "pendiente" | "en_ejecucion" | "aprobado" | "rechazado"
//                     | "bloqueado" | "listo_energizacion" | "listo_arranque" | "operativo"
// Cuentan como "completado" para el % de avance: listo_arranque + operativo

const DONE_STATUSES = new Set(['listo_arranque', 'operativo']);

const pctByArea = useMemo(() => {
  // Paso 1: construir lookup subsystem_id → area_id
  // equipment.subsystem_id → subsystem.system_id → system.area_id
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

Requiere tener `systems` y `subsystems` disponibles (ambos ya cargados por `useHierarchy`). Sin query adicional.

---

## 11. Responsive

| Dispositivo | Comportamiento |
|---|---|
| Desktop (≥1024px) | Canvas completo, panel flotante 300px |
| Tablet (768–1023px) | Canvas completo, panel ocupa 100% del ancho en posición `bottom` |
| Móvil (<768px) | Out of scope (la app ya es desktop/tablet) |

---

## 12. Dependencia nueva

```bash
npm install @xyflow/react
```

`@xyflow/react` v12 — compatible con React 18/19 y Next.js 16. Licencia MIT. ~200KB gzipped.

---

## 13. Primer uso (estado vacío)

Cuando `isFirstTime === true` (no hay layout guardado para el proyecto):

1. El canvas muestra las áreas existentes en auto-arrange (grilla por `sort_order`)
2. Banner: *"Arrastrá los nodos para configurar tu mapa de planta y hacé clic en Guardar."*
3. No hay edges — el usuario los dibuja desde los handles de react-flow
4. Una vez guardado, el banner desaparece

---

## 14. Fuera de scope (MVP)

- Subir imagen de fondo (botón presente pero deshabilitado)
- OCR / extracción automática de áreas desde PFD/SVG
- Exportar el diagrama como imagen/PDF
- Modo "solo lectura" para usuarios sin permiso de edición
- Historial de versiones del layout
- Marcadores de equipos individuales sobre el canvas (están en el panel)
- Animaciones de flujo sobre los edges

---

## 15. Archivos a crear

| Archivo | Acción |
|---|---|
| `app/src/app/(workspace)/projects/[projectId]/plant-map/page.tsx` | Crear |
| `app/src/components/plant-map/PlantMapCanvas.tsx` | Crear |
| `app/src/components/plant-map/PlantMapBreadcrumb.tsx` | Crear |
| `app/src/components/plant-map/PlantMapToolbar.tsx` | Crear |
| `app/src/components/plant-map/nodes/PlantAreaNode.tsx` | Crear |
| `app/src/components/plant-map/nodes/PlantSystemNode.tsx` | Crear |
| `app/src/components/plant-map/panel/PlantMapPanel.tsx` | Crear |
| `app/src/components/plant-map/panel/AreaPanelContent.tsx` | Crear |
| `app/src/components/plant-map/panel/EquipmentListContent.tsx` | Crear |
| `app/src/components/plant-map/panel/EquipmentDetailContent.tsx` | Crear |
| `app/src/hooks/usePlantMapLayout.ts` | Crear |
| `app/src/types/index.ts` | Modificar (agregar tipos) |
| `app/src/components/layout/ProjectSidebar.tsx` | Modificar (agregar navItem) |
| `database/migrations/0019_plant_map_layouts.sql` | Crear |

---

## 16. Orden de implementación sugerido

1. Migración 0019 + aplicar en Supabase
2. Tipos nuevos en `index.ts`
3. `usePlantMapLayout` hook
4. `PlantAreaNode` + `PlantSystemNode`
5. `PlantMapCanvas` con react-flow
6. `page.tsx` con estado DrillLevel (nivel 0 funcional)
7. `PlantMapBreadcrumb` + `PlantMapToolbar`
8. Drill-down niveles 1 y 2
9. `PlantMapPanel` con `AreaPanelContent`
10. `EquipmentListContent` + `EquipmentDetailContent`
11. Agregar ítem en `ProjectSidebar`
