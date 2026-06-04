# TAG Search Modal — Design Spec

**Fecha:** 2026-06-04
**Feature:** Buscador de TAGs con navegación a edición
**Pantallas afectadas:** Equipment, Engineering

---

## Objetivo

Agregar un botón **"Buscar TAG"** en las pantallas de Equipos e Ingeniería que abre un modal de consulta. El modal busca el TAG ingresado en paralelo en `equipment` y `engineering_extracted_tags`, muestra una ficha read-only con los datos encontrados, y ofrece botones de navegación directa a la pantalla de edición correspondiente.

---

## Comportamiento

### Disparo
- Botón "🔍 Buscar TAG" en la barra de acciones de ambas pantallas
- Abre un modal centrado con overlay
- Se cierra con ESC, clic fuera, o clic en ✕

### Búsqueda
- Input de texto libre dentro del modal
- Se dispara al presionar **Enter** o hacer clic en **"Buscar"**
- Tipo de búsqueda: **parcial, case-insensitive** (`ILIKE '%query%'` en ambas tablas)
- Las dos consultas corren en paralelo (TanStack Query)
- Si hay múltiples coincidencias en una tabla, muestra lista de resultados para seleccionar uno
- Si hay exactamente un resultado en una tabla, lo muestra directamente

### Estados del modal

| Situación | UI |
|-----------|-----|
| Inicial (sin búsqueda) | Solo input + botón Buscar |
| Cargando | Spinner en el input / resultado |
| TAG en ambas fuentes | Sección EQUIPO (azul) + sección TAG EXTRAÍDO (amarillo) + 2 botones de navegación |
| Solo en `equipment` | Sección EQUIPO + botón "↗ Editar Equipo" |
| Solo en `extracted_tags` | Sección TAG EXTRAÍDO + botón "↗ Revisar TAG" |
| No encontrado | Mensaje "No existe en ninguna fuente" con el TAG buscado |
| Error de red | Mensaje de error con opción de reintentar |

### Datos mostrados

**Sección EQUIPO** (`equipment`):
- tag, name
- Sistema / Subsistema (o "Sin clasificar" en naranja si `metadata.unclassified = true`)
- io_type, rtu_destination, service
- Origen: badge "Importado desde Excel" si `metadata.from_excel`, "Desde TAG" si `metadata.from_tag`

**Sección TAG EXTRAÍDO** (`engineering_extracted_tags`):
- tag, description
- Estado: badge con color (pending_review / approved / rejected / merged)
- detected_type, tag_confidence (porcentaje)
- Documento fuente (nombre del documento)

### Navegación
- **"↗ Editar Equipo"** → cierra modal, navega a `/projects/[projectId]/equipment?tag=<TAG>`
- **"↗ Revisar TAG"** → cierra modal, navega a `/projects/[projectId]/engineering?tag=<TAG>`
- Ambas pantallas leen el query param `?tag=` al montarse y pre-filtran su lista

---

## Arquitectura

### Nuevo hook: `useTagLookup`

```
app/src/hooks/useTagLookup.ts
```

- `useTagLookup(projectId, query)` — disabled cuando `query` está vacío
- Ejecuta dos queries en paralelo con TanStack Query:
  1. `equipment`: `SELECT id, tag, name, subsystem_id, io_type, rtu_destination, service, metadata FROM equipment WHERE project_id = ? AND tag ILIKE '%query%' AND deleted_at IS NULL ORDER BY tag LIMIT 20`
  2. `engineering_extracted_tags`: `SELECT id, tag, description, detected_type, tag_confidence, status, document_id FROM engineering_extracted_tags WHERE project_id = ? AND tag ILIKE '%query%' ORDER BY tag LIMIT 20`
- Para resolver nombre del subsistema, join o lookup en `subsystems` + `systems`
- Para resolver nombre del documento, lookup en `documents` por `document_id`
- Devuelve `{ equipment: EquipmentRow[], tags: ExtractedTagRow[], isLoading, error }`

### Nuevo componente: `TagSearchModal`

```
app/src/components/shared/TagSearchModal.tsx
```

- Props: `projectId: string`, `isOpen: boolean`, `onClose: () => void`
- `"use client"` — componente cliente
- Estado interno: `query: string`, `submitted: string` (el query que se buscó)
- Usa `useTagLookup(projectId, submitted)` — solo busca cuando `submitted` no está vacío
- Renderiza overlay + modal centrado
- Cierre: ESC (keydown listener), clic en overlay, botón ✕
- Botones de navegación usan `useRouter()` para navegar y llaman `onClose()`

### Modificaciones a páginas existentes

**`equipment/page.tsx`**
- Agrega import de `TagSearchModal`
- Agrega estado `isTagSearchOpen: boolean`
- Agrega botón "🔍 Buscar TAG" en la barra de acciones
- Lee `searchParams.tag` al montarse → si existe, aplica como filtro inicial de la tabla

**`engineering/page.tsx`**
- Idéntico al anterior
- La pantalla ya tiene filtro de TAG en `TagReviewTable` — conectar `searchParams.tag` al estado de filtro existente

---

## Acceso a datos

El hook `useTagLookup` usa el cliente Supabase del lado cliente (no API route), con el JWT del usuario autenticado. RLS ya está configurado en ambas tablas — el usuario solo verá equipos y TAGs de sus proyectos.

Para resolver el nombre del subsistema/sistema de un equipo sin clasificar, el hook devuelve la cadena literal `"Sin clasificar"` cuando `metadata.unclassified === true`, sin hacer join extra.

Para el nombre del documento fuente de un tag extraído, se hace un segundo query a `documents` solo si hay resultados en `extracted_tags`.

---

## Out of scope

- Edición inline desde el modal (futuro sprint)
- Búsqueda global entre proyectos
- Filtro por tipo/estado dentro del modal
- Exportar resultados de búsqueda
