# CommissionPro — Digital Twin Inspection MVP
**Fecha:** 2026-06-09  
**Estado:** Aprobado para implementación  
**Proyecto de referencia:** PTAR Bojacá / PTAR Zipaquirá

---

## 1. Visión y contexto

CommissionPro digitaliza el proceso de precomisionamiento de plantas industriales. El modelo central es un **Digital Twin en dos fases**:

- **Fase 1 — Plant Map**: navegación espacial por el plano de la planta. El operador ubica visualmente el equipo, ve su estado de inspección, y accede a la información.
- **Fase 2 — Inspection Form**: formulario dedicado de pantalla completa para ejecutar una plantilla de precomisionamiento sobre un equipo específico.

El plano es siempre el punto de entrada. El formulario es siempre una ruta dedicada — nunca comprimido dentro del plano.

### Hallazgos de Graphify que definen el diseño

El análisis de los 95 formatos de precomisionamiento de PTAR Bojacá reveló:

1. **Secciones universales (comunidad 0, 71 nodos)**: DATOS_GENERALES, INSPECCION_VISUAL, ANCLAJE_NIVELACION, CAMBIOS_DISENO_REDLINE y FIRMAS aparecen en todos los formatos → `is_universal=true` en `template_sections`.
2. **N:M Equipment ↔ Template**: Cable Profibus es inspeccionado por P_ELE_021 (Eléctrica) Y P_I&C_003 (I&C/PLC) → un equipo puede tener múltiples plantillas activas simultáneamente.
3. **30 tipos de equipo**: cada tipo agrupa una configuración de plantillas por defecto (seeded en `equipment_type_templates`).
4. **13 secciones especializadas**: PRUEBA_AISLAMIENTO, LOOP_CHECK, CALIBRACION, etc. se combinan según el tipo de equipo.

---

## 2. Arquitectura general

```
/projects/[projectId]/plant-map          ← Fase 1 (ruta existente, mejorada)
/equipment/[equipmentId]/inspection/[templateId]  ← Fase 2 (nueva ruta)
```

### Flujo completo

```
Plant Map
  │
  ├─ Usuario ve plano JPG con equipos como overlays
  │    Cada overlay muestra: TAG + badge de estado (color)
  │
  ├─ Clic en equipo → FloatingEquipmentPanel aparece sobre el plano
  │    Muestra: tag, nombre, servicio, estado actual
  │    Lista plantillas disponibles para ese equipo (N:M)
  │    Botón "Iniciar Inspección" por cada plantilla pendiente
  │
  └─ "Iniciar Inspección" → navega a /equipment/[id]/inspection/[templateId]

Inspection Form (pantalla completa)
  │
  ├─ Sidebar izquierdo: lista de secciones + % completado por sección
  ├─ Área central: campos de la sección activa (dinámicos por tipo)
  ├─ Franja contextual derecha: mini-mapa fijo (80px)
  ├─ Cabecera: breadcrumb + botón "← Volver al plano"
  │
  ├─ Campos soportados: checkbox OK/FALLA/NA, texto, número+unidad,
  │    textarea, select, fecha, captura fotográfica, firma digital
  │
  └─ Al completar última sección → InspectionSummary (mismo layout)
       Muestra resumen sección a sección + punch items + evidencias
       CTA: "Generar Certificado" → estado equipo pasa a aprobado/rechazado
```

---

## 3. Fase 1 — Plant Map mejorado

### 3.1 Ruta y archivo

**Ruta:** `/projects/[projectId]/plant-map`  
**Archivo:** `app/src/app/(workspace)/projects/[projectId]/plant-map/page.tsx` (existente)

### 3.2 Cambios sobre el estado actual

El plant-map actual ya tiene: zoom/pan, SVG overlay layer, OverlayEditor (portal-based), drill navigation (visual/area/system), PlantMapPanel lateral.

Los cambios necesarios para el MVP:

**a) EquipmentOverlay — badge de estado visual**

Cada overlay de equipo muestra un indicador de color basado en `EquipmentStatus`:

| Status | Color | Significado |
|--------|-------|-------------|
| `pendiente` | Azul (#3b82f6) | Sin iniciar |
| `en_ejecucion` | Amarillo (#f59e0b) | Inspección en curso |
| `aprobado` | Verde (#22c55e) | Completado y aprobado |
| `rechazado` | Rojo (#ef4444) | Rechazado, requiere punch |
| `bloqueado` | Gris (#475569) | Dependencia no resuelta |
| `listo_energizacion` | Cyan (#06b6d4) | Pre-energización OK |

El overlay debe mostrar: TAG en texto, punto de color en esquina superior derecha.

**b) FloatingEquipmentPanel — reemplaza PlantMapPanel para vista detail**

Cuando el usuario hace clic en un equipo, en lugar de abrir el panel lateral fijo, aparece un **panel flotante posicionado cerca del overlay** (similar al popup actual pero más rico):

- Posicionamiento: aparece a la derecha del overlay si hay espacio, sino a la izquierda. Usa `createPortal` en `document.body` (patrón ya establecido en OverlayEditor).
- Contenido:
  - Header: TAG + nombre + badge de estado
  - Info rápida: servicio, disciplina, tipo de equipo
  - **Lista de plantillas disponibles** para ese equipo (de `equipment_templates` + `equipment_type_templates`)
  - Por cada plantilla: nombre, estado (pendiente/en_ejecucion/aprobado), botón de acción
  - Botón "Ver todos los detalles" → ruta `/equipment/[id]` (existente)
- Cierre: clic fuera del panel o tecla Escape.

**c) AreaProgressDashboard — overlay de estadísticas por área**

Cuando el drill level es `area` o `visual`, mostrar en la esquina inferior izquierda un panel colapsable con:

```
Sala Máquinas         ████████░░  8/10 equipos
  Pendiente:  2   En progreso: 3   Aprobado: 4   Rechazado: 1
Sala Eléctrica        ██████░░░░  6/10 equipos
  ...
```

Componente: `AreaProgressDashboard` (nuevo). Se puede minimizar a solo el título.

### 3.3 Componentes afectados

| Componente | Acción |
|------------|--------|
| `PlantVisualMap.tsx` | Añadir `onEquipmentClick` que dispara `FloatingEquipmentPanel` |
| `EquipmentOverlay.tsx` (nuevo o existente) | Badge de estado por color |
| `FloatingEquipmentPanel.tsx` (nuevo) | Panel flotante via portal |
| `AreaProgressDashboard.tsx` (nuevo) | Panel colapsable de progreso |
| `plant-map/page.tsx` | Wiring: estado de panel flotante, navegación a Fase 2 |

---

## 4. Fase 2 — Formulario de inspección dedicado

### 4.1 Ruta

**Nueva ruta:** `/equipment/[equipmentId]/inspection/[templateId]`  
**Archivo:** `app/src/app/(workspace)/equipment/[equipmentId]/inspection/[templateId]/page.tsx`

Esta ruta es completamente independiente del plant-map. No hereda layout del workspace si el sidebar interfiere con el espacio disponible; usar `layout.tsx` propio si necesario.

### 4.2 Layout de pantalla completa

```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER (56px)                                                    │
│ ← Plano  |  BBA-001 — Bomba Centrífuga  ›  P_MEC_001            │
│           breadcrumb con estado actual                           │
├──────────────┬──────────────────────────────────────┬───────────┤
│  SIDEBAR     │  FORM AREA (flex-1)                  │  MINI-MAP │
│  (200px)     │                                      │  (80px)   │
│              │  ┌────────────────────────────────┐  │           │
│ Secciones:   │  │ SECCIÓN ACTIVA                 │  │ [mini     │
│              │  │                                │  │  plano    │
│ ✓ Datos Gen  │  │  campo 1                       │  │  con eq   │
│ ▶ Insp Vis  │  │  campo 2                       │  │  marcado] │
│ ○ Prueba Ai  │  │  campo 3 con evidencia foto    │  │           │
│ ○ Prueba Co  │  │  campo 4                       │  │  TAG:     │
│ ○ Puesta Ti  │  │                                │  │  BBA-001  │
│ ○ Firmas     │  └────────────────────────────────┘  │           │
│              │                                      │           │
│  ─────────── │                                      │           │
│  Progreso:   │                                      │           │
│  ██████░░ 3/5│                                      │           │
├──────────────┴──────────────────────────────────────┴───────────┤
│ FOOTER (52px)                                                    │
│ ← Sección anterior    [auto-guardado ✓]    Siguiente sección →  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 SectionSidebar

**Archivo:** `app/src/components/inspection/SectionSidebar.tsx`

- Renderiza la lista de secciones de la plantilla activa en orden
- Secciones universales (`is_universal=true`) siempre presentes al inicio y al final (DATOS_GENERALES primero, FIRMAS último)
- Por cada sección: icono de estado (✓ completo / ▶ activa / ○ pendiente / ✗ con fallos)
- Clic en sección → navega a esa sección (actualiza sección activa en estado local)
- Footer del sidebar: barra de progreso global (campos completados / total)
- En móvil: sidebar se convierte en dropdown colapsable en la cabecera

### 4.4 DynamicFormSection

**Archivo:** `app/src/components/inspection/DynamicFormSection.tsx`

Renderiza todos los campos de una sección según su `type`. Tipos de campo y su renderer:

| `field_type` en DB | Renderer | Notas |
|-------------------|----------|-------|
| `text` | Input texto | |
| `number` | Input numérico + label de unidad | unidad en `validations.unit` |
| `date` | Date picker | |
| `select` | Select nativo | opciones en `options[]` |
| `checkbox` | Botones OK / FALLA / N/A | estilo toggle, no checkbox nativo |
| `textarea` | Textarea expandible | aparece obligatorio si campo anterior = FALLA |
| `signature` | SignaturePad component | lienzo táctil |
| `imagen` | EvidenceCapture | ver sección 4.5 |

Reglas de visibilidad:
- Si un campo `checkbox` tiene valor FALLA → el siguiente campo `textarea` de observación se vuelve `required` y resalta en rojo.
- Los campos `required` sin completar bloquean el avance al siguiente paso en FIRMAS.

### 4.5 EvidenceCapture

**Archivo:** `app/src/components/inspection/EvidenceCapture.tsx`

Soporte nativo de evidencias fotográficas por campo o por sección:

- **Trigger:** botón de cámara (📷) anclado a cualquier campo o al footer de la sección.
- **Fuentes:** cámara del dispositivo (`input type=file accept=image/* capture=environment`) + carga desde galería.
- **Almacenamiento del prototipo:** `URL.createObjectURL()` — los blobs viven en memoria de la sesión. En producción serán subidos a Supabase Storage.
- **Metadatos por evidencia:** `{ fieldKey, stage: 'antes'|'durante'|'despues'|'general', caption, timestamp, url }` — alineado con la tabla `evidences` existente.
- **Visualización:** thumbnails en línea bajo el campo. Tap para ver tamaño completo.
- **Límites del prototipo:** máx 5 fotos por sección, sin compresión.

### 4.6 InspectionSummary

**Archivo:** `app/src/components/inspection/InspectionSummary.tsx`

Pantalla final antes de firmar. Usa el mismo layout (sidebar + área central + mini-mapa):

- Resumen por sección: lista todos los campos con su valor y cualquier evidencia.
- Punch items detectados: campos con FALLA que generaron observación → cada uno puede elevarse a punch item.
- Resultado global: APROBADO (todos los campos requeridos OK) o RECHAZADO (al menos un campo FALLA).
- CTA principal: "Generar Certificado y Cerrar" → actualiza estado del equipo.

---

## 5. Modelo de datos

### 5.1 Tablas involucradas (migración 0021 — pendiente de ejecución)

```
equipment_types          catálogo de 30 tipos
template_sections        13 secciones (4 universales + FIRMAS)
section_fields           campos por sección
form_template_sections   N:M plantilla ↔ sección
equipment_type_templates N:M tipo_equipo ↔ plantilla (asignación por defecto)
equipment_templates      N:M equipo ↔ plantilla (asignación directa, override)
certificates             1:1 con tests completados
dossiers / dossier_items agrupación de certificados por área/sistema
```

### 5.2 Tablas existentes que se usan

```
equipment         (con nueva columna equipment_type_id de 0021)
form_templates    plantillas (nombre, código, disciplina)
tests             instancia de ejecución de una plantilla sobre un equipo
                  tests.data jsonb → respuestas {fieldKey: value}
evidences         fotos/videos anclados a un test
checklist_items   ítems OK/FALLA/NA dentro del test
punch_items       fallos elevados para seguimiento
signatures        firmas digitales al cerrar
```

### 5.3 Resolución de plantillas para un equipo

La función `get_equipment_templates(equipment_id)` (definida en 0021) devuelve las plantillas disponibles siguiendo esta prioridad:

1. Asignaciones directas en `equipment_templates` (más específico)
2. Asignaciones por tipo en `equipment_type_templates` donde `equipment.equipment_type_id` coincide
3. Siempre incluye las secciones `is_universal=true` de `template_sections`

### 5.4 Resolución de secciones para una plantilla

La función `get_template_sections(template_id)` devuelve secciones ordenadas:

```
[secciones universales al inicio] + [secciones específicas de la plantilla] + [FIRMAS al final]
```

Las secciones universales no necesitan estar en `form_template_sections` — se inyectan automáticamente.

---

## 6. Estado local del prototipo (mock data)

El prototipo no usa Supabase ni auth. Todo el estado vive en React con `useState` / `useReducer`.

### 6.1 Estructura de mock data

```typescript
// Equipos con estado precargado
mockEquipments: Equipment[]  // ~10 equipos de Bojacá con status variados

// Plantillas con sus secciones
mockTemplates: {
  id: string
  code: string           // P_ELE_002, P_MEC_001, P_I&C_003
  name: string
  discipline: string
  sections: MockSection[]
}[]

// Secciones con campos (basadas en seed de 0021)
MockSection: {
  id: string
  code: string           // INSPECCION_VISUAL, etc.
  name: string
  is_universal: boolean
  fields: MockField[]
}

MockField: {
  key: string
  label: string
  // Usa los valores de FieldType de index.ts (español): "texto"|"numero"|"checkbox"|"textarea"|"select"|"fecha"|"firma"|"imagen"
  type: FieldType
  required: boolean
  options?: string[]
  validations?: { unit?: string; min?: number; max?: number }
  hint?: string
}
```

### 6.2 Estado de una inspección en curso

```typescript
interface InspectionState {
  equipmentId: string
  templateId: string
  activeSectionIndex: number
  answers: Record<string, unknown>          // { [fieldKey]: value }
  evidences: Record<string, EvidenceItem[]> // { [fieldKey]: fotos[] }
  sectionStatus: Record<string, 'pending' | 'in_progress' | 'complete' | 'failed'>
  savedAt: Date | null
  isDirty: boolean
}
```

El estado persiste en `sessionStorage` bajo la clave `inspection_${equipmentId}_${templateId}` para sobrevivir navegaciones entre secciones sin perder datos.

---

## 7. Rutas de navegación

| Ruta | Descripción | Estado |
|------|-------------|--------|
| `/projects/[id]/plant-map` | Fase 1: plano + panel flotante | Existente, mejorar |
| `/equipment/[id]/inspection/[templateId]` | Fase 2: formulario completo | Nueva |
| `/equipment/[id]/inspection/[templateId]/summary` | Resumen antes de cerrar | Nueva (sub-ruta) |

La navegación desde el formulario de vuelta al plano preserva la posición del mapa (zoom + pan) vía `sessionStorage` o query params.

---

## 8. Componentes — lista completa

### Nuevos componentes

| Componente | Ruta | Responsabilidad |
|------------|------|-----------------|
| `FloatingEquipmentPanel` | `components/plant-map/panel/FloatingEquipmentPanel.tsx` | Panel flotante sobre el plano con info de equipo + lista de plantillas |
| `AreaProgressDashboard` | `components/plant-map/AreaProgressDashboard.tsx` | Estadísticas de progreso por área, colapsable |
| `SectionSidebar` | `components/inspection/SectionSidebar.tsx` | Lista de secciones + estado + progreso global |
| `DynamicFormSection` | `components/inspection/DynamicFormSection.tsx` | Renderizador dinámico de campos por sección |
| `FieldRenderer` | `components/inspection/FieldRenderer.tsx` | Switch de tipo: cada tipo de campo tiene su sub-componente |
| `EvidenceCapture` | `components/inspection/EvidenceCapture.tsx` | Captura y preview de fotos por campo/sección |
| `InspectionSummary` | `components/inspection/InspectionSummary.tsx` | Pantalla de resumen antes de firmar |
| `InspectionMiniMap` | `components/inspection/InspectionMiniMap.tsx` | Franja contextual derecha con el equipo marcado |
| `CheckboxField` | `components/inspection/fields/CheckboxField.tsx` | Toggle OK/FALLA/N/A |
| `SignatureField` | `components/inspection/fields/SignatureField.tsx` | Lienzo de firma táctil |

### Componentes existentes a modificar

| Componente | Cambio |
|------------|--------|
| `EquipmentOverlay.tsx` | Añadir badge de color por `EquipmentStatus` |
| `PlantVisualMap.tsx` | `onEquipmentClick` dispara `FloatingEquipmentPanel` en lugar del panel lateral |
| `plant-map/page.tsx` | Gestión de panel flotante; botón "Iniciar Inspección" navega a Fase 2 |

---

## 9. Evidencias fotográficas — flujo detallado

```
Usuario está en DynamicFormSection
  │
  ├─ Ve campo con botón 📷 (siempre disponible en imagen-type fields,
  │   opcional en cualquier campo vía botón "Añadir evidencia")
  │
  └─ Toca 📷 → EvidenceCapture se abre como modal o inline expandido
       │
       ├─ Opción A: Cámara directa (capture=environment)
       │    → input[type=file] — dispara cámara nativa del dispositivo
       │    → archivo seleccionado → URL.createObjectURL()
       │
       ├─ Opción B: Galería
       │    → input[type=file] sin capture — abre galería
       │
       └─ Resultado: EvidenceItem guardado en InspectionState.evidences[fieldKey]
            { url: string (blob URL), caption: '', stage: 'general', timestamp }
            Thumbnail aparece inline bajo el campo
            En InspectionSummary: todas las evidencias agrupadas por sección
```

En producción, el blob se sube a `Supabase Storage → precom-evidences/{projectId}/{equipmentId}/{testId}/` y la URL del blob se reemplaza por la URL pública. El tipo `Evidence` en `index.ts` ya contempla este flujo.

---

## 10. Dashboard de avance por área

El `AreaProgressDashboard` calcula en tiempo real (mock data en el prototipo):

```typescript
interface AreaProgress {
  areaId: string
  areaName: string
  totalEquipments: number
  byStatus: Record<EquipmentStatus, number>
  completionPercent: number   // (aprobado + rechazado) / total * 100
  criticalBlocked: number     // equipos críticos bloqueados
}
```

Se renderiza como un panel colapsable anclado al `bottom-left` del viewport sobre el plano. En expandido muestra barras de progreso por área. En minimizado muestra solo un chip con el % global del proyecto.

---

## 11. Limitaciones del prototipo (a resolver antes del MVP en producción)

| Limitación | Impacto | Resolución post-prototipo |
|------------|---------|---------------------------|
| Mock data hardcoded | No refleja datos reales de Zipaquirá/Bojacá | Conectar a Supabase + migración 0021 |
| Blobs en memoria (fotos) | Se pierden al recargar | Subir a Supabase Storage |
| Sin auth | Cualquiera puede abrir cualquier equipo | Middleware de auth existente |
| sessionStorage para estado | Se pierde al cerrar tab | Persistir en `tests.data` jsonb |
| Sin firmas reales | SignatureField es stub | Integrar canvas-to-base64 + tabla `signatures` |
| Sin punch items reales | Los FALLA no generan punch_items en DB | POST a `punch_items` al cerrar |

---

## 12. Criterios de validación del prototipo

El prototipo valida el diseño si:

1. Un usuario puede navegar desde el plano → clic en equipo → panel flotante → "Iniciar Inspección" en menos de 3 clics.
2. El formulario de inspección se ve y funciona correctamente en pantalla de laptop (1366×768) y tablet (768×1024) sin scroll horizontal.
3. Las secciones universales (Datos Generales, Inspección Visual, Firmas) aparecen automáticamente en cualquier plantilla sin configuración manual.
4. Se puede capturar una foto y verla como thumbnail en el campo correspondiente.
5. Al completar todos los campos requeridos, el botón "Generar Certificado" se habilita.
6. El estado del equipo cambia visualmente en el plano (badge de color) al volver desde el formulario.

---

## 13. Orden de implementación recomendado

1. **Mock data** — definir `mockEquipments`, `mockTemplates`, `mockSections` con datos reales de Bojacá.
2. **Ruta `/equipment/[id]/inspection/[templateId]`** — layout vacío con header + sidebar stub + área central.
3. **SectionSidebar** — lista de secciones, estado, progreso.
4. **DynamicFormSection + FieldRenderer** — campos básicos primero (text, checkbox OK/FALLA/NA, textarea).
5. **FloatingEquipmentPanel** — panel flotante en plant-map, wiring con la nueva ruta.
6. **Badge de estado en EquipmentOverlay** — color por EquipmentStatus.
7. **EvidenceCapture** — captura fotográfica.
8. **InspectionSummary** — pantalla de cierre.
9. **AreaProgressDashboard** — estadísticas colapsables.
10. **InspectionMiniMap** — franja contextual (puede ser último, es cosmético).
