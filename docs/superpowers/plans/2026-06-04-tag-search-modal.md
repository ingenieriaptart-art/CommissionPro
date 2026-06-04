# TAG Search Modal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar un botón "Buscar TAG" en las pantallas de Equipos e Ingeniería que abre un modal read-only con resultados de ambas tablas (`equipment` y `engineering_extracted_tags`) y botones de navegación directa a la pantalla de edición.

**Architecture:** Hook `useTagLookup` hace dos queries Supabase en paralelo (client-side, RLS filtra por proyecto). El componente `TagSearchModal` es reutilizable y recibe `projectId` como prop. Ambas páginas agregan el botón, el estado del modal, y leen el query param `?tag=` para pre-filtrar su lista cuando se navega desde el modal.

**Tech Stack:** TypeScript, Next.js 16 App Router (`"use client"`), TanStack Query v5, Supabase anon client, Tailwind CSS, Lucide React, `next/navigation`.

---

## File Map

| Acción | Archivo | Responsabilidad |
|--------|---------|----------------|
| CREATE | `app/src/hooks/useTagLookup.ts` | Dos queries en paralelo: equipment + extracted_tags |
| CREATE | `app/src/components/shared/TagSearchModal.tsx` | Modal reutilizable con input, resultados y botones de navegación |
| MODIFY | `app/src/app/(workspace)/projects/[projectId]/equipment/page.tsx` | Botón + modal + leer `?tag=` al montar |
| MODIFY | `app/src/app/(workspace)/projects/[projectId]/engineering/page.tsx` | Botón + modal + filtrar tags por `?tag=` |

---

## Task 1: Hook `useTagLookup`

**Files:**
- Create: `app/src/hooks/useTagLookup.ts`

- [ ] **Step 1: Crear el hook**

Crea `app/src/hooks/useTagLookup.ts` con este contenido:

```typescript
import { useQuery }     from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface EquipmentLookup {
  id: string;
  tag: string;
  name: string;
  io_type: string | null;
  rtu_destination: string | null;
  service: string | null;
  status: string;
  unclassified: boolean;
  subsystem_name: string | null;
  system_name: string | null;
  from_excel: boolean;
  from_tag: boolean;
}

export interface ExtractedTagLookup {
  id: string;
  tag: string;
  description: string | null;
  detected_type: string;
  tag_confidence: number;
  status: string;
  document_name: string | null;
}

export interface TagLookupResult {
  equipment: EquipmentLookup[];
  extractedTags: ExtractedTagLookup[];
}

export function useTagLookup(projectId: string, query: string) {
  return useQuery<TagLookupResult>({
    queryKey: ["tag-lookup", projectId, query],
    enabled:  query.trim().length >= 2,
    staleTime: 30_000,
    queryFn: async () => {
      const q = query.trim().toUpperCase();

      const [eqRes, tagRes] = await Promise.all([
        supabase
          .from("equipment")
          .select(`
            id, tag, name, io_type, rtu_destination, service, status, metadata,
            subsystems ( name, systems ( name ) )
          `)
          .eq("project_id", projectId)
          .ilike("tag", `%${q}%`)
          .is("deleted_at", null)
          .order("tag")
          .limit(20),

        supabase
          .from("engineering_extracted_tags")
          .select(`
            id, tag, description, detected_type, tag_confidence, status,
            documents ( name )
          `)
          .eq("project_id", projectId)
          .ilike("tag", `%${q}%`)
          .order("tag")
          .limit(20),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const equipment: EquipmentLookup[] = (eqRes.data ?? []).map((e: any) => {
        const meta = (e.metadata ?? {}) as Record<string, unknown>;
        return {
          id:             e.id,
          tag:            e.tag,
          name:           e.name,
          io_type:        e.io_type,
          rtu_destination: e.rtu_destination,
          service:        e.service,
          status:         e.status,
          unclassified:   meta.unclassified === true,
          subsystem_name: meta.unclassified ? "Sin clasificar" : (e.subsystems?.name ?? null),
          system_name:    meta.unclassified ? null            : (e.subsystems?.systems?.name ?? null),
          from_excel:     meta.from_excel === true,
          from_tag:       meta.from_tag   === true,
        };
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const extractedTags: ExtractedTagLookup[] = (tagRes.data ?? []).map((t: any) => ({
        id:            t.id,
        tag:           t.tag,
        description:   t.description,
        detected_type: t.detected_type,
        tag_confidence: t.tag_confidence,
        status:        t.status,
        document_name: t.documents?.name ?? null,
      }));

      return { equipment, extractedTags };
    },
  });
}
```

- [ ] **Step 2: Verificar TypeScript**

```
cd app && npx tsc --noEmit
```
Resultado esperado: exit 0.

- [ ] **Step 3: Commit**

```bash
git add app/src/hooks/useTagLookup.ts
git commit -m "feat: hook useTagLookup — consulta equipment + extracted_tags en paralelo"
```

---

## Task 2: Componente `TagSearchModal`

**Files:**
- Create: `app/src/components/shared/TagSearchModal.tsx`

> **Nota:** Verifica que `app/src/components/shared/` exista. Si no, créalo.

- [ ] **Step 1: Crear el componente**

Crea `app/src/components/shared/TagSearchModal.tsx`:

```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter }    from "next/navigation";
import { Search, X, Loader2, AlertCircle } from "lucide-react";
import { useTagLookup, EquipmentLookup, ExtractedTagLookup } from "@/hooks/useTagLookup";

interface TagSearchModalProps {
  projectId: string;
  isOpen:    boolean;
  onClose:   () => void;
}

const TAG_STATUS_STYLES: Record<string, string> = {
  pending_review: "bg-amber-100 text-amber-700",
  approved:       "bg-emerald-100 text-emerald-700",
  rejected:       "bg-red-100 text-red-700",
  merged:         "bg-blue-100 text-blue-700",
};

const TAG_STATUS_LABELS: Record<string, string> = {
  pending_review: "Pendiente",
  approved:       "Aprobado",
  rejected:       "Rechazado",
  merged:         "Fusionado",
};

export function TagSearchModal({ projectId, isOpen, onClose }: TagSearchModalProps) {
  const router           = useRouter();
  const inputRef         = useRef<HTMLInputElement>(null);
  const [input, setInput]     = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data, isLoading, isError } = useTagLookup(projectId, submitted);

  // Focus input al abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setInput("");
      setSubmitted("");
    }
  }, [isOpen]);

  // Cerrar con ESC
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  function handleSearch() {
    if (input.trim().length >= 2) setSubmitted(input.trim());
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSearch();
  }

  function navigateTo(path: string) {
    onClose();
    router.push(path);
  }

  const noResults =
    submitted &&
    !isLoading &&
    !isError &&
    data?.equipment.length === 0 &&
    data?.extractedTags.length === 0;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div>
            <p className="font-bold text-slate-900 dark:text-slate-100 text-base">Consultar TAG</p>
            <p className="text-slate-400 text-xs mt-0.5">Busca en equipos y TAGs pendientes de revisión</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X size={18} />
          </button>
        </div>

        {/* Input de búsqueda */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                placeholder="Ej: FT-0101"
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={input.trim().length < 2}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Buscar
            </button>
          </div>
          {input.trim().length > 0 && input.trim().length < 2 && (
            <p className="text-xs text-slate-400 mt-1 pl-1">Ingresá al menos 2 caracteres</p>
          )}
        </div>

        {/* Resultados */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {isLoading && (
            <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Buscando...</span>
            </div>
          )}

          {isError && (
            <div className="flex items-center gap-2 text-red-500 text-sm py-4">
              <AlertCircle size={16} />
              Error al buscar. Intentá de nuevo.
            </div>
          )}

          {noResults && (
            <div className="text-center py-8">
              <Search size={32} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">
                No se encontró <span className="font-mono font-bold text-slate-700">"{submitted}"</span>
              </p>
              <p className="text-slate-400 text-xs mt-1">No existe en equipos ni en bandeja de TAGs</p>
            </div>
          )}

          {/* Sección: Equipos */}
          {(data?.equipment.length ?? 0) > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  EQUIPO{data!.equipment.length > 1 ? "S" : ""}
                </span>
                <span className="text-slate-400 text-xs">{data!.equipment.length} resultado(s)</span>
              </div>
              <div className="space-y-2">
                {data!.equipment.map((eq) => (
                  <EquipmentCard key={eq.id} eq={eq} />
                ))}
              </div>
            </div>
          )}

          {/* Sección: TAGs extraídos */}
          {(data?.extractedTags.length ?? 0) > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  TAG{data!.extractedTags.length > 1 ? "S" : ""} EXTRAÍDO{data!.extractedTags.length > 1 ? "S" : ""}
                </span>
                <span className="text-slate-400 text-xs">{data!.extractedTags.length} resultado(s)</span>
              </div>
              <div className="space-y-2">
                {data!.extractedTags.map((t) => (
                  <ExtractedTagCard key={t.id} tag={t} />
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer con botones de navegación */}
        {submitted && !isLoading && !noResults && (
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex gap-2 flex-shrink-0">
            {(data?.equipment.length ?? 0) > 0 && (
              <button
                onClick={() =>
                  navigateTo(
                    `/projects/${projectId}/equipment?tag=${encodeURIComponent(submitted)}`
                  )
                }
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition flex items-center justify-center gap-1.5"
              >
                ↗ Editar Equipo
              </button>
            )}
            {(data?.extractedTags.length ?? 0) > 0 && (
              <button
                onClick={() =>
                  navigateTo(
                    `/projects/${projectId}/engineering?tag=${encodeURIComponent(submitted)}`
                  )
                }
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition flex items-center justify-center gap-1.5"
              >
                ↗ Revisar TAG
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

function EquipmentCard({ eq }: { eq: EquipmentLookup }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
      <div className="flex items-start justify-between mb-2">
        <p className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">{eq.tag}</p>
        {eq.from_excel && (
          <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">Excel</span>
        )}
        {eq.from_tag && (
          <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">TAG</span>
        )}
      </div>
      <p className="text-slate-700 dark:text-slate-300 text-sm mb-2">{eq.name}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <Row label="Sistema">
          {eq.unclassified ? (
            <span className="text-orange-500 font-medium">Sin clasificar</span>
          ) : (
            <span>{eq.system_name ?? "—"}</span>
          )}
        </Row>
        <Row label="Subsistema">
          <span>{eq.unclassified ? "—" : (eq.subsystem_name ?? "—")}</span>
        </Row>
        {eq.io_type         && <Row label="io_type"><span>{eq.io_type}</span></Row>}
        {eq.rtu_destination && <Row label="RTU"><span>{eq.rtu_destination}</span></Row>}
        {eq.service         && <Row label="Servicio"><span className="truncate">{eq.service}</span></Row>}
      </div>
    </div>
  );
}

function ExtractedTagCard({ tag }: { tag: ExtractedTagLookup }) {
  const statusStyle = TAG_STATUS_STYLES[tag.status] ?? "bg-slate-100 text-slate-600";
  const statusLabel = TAG_STATUS_LABELS[tag.status] ?? tag.status;

  return (
    <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">{tag.tag}</p>
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusStyle}`}>
          {statusLabel}
        </span>
      </div>
      {tag.description && (
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-2 truncate">{tag.description}</p>
      )}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <Row label="Tipo"><span>{tag.detected_type}</span></Row>
        <Row label="Confianza"><span>{Math.round(tag.tag_confidence * 100)}%</span></Row>
        {tag.document_name && (
          <Row label="Documento"><span className="truncate col-span-1">{tag.document_name}</span></Row>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <span className="text-slate-400 font-medium">{label}:</span>
      <span className="text-slate-700 dark:text-slate-300">{children}</span>
    </>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

```
cd app && npx tsc --noEmit
```
Resultado esperado: exit 0.

- [ ] **Step 3: Commit**

```bash
git add app/src/components/shared/TagSearchModal.tsx
git commit -m "feat: componente TagSearchModal — búsqueda read-only con navegación a edición"
```

---

## Task 3: Integrar en pantalla de Equipos

**Files:**
- Modify: `app/src/app/(workspace)/projects/[projectId]/equipment/page.tsx`

**Contexto actual de la página:**
- Línea 2: `import { use, useState } from "react";` — no tiene `useSearchParams` ni `useRouter`
- Línea 20: `const [search, setSearch] = useState("");` — ya existe un filtro de búsqueda
- Línea 10: `import { Plus, Wrench, Search } from "lucide-react";` — ya importa `Search`
- El filtro `search` ya filtra la grilla de equipos por tag/nombre

- [ ] **Step 1: Actualizar imports**

Reemplaza la línea 2 y agrega los nuevos imports. El bloque de imports al inicio del archivo debe quedar así:

```typescript
"use client";
import { use, useState }          from "react";
import { useSearchParams }         from "next/navigation";
import { useEquipment, useCreateEquipment } from "@/hooks/useEquipment";
import { TagSearchModal }          from "@/components/shared/TagSearchModal";
import { Card }                    from "@/components/ui/Card";
import { Button }                  from "@/components/ui/Button";
import { Input }                   from "@/components/ui/Input";
import { Select }                  from "@/components/ui/Select";
import { EquipmentStatusBadge }    from "@/components/ui/StatusBadge";
import { Badge }                   from "@/components/ui/Badge";
import { Plus, Wrench, Search as SearchIcon, ScanSearch } from "lucide-react";
import type { Equipment, Criticality } from "@/types";
```

> **Nota:** `Search` pasa a llamarse `SearchIcon` para evitar conflicto con el componente Input. Verifica si `Search` se usa en otro lugar del archivo y actualiza las referencias.

- [ ] **Step 2: Inicializar `search` desde query param y agregar estado del modal**

Reemplaza el bloque de estados al inicio de `EquipmentPage` (actualmente líneas 16-20):

```typescript
export default function EquipmentPage({ params }: Props) {
  const { projectId }   = use(params);
  const searchParams    = useSearchParams();
  const { data: equipment = [], isLoading } = useEquipment(projectId);
  const createEquipment = useCreateEquipment();

  const [search, setSearch]           = useState(searchParams.get("tag") ?? "");
  const [showForm, setShowForm]       = useState(false);
  const [tagSearchOpen, setTagSearchOpen] = useState(false);
```

- [ ] **Step 3: Agregar botón "Buscar TAG" en la barra de acciones**

Reemplaza el bloque del header (el `<div className="flex items-center justify-between flex-wrap gap-3">`) con:

```tsx
<div className="flex items-center justify-between flex-wrap gap-3">
  <div>
    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Equipos</h1>
    <p className="text-slate-500 text-sm mt-1">{filtered.length} equipo(s)</p>
  </div>
  <div className="flex items-center gap-2">
    <Button
      variant="ghost"
      icon={<ScanSearch size={16} />}
      onClick={() => setTagSearchOpen(true)}
    >
      Buscar TAG
    </Button>
    <Button icon={<Plus size={16} />} onClick={() => setShowForm(true)}>
      Nuevo equipo
    </Button>
  </div>
</div>
```

- [ ] **Step 4: Agregar el modal al JSX**

Justo antes del `return` cierre (`</div>` final), agrega el modal:

```tsx
      <TagSearchModal
        projectId={projectId}
        isOpen={tagSearchOpen}
        onClose={() => setTagSearchOpen(false)}
      />
    </div>
  );
```

- [ ] **Step 5: Verificar TypeScript**

```
cd app && npx tsc --noEmit
```
Resultado esperado: exit 0. Si hay error por `Search` renombrado a `SearchIcon`, busca todos los usos de `<Search` en el archivo y reemplázalos por `<SearchIcon`.

- [ ] **Step 6: Commit**

```bash
git add "app/src/app/(workspace)/projects/[projectId]/equipment/page.tsx"
git commit -m "feat: botón Buscar TAG + TagSearchModal en pantalla de Equipos"
```

---

## Task 4: Integrar en pantalla de Ingeniería

**Files:**
- Modify: `app/src/app/(workspace)/projects/[projectId]/engineering/page.tsx`

**Contexto actual de la página:**
- Línea 3: ya tiene `import { useSearchParams } from "next/navigation";`
- Línea 19: ya lee `docIdFromQuery = searchParams.get("document")`
- Los `tags` cargados con `useExtractedTags` se pasan directamente a `<TagReviewTable>`
- `TagReviewTable` recibe `tags` como prop — filtraremos antes de pasarlos

- [ ] **Step 1: Agregar import de TagSearchModal y ScanSearch**

En la línea de imports de lucide-react (línea 12), agrega `ScanSearch`:
```typescript
import {
  CheckCircle, XCircle, Clock, GitMerge, Tag, Layers, ScanSearch,
} from "lucide-react";
```

Agrega el import del modal (después de los otros imports de componentes):
```typescript
import { TagSearchModal } from "@/components/shared/TagSearchModal";
```

- [ ] **Step 2: Agregar lectura de `?tag=` y estado del modal**

Después de la línea `const docIdFromQuery = searchParams.get("document") ?? undefined;`, agrega:

```typescript
  const tagFromQuery = searchParams.get("tag") ?? "";
```

Después de `const [selectedDoc, setSelectedDoc] = useState<string>(docIdFromQuery ?? "");`, agrega:

```typescript
  const [tagFilter, setTagFilter]         = useState<string>(tagFromQuery);
  const [tagSearchOpen, setTagSearchOpen] = useState(false);
```

- [ ] **Step 3: Sincronizar tagFilter con query param**

Agrega un `useEffect` para sincronizar `tagFilter` cuando cambia el query param (por ejemplo, cuando se navega desde el modal). Colócalo junto al `useEffect` existente de `docIdFromQuery`:

```typescript
  useEffect(() => {
    if (tagFromQuery) setTagFilter(tagFromQuery); // eslint-disable-line react-hooks/set-state-in-effect
  }, [tagFromQuery]);
```

- [ ] **Step 4: Filtrar tags por tagFilter**

Después de la línea `const completedDocs = docs.filter(...)`, agrega:

```typescript
  const filteredTags = tagFilter
    ? tags.filter((t) => t.tag.toUpperCase().includes(tagFilter.toUpperCase()))
    : tags;
```

- [ ] **Step 5: Agregar botón y banner de filtro activo en el header**

Reemplaza el bloque `{/* Header */}` con:

```tsx
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Bandeja de Revisión de Ingeniería
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Revisa, aprueba o rechaza los TAGs extraídos de los documentos del proyecto
          </p>
          {tagFilter && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                Filtro: {tagFilter}
              </span>
              <button
                onClick={() => setTagFilter("")}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Limpiar
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => setTagSearchOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-lg transition"
        >
          <ScanSearch size={15} />
          Buscar TAG
        </button>
      </div>
```

- [ ] **Step 6: Pasar `filteredTags` a TagReviewTable**

Reemplaza `tags={tags}` en `<TagReviewTable>` por `tags={filteredTags}`:

```tsx
        <TagReviewTable
          tags={filteredTags}
          projectId={projectId}
          loading={isLoading}
        />
```

- [ ] **Step 7: Agregar el modal al JSX**

Agrega el modal justo antes del `</div>` final del return:

```tsx
      <TagSearchModal
        projectId={projectId}
        isOpen={tagSearchOpen}
        onClose={() => setTagSearchOpen(false)}
      />
```

- [ ] **Step 8: Verificar TypeScript**

```
cd app && npx tsc --noEmit
```
Resultado esperado: exit 0.

- [ ] **Step 9: Build completo**

```
cd app && npx next build --webpack 2>&1
```
Resultado esperado: EXIT_CODE 0, sin errores nuevos.

- [ ] **Step 10: Commit**

```bash
git add "app/src/app/(workspace)/projects/[projectId]/engineering/page.tsx"
git commit -m "feat: botón Buscar TAG + TagSearchModal en pantalla de Ingeniería"
```

---

## Verificación Final

- [ ] TypeScript: `cd app && npx tsc --noEmit` → exit 0
- [ ] Build: `cd app && npx next build --webpack` → exit 0
- [ ] En pantalla de Equipos: botón "Buscar TAG" visible → abre modal → buscar "FT" → aparece sección EQUIPO → clic "↗ Editar Equipo" → navega a `/equipment?tag=FT` → grilla filtrada
- [ ] En pantalla de Ingeniería: botón "Buscar TAG" visible → abre modal → buscar "FT" → aparece sección TAG EXTRAÍDO → clic "↗ Revisar TAG" → navega a `/engineering?tag=FT` → TagReviewTable filtrada + banner "Filtro: FT" visible con botón "Limpiar"
- [ ] ESC cierra el modal
- [ ] Clic fuera del modal lo cierra
- [ ] TAG no encontrado muestra mensaje vacío
