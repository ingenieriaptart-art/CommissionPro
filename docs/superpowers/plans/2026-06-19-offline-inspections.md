# Offline Inspections — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Captura de inspecciones offline-first (abrir plantilla → llenar → evidencias → guardar sin red) sincronizada al reconectar, con snapshot de plantilla por inspección y ciclo de `sync_status` visible.

**Architecture:** Camino único local-first: toda escritura va a Dexie/IndexedDB + outbox; el motor `lib/sync/engine.ts` (ya existente) la empuja (inmediato si hay red, diferido si no), extendido para subir blobs de evidencia a Storage. Plantillas y equipos se pre-descargan a IndexedDB con una acción explícita. Lógica de negocio en funciones puras testeables con Vitest + fake-indexeddb.

**Tech Stack:** Next.js 16 (App Router, webpack), TypeScript, Dexie 4 (IndexedDB), Supabase JS, React Query, Vitest + fake-indexeddb (nuevo), Playwright (existente).

## Global Constraints

- Rama nueva `feat/offline-inspections` **desde `master`** (no desde la rama del PR #1).
- `sync_status` de 4 estados (`pending|syncing|synced|failed`) + `last_sync_error` viven **solo en el cliente** (Dexie/UI). **NO** modificar el enum `record_sync_status` del servidor. Antes del upsert al servidor, forzar `sync_status='synced'` y **eliminar** `last_sync_error` del payload.
- Inspecciones **append-only + LWW**: `id` (UUID) generado en el dispositivo; push usa `upsert(..., { onConflict: 'id' })`.
- Snapshot por inspección en `tests`: `template_id`, `template_revision`, `template_hash`, `template_snapshot` (jsonb). `template_snapshot = { template: <definición>, meta: { template_source, app_version, schema_version, captured_at } }`.
- `template_hash = SHA-256(canonicalJSON(<definición>))` — **excluye** `meta` y `_source`/`revision` (volátiles); misma definición → mismo hash.
- Migración: **auto-detectar** el siguiente número (`max(NNNN)+1` en `database/migrations/`), no asumir 0047. Migración aditiva/nullable, idempotente.
- Testing: Vitest unitario cubre `prepareProjectOffline`, `submitInspectionOffline`, `pushPendingOps`, retry/backoff, LWW + un e2e Playwright offline. No depender solo de e2e.
- DB schema-only en migración; nada de tocar RLS ni el enum.
- Trabajar desde `C:\Users\USUARIO\Documents\CodigoIA\PrecomisionamientoProjects`. App en `app/`. Bash (Git Bash) disponible.

## File Structure

| Archivo | Responsabilidad |
|---|---|
| `app/vitest.config.ts`, `app/vitest.setup.ts` | Runner unitario + fake-indexeddb |
| `app/src/types/index.ts` | `SyncStatus` (+syncing,+failed), `Test` (+template_*, +last_sync_error) |
| `app/src/types/inspection.ts` | `MockInspectionTemplate` (+revision?, +_source?) |
| `app/src/lib/db/local.ts` | Dexie v5 stores `offlineTemplates`, `equipmentTemplateRefs` + interfaces |
| `app/src/lib/version.ts` | `APP_VERSION`, `SCHEMA_VERSION` |
| `app/src/lib/sync/hash.ts` | `canonicalJSON`, `sha256Hex`, `computeTemplateHash` |
| `app/src/lib/sync/assembleTemplate.ts` | `assembleTemplate(client, templateId)` (extraído del hook) |
| `app/src/lib/sync/prefetch.ts` | `prepareProjectOffline(projectId, onProgress?)` |
| `app/src/lib/sync/submitInspection.ts` | `submitInspectionOffline(params, deps)` (puro) |
| `app/src/lib/sync/engine.ts` | `pushPendingOps` extendido (blob upload + sync_status) |
| `app/src/hooks/useInspectionData.ts` | fallback offline en 3 hooks + cache online |
| `app/src/hooks/useEquipmentStatusSync.ts` | `syncEquipmentStatus` offline-aware |
| `app/src/hooks/useSubmitInspection.ts` | wrapper fino sobre `submitInspectionOffline` |
| `.../inspection/[templateId]/summary/page.tsx` | nuevo call de `submit(state, projectId, template)` |
| `app/src/components/sync/SyncStatusBadge.tsx` | badge de pendientes en sidebar |
| `app/src/components/layout/ProjectSidebar.tsx` | montar el badge |
| `app/src/components/settings/OfflinePrepCard.tsx` + settings page | acción "Preparar para offline" |
| `database/migrations/<NNNN>_inspection_template_snapshot.sql` | columnas de snapshot |
| `app/e2e/offline-inspection.spec.ts` | smoke Playwright offline |

---

### Task 1: Setup Vitest + fake-indexeddb

**Files:**
- Create: `app/vitest.config.ts`, `app/vitest.setup.ts`, `app/src/lib/sync/__tests__/smoke.test.ts`
- Modify: `app/package.json`

**Interfaces:**
- Produces: comando `npm test` (vitest) y resolución del alias `@/` en tests.

- [ ] **Step 1: Instalar devDeps**

Run (desde `app/`): `npm i -D vitest@^3 fake-indexeddb@^6`
Expected: instala sin errores; aparecen en `devDependencies`.

- [ ] **Step 2: Crear `app/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
```

- [ ] **Step 3: Crear `app/vitest.setup.ts`**

```ts
import "fake-indexeddb/auto";

// Dexie/engine consultan navigator.onLine; en node no existe → stub editable por test.
if (typeof (globalThis as { navigator?: unknown }).navigator === "undefined") {
  (globalThis as { navigator: { onLine: boolean } }).navigator = { onLine: true };
}
```

- [ ] **Step 4: Agregar script de test en `app/package.json`**

En `"scripts"`, agregar: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 5: Crear smoke test `app/src/lib/sync/__tests__/smoke.test.ts`**

```ts
import { test, expect } from "vitest";
import Dexie from "dexie";

test("fake-indexeddb opera con Dexie", async () => {
  const db = new Dexie("smoke");
  db.version(1).stores({ t: "id" });
  await db.table("t").put({ id: "a", v: 1 });
  const row = await db.table("t").get("a");
  expect(row).toEqual({ id: "a", v: 1 });
  await db.delete();
});
```

- [ ] **Step 6: Ejecutar y commitear**

Run (desde `app/`): `npm test`
Expected: 1 passed.

```bash
git add app/vitest.config.ts app/vitest.setup.ts app/package.json app/package-lock.json app/src/lib/sync/__tests__/smoke.test.ts
git commit -m "test: setup vitest + fake-indexeddb para motor offline

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Tipos + Dexie v5 + version helper

**Files:**
- Modify: `app/src/types/index.ts`, `app/src/types/inspection.ts`, `app/src/lib/db/local.ts`
- Create: `app/src/lib/version.ts`, `app/src/lib/db/__tests__/local.test.ts`

**Interfaces:**
- Produces: `SyncStatus` incluye `"syncing"|"failed"`; `Test` incluye `template_id?,template_revision?,template_hash?,template_snapshot?,last_sync_error?`; `MockInspectionTemplate` incluye `revision?:string; _source?:"online"|"offline"`; stores Dexie `offlineTemplates` (`OfflineTemplate`), `equipmentTemplateRefs` (`EquipmentTemplateRefsRow`); `APP_VERSION`, `SCHEMA_VERSION`.

- [ ] **Step 1: Crear `app/src/lib/version.ts`**

```ts
// Versión de app y de esquema offline, embebidas en el snapshot de inspección.
import pkg from "../../package.json";

export const APP_VERSION: string = (pkg as { version?: string }).version ?? "0.0.0";
export const SCHEMA_VERSION = 5; // versión del esquema Dexie (ver lib/db/local.ts)
```

- [ ] **Step 2: Extender `SyncStatus` y `Test` en `app/src/types/index.ts`**

Reemplazar la línea `export type SyncStatus = "synced" | "pending" | "conflict";` por:

```ts
// "syncing" y "failed" son transitorios SOLO del cliente (no existen en el enum del servidor).
export type SyncStatus = "synced" | "pending" | "syncing" | "failed" | "conflict";
```

En `export interface Test { ... }`, justo después de `origin_device_id?: string;`, agregar:

```ts
  // Snapshot de plantilla (trazabilidad de auditoría)
  template_id?: string;
  template_revision?: string;
  template_hash?: string;
  template_snapshot?: unknown;
  // Solo cliente (se elimina antes del upsert al servidor)
  last_sync_error?: string;
```

- [ ] **Step 3: Extender `MockInspectionTemplate` en `app/src/types/inspection.ts`**

En `export interface MockInspectionTemplate`, agregar dos campos opcionales al final (antes del cierre `}`):

```ts
  revision?: string;
  _source?: "online" | "offline";
```

- [ ] **Step 4: Agregar stores v5 en `app/src/lib/db/local.ts`**

Tras la interfaz `InspectionDraft` (antes de `class CommissionProDB`), agregar:

```ts
import type { MockInspectionTemplate } from "@/types/inspection";
import type { TemplateRef } from "@/hooks/useInspectionData";

export interface OfflineTemplate {
  id: string;                       // templateId
  template: MockInspectionTemplate;
  updatedAt: string;
}

export interface EquipmentTemplateRefsRow {
  equipmentId: string;
  refs: TemplateRef[];
  updatedAt: string;
}
```

En la clase, declarar las tablas (tras `inspectionDrafts!`):

```ts
  offlineTemplates!: EntityTable<OfflineTemplate, "id">;
  equipmentTemplateRefs!: EntityTable<EquipmentTemplateRefsRow, "equipmentId">;
```

Y agregar la versión 5 tras el bloque `this.version(4)`:

```ts
    // v5: plantillas y resolución por equipo cacheadas para captura offline
    this.version(5).stores({
      offlineTemplates:      "id, updatedAt",
      equipmentTemplateRefs: "equipmentId, updatedAt",
    });
```

> Nota: `TemplateRef` se importa desde `@/hooks/useInspectionData` (ya exportada allí). Es un import de solo-tipo, sin ciclo en runtime.

- [ ] **Step 5: Test `app/src/lib/db/__tests__/local.test.ts`**

```ts
import { test, expect, beforeEach } from "vitest";
import { localDB } from "@/lib/db/local";

beforeEach(async () => {
  await localDB.offlineTemplates.clear();
  await localDB.equipmentTemplateRefs.clear();
});

test("v5: guarda y lee offlineTemplates", async () => {
  const tpl = { id: "t1", code: "P_X", name: "X", discipline: "", sections: [] };
  await localDB.offlineTemplates.put({ id: "t1", template: tpl, updatedAt: "2026-06-19T00:00:00Z" });
  const row = await localDB.offlineTemplates.get("t1");
  expect(row?.template.code).toBe("P_X");
});

test("v5: guarda y lee equipmentTemplateRefs", async () => {
  await localDB.equipmentTemplateRefs.put({
    equipmentId: "e1",
    refs: [{ id: "t1", code: "P_X", name: "X", discipline: "" }],
    updatedAt: "2026-06-19T00:00:00Z",
  });
  const row = await localDB.equipmentTemplateRefs.get("e1");
  expect(row?.refs[0].id).toBe("t1");
});
```

- [ ] **Step 6: Ejecutar y commitear**

Run (desde `app/`): `npm test -- src/lib/db/__tests__/local.test.ts`
Expected: 2 passed.

```bash
git add app/src/types/index.ts app/src/types/inspection.ts app/src/lib/db/local.ts app/src/lib/version.ts app/src/lib/db/__tests__/local.test.ts
git commit -m "feat(offline): tipos snapshot/sync_status + stores Dexie v5

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Helper de hash (SHA-256 sobre JSON normalizado)

**Files:**
- Create: `app/src/lib/sync/hash.ts`, `app/src/lib/sync/__tests__/hash.test.ts`

**Interfaces:**
- Produces: `canonicalJSON(value: unknown): string`; `sha256Hex(text: string): Promise<string>`; `computeTemplateHash(template: MockInspectionTemplate): Promise<string>`.

- [ ] **Step 1: Test (debe fallar) `app/src/lib/sync/__tests__/hash.test.ts`**

```ts
import { test, expect } from "vitest";
import { canonicalJSON, sha256Hex, computeTemplateHash } from "@/lib/sync/hash";
import type { MockInspectionTemplate } from "@/types/inspection";

test("canonicalJSON ordena claves de forma estable", () => {
  expect(canonicalJSON({ b: 1, a: 2 })).toBe(canonicalJSON({ a: 2, b: 1 }));
  expect(canonicalJSON({ a: 2, b: 1 })).toBe('{"a":2,"b":1}');
});

test("sha256Hex es determinista y hex de 64 chars", async () => {
  const h = await sha256Hex("hola");
  expect(h).toMatch(/^[0-9a-f]{64}$/);
  expect(await sha256Hex("hola")).toBe(h);
});

const baseTpl: MockInspectionTemplate = {
  id: "t1", code: "P_X", name: "X", discipline: "mec",
  sections: [{ id: "s1", code: "S1", name: "Sec", is_universal: false,
    fields: [{ key: "it1", label: "Item", type: "checkbox", required: false }] }],
};

test("computeTemplateHash ignora _source y revision (meta volátil)", async () => {
  const a = await computeTemplateHash({ ...baseTpl, _source: "online", revision: "Rev0" });
  const b = await computeTemplateHash({ ...baseTpl, _source: "offline", revision: "Rev9" });
  expect(a).toBe(b);
});

test("computeTemplateHash cambia si cambia la definición", async () => {
  const a = await computeTemplateHash(baseTpl);
  const mutated = structuredClone(baseTpl);
  mutated.sections[0].fields[0].label = "Otro";
  expect(await computeTemplateHash(mutated)).not.toBe(a);
});
```

- [ ] **Step 2: Verificar que falla**

Run (desde `app/`): `npm test -- src/lib/sync/__tests__/hash.test.ts`
Expected: FAIL (módulo `@/lib/sync/hash` no existe).

- [ ] **Step 3: Implementar `app/src/lib/sync/hash.ts`**

```ts
import type { MockInspectionTemplate } from "@/types/inspection";

/** Serializa con claves ordenadas recursivamente → JSON estable para hashing. */
export function canonicalJSON(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJSON).join(",") + "]";
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalJSON(obj[k])).join(",") + "}";
}

/** SHA-256 hex. Usa Web Crypto si está disponible; si no, una impl JS pura. */
export async function sha256Hex(text: string): Promise<string> {
  const subtle = (globalThis.crypto as Crypto | undefined)?.subtle;
  if (subtle) {
    const buf = await subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  return sha256Fallback(text);
}

/** Hash de la DEFINICIÓN de la plantilla (excluye _source/revision y cualquier meta). */
export async function computeTemplateHash(template: MockInspectionTemplate): Promise<string> {
  const definition = {
    id: template.id,
    code: template.code,
    name: template.name,
    discipline: template.discipline,
    sections: template.sections,
  };
  return sha256Hex(canonicalJSON(definition));
}

// Impl JS pura de SHA-256 (fallback sin Web Crypto). Determinista.
function sha256Fallback(ascii: string): string {
  /* eslint-disable */
  function rightRotate(value: number, amount: number) { return (value >>> amount) | (value << (32 - amount)); }
  const mathPow = Math.pow; const maxWord = mathPow(2, 32); let result = "";
  const words: number[] = []; const asciiBitLength = ascii.length * 8;
  let hash: number[] = (sha256Fallback as any).h = (sha256Fallback as any).h || [];
  const k: number[] = (sha256Fallback as any).k = (sha256Fallback as any).k || [];
  let primeCounter = k.length; const isComposite: Record<number, number> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) isComposite[i] = candidate;
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  hash = hash.slice(0, 8);
  let bytes: number[] = []; for (let i = 0; i < ascii.length; i++) bytes.push(ascii.charCodeAt(i) & 0xff);
  bytes.push(0x80); while ((bytes.length % 64) - 56) bytes.push(0);
  for (let i = 0; i < bytes.length; i++) { words[i >> 2] |= bytes[i] << ((3 - i) % 4) * 8; }
  words[(((bytes.length + 8) >> 6) << 4) + 15] = asciiBitLength;
  for (let j = 0; j < words.length;) {
    const w = words.slice(j, (j += 16)); const oldHash = hash.slice(0);
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const s0 = w15 !== undefined ? (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) : 0;
      const s1 = w2 !== undefined ? (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10)) : 0;
      if (i >= 16) w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      const a = hash[0], e = hash[4];
      const temp1 = (hash[7] + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
        + ((e & hash[5]) ^ (~e & hash[6])) + k[i] + (w[i] | 0)) | 0;
      const temp2 = ((rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
        + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]))) | 0;
      hash = [(temp1 + temp2) | 0].concat(hash); hash[4] = (hash[4] + temp1) | 0;
    }
    for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }
  for (let i = 0; i < 8; i++) for (let j = 3; j + 1; j--) {
    const b = (hash[i] >> (j * 8)) & 0xff; result += (b < 16 ? "0" : "") + b.toString(16);
  }
  return result;
  /* eslint-enable */
}
```

- [ ] **Step 4: Verificar que pasa**

Run (desde `app/`): `npm test -- src/lib/sync/__tests__/hash.test.ts`
Expected: 4 passed. (Node 24 tiene `crypto.subtle`, así que se ejercita el path Web Crypto; el fallback queda como red de seguridad para entornos sin él.)

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/sync/hash.ts app/src/lib/sync/__tests__/hash.test.ts
git commit -m "feat(offline): hash SHA-256 estable de definicion de plantilla

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Extraer `assembleTemplate`

**Files:**
- Create: `app/src/lib/sync/assembleTemplate.ts`, `app/src/lib/sync/__tests__/assembleTemplate.test.ts`
- Modify: `app/src/hooks/useInspectionData.ts`

**Interfaces:**
- Consumes: cliente Supabase (`createClient()` o mock con `.from().select().eq().is().single()`, `.from().select().in()`, `.rpc()`).
- Produces: `assembleTemplate(client: SupabaseLike, templateId: string): Promise<MockInspectionTemplate | null>` — incluye `revision`.

- [ ] **Step 1: Test (debe fallar) `app/src/lib/sync/__tests__/assembleTemplate.test.ts`**

```ts
import { test, expect } from "vitest";
import { assembleTemplate } from "@/lib/sync/assembleTemplate";

// Mock mínimo del cliente Supabase que usa assembleTemplate.
function mockClient() {
  const ft = { id: "t1", key: "P_X", name: "X", test_type: "precomisionamiento", revision: "Rev0" };
  const sections = [{ section_id: "s1", section_code: "S1", section_name: "Sec", sort_order: 10, is_active: true }];
  const sectionMeta = [{ id: "s1", is_universal: false }];
  const fields = [{ id: "f1", section_id: "s1", key: "it1", label: "Item", type: "checkbox", required: false, options: ["OK"], validations: null, hint: null, is_active: true, sort_order: 10 }];
  return {
    from(table: string) {
      return {
        select() { return this; },
        eq() { return this; },
        is() { return this; },
        in() {
          if (table === "template_sections") return Promise.resolve({ data: sectionMeta, error: null });
          if (table === "section_fields")   return Promise.resolve({ data: fields, error: null });
          return Promise.resolve({ data: [], error: null });
        },
        order() { return Promise.resolve({ data: fields, error: null }); },
        single() { return Promise.resolve({ data: ft, error: null }); },
      };
    },
    rpc() { return Promise.resolve({ data: sections, error: null }); },
  };
}

test("assembleTemplate ensambla plantilla con revision y campos", async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tpl = await assembleTemplate(mockClient() as any, "t1");
  expect(tpl).not.toBeNull();
  expect(tpl!.code).toBe("P_X");
  expect(tpl!.revision).toBe("Rev0");
  expect(tpl!.sections[0].fields[0].key).toBe("it1");
});
```

- [ ] **Step 2: Verificar que falla**

Run (desde `app/`): `npm test -- src/lib/sync/__tests__/assembleTemplate.test.ts`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar `app/src/lib/sync/assembleTemplate.ts`**

```ts
import type { FieldType } from "@/types";
import type {
  MockInspectionTemplate, MockInspectionSection, MockInspectionField,
} from "@/types/inspection";

// Cliente mínimo que necesitamos (compatible con createClient() de Supabase).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

/** Ensambla la plantilla completa (meta + secciones + campos) desde Supabase. */
export async function assembleTemplate(
  client: SupabaseLike,
  templateId: string,
): Promise<MockInspectionTemplate | null> {
  const { data: ft, error: ftErr } = await client
    .from("form_templates")
    .select("id, key, name, test_type, revision")
    .eq("id", templateId)
    .is("deleted_at", null)
    .single();
  if (ftErr || !ft) return null;

  const { data: sectionRows, error: secErr } = await client
    .rpc("get_template_sections", { p_template_id: templateId });
  if (secErr || !sectionRows?.length) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sectionIds: string[] = sectionRows.map((s: any) => s.section_id as string);

  const { data: sectionMeta } = await client
    .from("template_sections").select("id, is_universal").in("id", sectionIds);
  const universalMap: Record<string, boolean> = {};
  for (const s of (sectionMeta ?? [])) universalMap[s.id] = s.is_universal;

  const activeMapSec: Record<string, boolean> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const s of sectionRows) activeMapSec[s.section_id as string] = (s as any).is_active ?? true;

  const { data: allFields } = await client
    .from("section_fields").select("*").in("section_id", sectionIds).order("sort_order");

  const fieldsBySectionId: Record<string, MockInspectionField[]> = {};
  for (const f of (allFields ?? [])) {
    (fieldsBySectionId[f.section_id] ??= []).push({
      key: f.key, _db_id: f.id, label: f.label, type: f.type as FieldType,
      required: f.required, options: (f.options as string[]) ?? undefined,
      validations: (f.validations as { unit?: string; min?: number; max?: number }) ?? undefined,
      hint: f.hint ?? undefined, is_active: f.is_active ?? true,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sections: MockInspectionSection[] = sectionRows.map((s: any) => ({
    id: s.section_id, code: s.section_code, name: s.section_name,
    is_universal: universalMap[s.section_id] ?? false,
    is_active: activeMapSec[s.section_id] ?? true,
    fields: fieldsBySectionId[s.section_id] ?? [],
  }));

  return {
    id: ft.id, code: ft.key, name: ft.name, discipline: ft.test_type ?? "",
    revision: ft.revision ?? undefined, sections,
  };
}
```

- [ ] **Step 4: Refactor `useInspectionData.ts` para usar `assembleTemplate` (online, sin cambio de comportamiento)**

En `useInspectionData.ts`, importar arriba:
```ts
import { assembleTemplate } from "@/lib/sync/assembleTemplate";
```
Dentro de `useInspectionTemplate`, en la rama real (no-mock), **reemplazar** todo el bloque que arma la plantilla (desde `const supabase = createClient();` hasta el `return { id: ft.id, ... sections };`) por:
```ts
      const supabase = createClient();
      const tpl = await assembleTemplate(supabase, templateId);
      if (tpl) tpl._source = "online";
      return tpl;
```

- [ ] **Step 5: Verificar test + build de tipos**

Run (desde `app/`): `npm test -- src/lib/sync/__tests__/assembleTemplate.test.ts`
Expected: 1 passed.
Run (desde `app/`): `npx tsc --noEmit`
Expected: 0 errores.

- [ ] **Step 6: Commit**

```bash
git add app/src/lib/sync/assembleTemplate.ts app/src/lib/sync/__tests__/assembleTemplate.test.ts app/src/hooks/useInspectionData.ts
git commit -m "refactor(offline): extraer assembleTemplate (+revision) y reusar en hook

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: `prepareProjectOffline`

**Files:**
- Create: `app/src/lib/sync/prefetch.ts`, `app/src/lib/sync/__tests__/prefetch.test.ts`

**Interfaces:**
- Consumes: `assembleTemplate`, `localDB`, cliente Supabase (inyectable).
- Produces: `prepareProjectOffline(projectId: string, deps: PrefetchDeps, onProgress?: (done: number, total: number) => void): Promise<{ equipment: number; templates: number; errors: string[] }>` con `PrefetchDeps = { client: SupabaseLike; db: typeof localDB }`.

- [ ] **Step 1: Test (debe fallar) `app/src/lib/sync/__tests__/prefetch.test.ts`**

```ts
import { test, expect, beforeEach } from "vitest";
import { prepareProjectOffline } from "@/lib/sync/prefetch";
import { localDB } from "@/lib/db/local";

beforeEach(async () => {
  await Promise.all([
    localDB.equipment.clear(),
    localDB.equipmentTemplateRefs.clear(),
    localDB.offlineTemplates.clear(),
  ]);
});

function mockClient() {
  const equipment = [
    { id: "e1", project_id: "p1", tag: "B1", subsystem_id: "s", status: "pendiente" },
    { id: "e2", project_id: "p1", tag: "B2", subsystem_id: "s", status: "pendiente" },
  ];
  const refsByEq: Record<string, unknown[]> = {
    e1: [{ template_id: "t1", template_key: "P_X", template_name: "X", discipline: "mec", source: "equipment_type" }],
    e2: [{ template_id: "t1", template_key: "P_X", template_name: "X", discipline: "mec", source: "equipment_type" }],
  };
  return {
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        is() { return Promise.resolve({ data: equipment, error: null }); },
      };
    },
    rpc(_fn: string, args: { p_equipment_id: string }) {
      return Promise.resolve({ data: refsByEq[args.p_equipment_id] ?? [], error: null });
    },
  };
}

test("prepareProjectOffline cachea equipos, refs y plantillas", async () => {
  const onProgress = (() => { let last = 0; const f = (d: number) => { last = d; }; (f as any).last = () => last; return f; })();
  // assembleTemplate se invoca con el client mock; lo simulamos devolviendo plantilla mínima
  const deps = {
    client: mockClient() as any,
    db: localDB,
    assemble: async () => ({ id: "t1", code: "P_X", name: "X", discipline: "mec", sections: [] }),
  };
  const res = await prepareProjectOffline("p1", deps as any, onProgress);
  expect(res.equipment).toBe(2);
  expect(res.templates).toBe(1); // t1 deduplicado
  expect(res.errors).toEqual([]);
  expect(await localDB.equipment.count()).toBe(2);
  expect((await localDB.equipmentTemplateRefs.get("e1"))?.refs[0].id).toBe("t1");
  expect((await localDB.offlineTemplates.get("t1"))?.template.code).toBe("P_X");
});
```

> El test inyecta `assemble` para no depender de la forma exacta de las llamadas internas de `assembleTemplate`. La implementación usa `deps.assemble ?? assembleTemplate`.

- [ ] **Step 2: Verificar que falla**

Run (desde `app/`): `npm test -- src/lib/sync/__tests__/prefetch.test.ts`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar `app/src/lib/sync/prefetch.ts`**

```ts
import { localDB } from "@/lib/db/local";
import { assembleTemplate } from "@/lib/sync/assembleTemplate";
import type { TemplateRef } from "@/hooks/useInspectionData";
import type { MockInspectionTemplate } from "@/types/inspection";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

export interface PrefetchDeps {
  client: SupabaseLike;
  db?: typeof localDB;
  assemble?: (client: SupabaseLike, templateId: string) => Promise<MockInspectionTemplate | null>;
}

/** Descarga equipos + plantillas resueltas del proyecto a IndexedDB para uso offline. */
export async function prepareProjectOffline(
  projectId: string,
  deps: PrefetchDeps,
  onProgress?: (done: number, total: number) => void,
): Promise<{ equipment: number; templates: number; errors: string[] }> {
  const db = deps.db ?? localDB;
  const assemble = deps.assemble ?? assembleTemplate;
  const errors: string[] = [];
  const now = () => new Date().toISOString();

  // 1. Equipos del proyecto
  const { data: equipment, error: eqErr } = await deps.client
    .from("equipment").select("*").eq("project_id", projectId).is("deleted_at", null);
  if (eqErr || !equipment) {
    return { equipment: 0, templates: 0, errors: [`equipment: ${eqErr?.message ?? "sin datos"}`] };
  }
  await db.equipment.bulkPut(equipment.map((e: Record<string, unknown>) => ({ ...e, sync_status: "synced" })));

  // 2. Refs por equipo + 3. plantillas únicas
  const total = equipment.length;
  let done = 0;
  const templateIds = new Set<string>();

  for (const eq of equipment) {
    try {
      const { data: rows } = await deps.client.rpc("get_equipment_templates", { p_equipment_id: eq.id });
      const seen = new Set<string>();
      const refs: TemplateRef[] = [];
      for (const r of (rows ?? [])) {
        if (seen.has(r.template_id)) continue;
        seen.add(r.template_id);
        refs.push({ id: r.template_id, code: r.template_key, name: r.template_name, discipline: r.discipline ?? "", source: r.source });
        templateIds.add(r.template_id);
      }
      await db.equipmentTemplateRefs.put({ equipmentId: eq.id, refs, updatedAt: now() });
    } catch (err) {
      errors.push(`equipo ${eq.tag ?? eq.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
    done++;
    onProgress?.(done, total);
  }

  // 4. Ensamblar y cachear cada plantilla única
  let templates = 0;
  for (const tid of templateIds) {
    try {
      const tpl = await assemble(deps.client, tid);
      if (tpl) {
        tpl._source = "offline";
        await db.offlineTemplates.put({ id: tid, template: tpl, updatedAt: now() });
        templates++;
      } else {
        errors.push(`plantilla ${tid}: no ensamblada`);
      }
    } catch (err) {
      errors.push(`plantilla ${tid}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { equipment: equipment.length, templates, errors };
}
```

- [ ] **Step 4: Verificar que pasa**

Run (desde `app/`): `npm test -- src/lib/sync/__tests__/prefetch.test.ts`
Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/sync/prefetch.ts app/src/lib/sync/__tests__/prefetch.test.ts
git commit -m "feat(offline): prepareProjectOffline (prefetch equipos+plantillas)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: `submitInspectionOffline` + reescritura del hook

**Files:**
- Create: `app/src/lib/sync/submitInspection.ts`, `app/src/lib/sync/__tests__/submitInspection.test.ts`
- Modify: `app/src/hooks/useSubmitInspection.ts`, `.../inspection/[templateId]/summary/page.tsx`

**Interfaces:**
- Consumes: `localDB`, `enqueueSync`, `saveBlobLocally`, `deleteInspectionDraft`, `computeTemplateHash`, `runSync`.
- Produces: `submitInspectionOffline(params: SubmitParams, deps: SubmitDeps): Promise<{ testId: string }>`. Hook `useSubmitInspection` con `submit(state: InspectionState, projectId: string, template: MockInspectionTemplate): Promise<{ testId: string } | null>`.

- [ ] **Step 1: Test (debe fallar) `app/src/lib/sync/__tests__/submitInspection.test.ts`**

```ts
import { test, expect, beforeEach, vi } from "vitest";
import { submitInspectionOffline } from "@/lib/sync/submitInspection";
import { localDB } from "@/lib/db/local";
import type { InspectionState } from "@/types/inspection";
import type { MockInspectionTemplate } from "@/types/inspection";

beforeEach(async () => {
  await Promise.all([
    localDB.tests.clear(), localDB.evidences.clear(), localDB.equipment.clear(),
    localDB.syncQueue.clear(), localDB.blobStore.clear(), localDB.inspectionDrafts.clear(),
  ]);
  await localDB.equipment.put({ id: "e1", project_id: "p1", tag: "B1", status: "pendiente", metadata: {}, sync_status: "synced" } as any);
});

const template: MockInspectionTemplate = {
  id: "t1", code: "P_X", name: "X", discipline: "mec", revision: "Rev0", _source: "offline",
  sections: [{ id: "s1", code: "S1", name: "Sec", is_universal: false,
    fields: [{ key: "it1", label: "Item", type: "checkbox", required: false }] }],
};

const state: InspectionState = {
  equipmentId: "e1", templateId: "t1", activeSectionIndex: 0,
  answers: { it1: "Cumple" }, evidences: {}, sectionStatus: { s1: "complete" },
  savedAt: null, isDirty: true,
};

function deps(online: boolean) {
  let n = 0;
  return {
    db: localDB,
    enqueueSync: async (entity: string, entityId: string, op: string, payload: unknown) => {
      await localDB.syncQueue.add({ entity, entityId, operation: op as any, payload, createdAt: "t", attempts: 0 });
    },
    saveBlobLocally: vi.fn(async () => 1),
    deleteInspectionDraft: vi.fn(async () => {}),
    computeTemplateHash: async () => "HASH123",
    fetchBlob: async () => new Blob(["x"], { type: "image/jpeg" }),
    runSync: vi.fn(async () => ({ pushed: 0, pulled: 0, conflicts: 0, errors: [] })),
    uuid: () => `id-${++n}`,
    now: () => "2026-06-19T00:00:00Z",
    isOnline: () => online,
    appVersion: "1.0.0", schemaVersion: 5,
  };
}

test("guarda test local + outbox con snapshot y sync_status pending", async () => {
  const d = deps(false);
  const res = await submitInspectionOffline({ state, projectId: "p1", userId: "u1", template }, d as any);
  expect(res.testId).toBe("id-1");

  const test = await localDB.tests.get("id-1");
  expect(test?.template_id).toBe("t1");
  expect(test?.template_revision).toBe("Rev0");
  expect(test?.template_hash).toBe("HASH123");
  expect((test as any)?.template_snapshot.meta.template_source).toBe("offline");
  expect((test as any)?.template_snapshot.meta.app_version).toBe("1.0.0");
  expect(test?.sync_status).toBe("pending");
  expect(test?.result_summary).toBe("cumple");

  const q = await localDB.syncQueue.toArray();
  expect(q.find((o) => o.entity === "tests")).toBeTruthy();
  expect(q.find((o) => o.entity === "equipment")).toBeTruthy();
  expect(d.runSync).not.toHaveBeenCalled(); // offline → no sync inmediato
  expect(d.deleteInspectionDraft).toHaveBeenCalled();

  const eq = await localDB.equipment.get("e1");
  expect(eq?.status).toBe("en_ejecucion");
  expect((eq?.metadata as any)?.form_pct).toBe(100);
});

test("online → dispara runSync; result_summary no_cumple si hay falla", async () => {
  const failState = { ...state, answers: { it1: "No cumple", x: "RECHAZADO" } };
  const d = deps(true);
  await submitInspectionOffline({ state: failState, projectId: "p1", userId: "u1", template }, d as any);
  const test = await localDB.tests.get("id-1");
  expect(test?.result_summary).toBe("no_cumple");
  expect(d.runSync).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Verificar que falla**

Run (desde `app/`): `npm test -- src/lib/sync/__tests__/submitInspection.test.ts`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar `app/src/lib/sync/submitInspection.ts`**

```ts
import type { localDB as LocalDB } from "@/lib/db/local";
import type { InspectionState, MockInspectionTemplate } from "@/types/inspection";

export interface SubmitParams {
  state: InspectionState;
  projectId: string;
  userId: string;
  template: MockInspectionTemplate;
}

export interface SubmitDeps {
  db: typeof LocalDB;
  enqueueSync: (entity: string, entityId: string, op: "INSERT" | "UPDATE" | "DELETE", payload: unknown) => Promise<void>;
  saveBlobLocally: (evidenceId: string, blob: Blob) => Promise<number>;
  deleteInspectionDraft: (equipmentId: string, templateId: string) => Promise<void>;
  computeTemplateHash: (t: MockInspectionTemplate) => Promise<string>;
  fetchBlob: (url: string) => Promise<Blob>;
  runSync: () => Promise<unknown>;
  uuid: () => string;
  now: () => string;
  isOnline: () => boolean;
  appVersion: string;
  schemaVersion: number;
}

const FAIL_VALUES = new Set(["FALLA", "NO", "RECHAZADO", "No cumple", "No conforme"]);

/** Escribe la inspección a IndexedDB + outbox (local-first). Optimista. */
export async function submitInspectionOffline(
  params: SubmitParams,
  deps: SubmitDeps,
): Promise<{ testId: string }> {
  const { state, projectId, userId, template } = params;
  const { db } = deps;
  const testId = deps.uuid();
  const ts = deps.now();

  const hasFailures = Object.values(state.answers).some((v) => FAIL_VALUES.has(String(v)));
  const template_hash = await deps.computeTemplateHash(template);
  const definition = {
    id: template.id, code: template.code, name: template.name,
    discipline: template.discipline, sections: template.sections,
  };

  const test = {
    id: testId,
    project_id: projectId,
    equipment_id: state.equipmentId,
    type: "precomisionamiento",
    code: `PRE-${template.code}-${ts.slice(0, 10)}`,
    status: "ejecutado",
    executed_by: userId,
    executed_at: ts,
    data: state.answers,
    result_summary: hasFailures ? "no_cumple" : "cumple",
    created_by: userId,
    created_at: ts,
    updated_at: ts,
    version: 1,
    sync_status: "pending" as const,
    last_sync_error: undefined,
    template_id: template.id,
    template_revision: template.revision,
    template_hash,
    template_snapshot: {
      template: definition,
      meta: {
        template_source: template._source ?? "online",
        app_version: deps.appVersion,
        schema_version: deps.schemaVersion,
        captured_at: ts,
      },
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.tests.add(test as any);
  await deps.enqueueSync("tests", testId, "INSERT", test);

  // Evidencias: blob local + fila evidences (sin storage_url) + outbox
  for (const [, items] of Object.entries(state.evidences)) {
    for (const item of items) {
      const evidenceId = deps.uuid();
      try {
        const blob = await deps.fetchBlob(item.url);
        await deps.saveBlobLocally(evidenceId, blob);
      } catch { continue; }
      const row = {
        id: evidenceId, project_id: projectId, test_id: testId, equipment_id: state.equipmentId,
        type: "foto", stage: item.stage, storage_url: undefined,
        captured_by: userId, captured_at: item.timestamp, sync_status: "pending" as const,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.evidences.add(row as any);
      await deps.enqueueSync("evidences", evidenceId, "INSERT", row);
    }
  }

  // Estado del equipo (local + outbox)
  const eq = await db.equipment.get(state.equipmentId);
  const patch = {
    status: "en_ejecucion",
    metadata: { ...((eq?.metadata as Record<string, unknown>) ?? {}), form_pct: 100 },
    updated_at: ts,
  };
  await db.equipment.update(state.equipmentId, patch);
  await deps.enqueueSync("equipment", state.equipmentId, "UPDATE", { id: state.equipmentId, ...patch });

  await deps.deleteInspectionDraft(state.equipmentId, template.id);

  if (deps.isOnline()) void deps.runSync();

  return { testId };
}
```

- [ ] **Step 4: Verificar que pasa**

Run (desde `app/`): `npm test -- src/lib/sync/__tests__/submitInspection.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Reescribir el hook `app/src/hooks/useSubmitInspection.ts`**

```ts
"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { localDB, enqueueSync, saveBlobLocally, deleteInspectionDraft } from "@/lib/db/local";
import { runSync } from "@/lib/sync/engine";
import { computeTemplateHash } from "@/lib/sync/hash";
import { submitInspectionOffline } from "@/lib/sync/submitInspection";
import { APP_VERSION, SCHEMA_VERSION } from "@/lib/version";
import { v4 as uuidv4 } from "uuid";
import type { InspectionState, MockInspectionTemplate } from "@/types/inspection";

interface SubmitResult { testId: string; }

export function useSubmitInspection() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (
    state: InspectionState,
    projectId: string,
    template: MockInspectionTemplate,
  ): Promise<SubmitResult | null> => {
    setIsSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesión expirada — iniciá sesión nuevamente");

      const result = await submitInspectionOffline(
        { state, projectId, userId: user.id, template },
        {
          db: localDB, enqueueSync, saveBlobLocally, deleteInspectionDraft,
          computeTemplateHash,
          fetchBlob: async (url) => (await fetch(url)).blob(),
          runSync,
          uuid: uuidv4,
          now: () => new Date().toISOString(),
          isOnline: () => typeof navigator === "undefined" ? true : navigator.onLine,
          appVersion: APP_VERSION, schemaVersion: SCHEMA_VERSION,
        },
      );
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submit, isSubmitting, error };
}
```

- [ ] **Step 6: Actualizar el call en summary page**

En `app/src/app/(workspace)/equipment/[equipmentId]/inspection/[templateId]/summary/page.tsx`, reemplazar:
```ts
    const result = await submit(state, equipment.project_id, template.code);
```
por:
```ts
    const result = await submit(state, equipment.project_id, template);
```
(`template` ya está disponible vía `useInspectionTemplate`.)

- [ ] **Step 7: Verificar tests + tipos**

Run (desde `app/`): `npm test -- src/lib/sync/__tests__/submitInspection.test.ts` → 2 passed.
Run (desde `app/`): `npx tsc --noEmit` → 0 errores.

- [ ] **Step 8: Commit**

```bash
git add app/src/lib/sync/submitInspection.ts app/src/lib/sync/__tests__/submitInspection.test.ts app/src/hooks/useSubmitInspection.ts "app/src/app/(workspace)/equipment/[equipmentId]/inspection/[templateId]/summary/page.tsx"
git commit -m "feat(offline): submit de inspeccion local-first con snapshot

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Extensión del motor — subida de blobs + sync_status

**Files:**
- Modify: `app/src/lib/sync/engine.ts`
- Create: `app/src/lib/sync/__tests__/engine.test.ts`

**Interfaces:**
- Consumes: `localDB`, cliente Supabase (con `.from().upsert()`, `.from().update().eq()`, `.storage.from().upload()`, `.storage.from().getPublicUrl()`).
- Produces: export `pushPendingOps(supabase): Promise<{ pushed: number; errors: string[] }>` (ya existe; se exporta + se extiende).

- [ ] **Step 1: Test (debe fallar) `app/src/lib/sync/__tests__/engine.test.ts`**

```ts
import { test, expect, beforeEach, vi } from "vitest";
import { pushPendingOps } from "@/lib/sync/engine";
import { localDB, saveBlobLocally } from "@/lib/db/local";

beforeEach(async () => {
  await Promise.all([
    localDB.syncQueue.clear(), localDB.tests.clear(),
    localDB.evidences.clear(), localDB.blobStore.clear(),
  ]);
});

function mockSupabase(opts: { failTests?: boolean } = {}) {
  const upserts: { table: string; payload: any }[] = [];
  const uploads: { path: string }[] = [];
  return {
    _upserts: upserts, _uploads: uploads,
    from(table: string) {
      return {
        upsert: async (payload: any) => {
          upserts.push({ table, payload });
          if (table === "tests" && opts.failTests) return { error: { message: "boom" } };
          return { error: null };
        },
        update() { return { eq: async () => ({ error: null }) }; },
      };
    },
    storage: {
      from() {
        return {
          upload: async (path: string) => { uploads.push({ path }); return { error: null }; },
          getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn/${path}` } }),
        };
      },
    },
  };
}

test("push: sube blob de evidencia, setea storage_url y marca synced (LWW por id)", async () => {
  await localDB.evidences.add({ id: "ev1", project_id: "p1", test_id: "t1", equipment_id: "e1", type: "foto", stage: "general", captured_at: "t", sync_status: "pending" } as any);
  await saveBlobLocally("ev1", new Blob(["x"], { type: "image/jpeg" }));
  await localDB.syncQueue.add({ entity: "evidences", entityId: "ev1", operation: "INSERT", payload: { id: "ev1", project_id: "p1", test_id: "t1", equipment_id: "e1", type: "foto", stage: "general", captured_at: "t", sync_status: "pending" }, createdAt: "t", attempts: 0 });

  const sb = mockSupabase();
  const res = await pushPendingOps(sb as any);

  expect(res.pushed).toBe(1);
  expect(sb._uploads.length).toBe(1);
  const up = sb._upserts.find((u) => u.table === "evidences")!;
  expect(up.payload.storage_url).toBe(`https://cdn/${sb._uploads[0].path}`);
  expect(up.payload.sync_status).toBe("synced");
  expect(up.payload.last_sync_error).toBeUndefined();
  expect(await localDB.blobStore.where("evidenceId").equals("ev1").count()).toBe(0); // blob borrado
  expect((await localDB.evidences.get("ev1"))?.sync_status).toBe("synced");
  expect(await localDB.syncQueue.count()).toBe(0);
});

test("retry/backoff: error incrementa attempts y guarda last_sync_error; a los 5 → failed", async () => {
  await localDB.tests.add({ id: "t1", project_id: "p1", status: "ejecutado", sync_status: "pending" } as any);
  await localDB.syncQueue.add({ entity: "tests", entityId: "t1", operation: "INSERT", payload: { id: "t1", project_id: "p1", status: "ejecutado", sync_status: "pending" }, createdAt: "t", attempts: 4 });

  const sb = mockSupabase({ failTests: true });
  const res = await pushPendingOps(sb as any);

  expect(res.pushed).toBe(0);
  const op = (await localDB.syncQueue.toArray())[0];
  expect(op.attempts).toBe(5);
  expect(op.lastError).toContain("boom");
  expect((await localDB.tests.get("t1"))?.sync_status).toBe("failed");
  expect((await localDB.tests.get("t1"))?.last_sync_error).toContain("boom");
});
```

- [ ] **Step 2: Verificar que falla**

Run (desde `app/`): `npm test -- src/lib/sync/__tests__/engine.test.ts`
Expected: FAIL (`pushPendingOps` no exportado / sin lógica de blobs).

- [ ] **Step 3: Modificar `app/src/lib/sync/engine.ts`**

3a. Importar el helper de blobs. En los imports superiores, cambiar:
```ts
import { localDB, type SyncOperation } from "@/lib/db/local";
```
por:
```ts
import { localDB, getBlobForEvidence, type SyncOperation } from "@/lib/db/local";
```

3b. Exportar y reescribir `pushPendingOps`. Reemplazar la función `async function pushPendingOps(...)` completa por:

```ts
// Tablas locales por entidad (para actualizar sync_status del registro)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function localTableFor(entity: string): any {
  const map: Record<string, unknown> = {
    tests: localDB.tests, evidences: localDB.evidences, equipment: localDB.equipment,
    punch_items: localDB.punchItems,
  };
  return map[entity];
}

export async function pushPendingOps(
  supabase: ReturnType<typeof createClient>
): Promise<{ pushed: number; errors: string[] }> {
  const ops = await localDB.syncQueue.orderBy("createdAt").toArray() as SyncOperation[];
  let pushed = 0;
  const errors: string[] = [];

  for (const op of ops) {
    if (op.attempts >= 5) {
      errors.push(`[SKIP] ${op.entity}/${op.entityId}: excedió 5 intentos`);
      continue;
    }
    const table = localTableFor(op.entity);
    try {
      if (table) await table.update(op.entityId, { sync_status: "syncing" });

      if (op.operation === "INSERT" || op.operation === "UPDATE") {
        // Copia saneada para el servidor: forzar synced y quitar campos solo-cliente
        const payload = { ...(op.payload as Record<string, unknown>) };
        delete payload.last_sync_error;
        if ("sync_status" in payload) payload.sync_status = "synced";

        // Evidencia: subir blob a Storage antes del upsert
        if (op.entity === "evidences") {
          const blob = await getBlobForEvidence(op.entityId);
          if (blob) {
            const ext = (blob.type.split("/")[1] ?? "jpg");
            const path = `${payload.project_id}/${payload.equipment_id}/${payload.test_id}/${op.entityId}.${ext}`;
            const { error: upErr } = await supabase.storage
              .from("evidences").upload(path, blob, { upsert: true, contentType: blob.type });
            if (upErr) throw upErr;
            const { data: urlData } = supabase.storage.from("evidences").getPublicUrl(path);
            payload.storage_url = urlData.publicUrl;
          }
        }

        const { error } = await supabase.from(op.entity).upsert(payload, { onConflict: "id" });
        if (error) throw error;

        if (op.entity === "evidences") {
          const rec = await localDB.blobStore.where("evidenceId").equals(op.entityId).first();
          if (rec?.id != null) await localDB.blobStore.delete(rec.id);
        }
      } else if (op.operation === "DELETE") {
        const { error } = await supabase.from(op.entity)
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", (op.payload as Record<string, unknown>).id);
        if (error) throw error;
      }

      await localDB.syncQueue.delete(op.id!);
      if (table) await table.update(op.entityId, { sync_status: "synced", last_sync_error: undefined });
      pushed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${op.entity}/${op.entityId}: ${msg}`);
      const attempts = op.attempts + 1;
      await localDB.syncQueue.update(op.id!, { attempts, lastError: msg });
      if (table) await table.update(op.entityId, {
        sync_status: attempts >= 5 ? "failed" : "pending", last_sync_error: msg,
      });
    }
  }
  return { pushed, errors };
}
```

> El resto de `engine.ts` (pull, runSync, setupAutoSync) no cambia; `runSync` sigue llamando `pushPendingOps(supabase)`.

- [ ] **Step 4: Verificar que pasa**

Run (desde `app/`): `npm test -- src/lib/sync/__tests__/engine.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/sync/engine.ts app/src/lib/sync/__tests__/engine.test.ts
git commit -m "feat(offline): push sube blobs de evidencia + ciclo sync_status/last_sync_error

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Fallback offline en hooks de lectura

**Files:**
- Modify: `app/src/hooks/useInspectionData.ts`, `app/src/hooks/useEquipmentStatusSync.ts`

**Interfaces:**
- Consumes: `localDB`, `assembleTemplate`, `enqueueSync`.
- Produces: los 3 hooks leen de Dexie cuando `!navigator.onLine` o el fetch falla; `useInspectionTemplate` cachea en `offlineTemplates` al cargar online; `syncEquipmentStatus` encola si está offline.

- [ ] **Step 1: `useEquipmentForInspection` — fallback offline**

En `useInspectionData.ts`, agregar import: `import { localDB } from "@/lib/db/local";`
En `useEquipmentForInspection`, envolver la rama real (no-mock) así:
```ts
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      if (!offline) {
        const supabase = createClient();
        const { data } = await supabase.from("equipment").select("*")
          .eq("id", equipmentId).is("deleted_at", null).single();
        if (data) { await localDB.equipment.put({ ...(data as any), sync_status: "synced" }); return data as Equipment; }
      }
      return (await localDB.equipment.get(equipmentId)) ?? null;
```

- [ ] **Step 2: `useEquipmentInspectionTemplates` — fallback offline**

En la rama real, tras el bloque que arma `result` desde el RPC, **antes** del `return result;`, cachear; y si offline, leer de Dexie. Reemplazar el cuerpo real (no-mock) por:
```ts
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      if (offline) {
        const row = await localDB.equipmentTemplateRefs.get(equipmentId);
        return row?.refs ?? [];
      }
      const supabase = createClient();
      const { data: rows, error } = await supabase.rpc("get_equipment_templates", { p_equipment_id: equipmentId });
      if (error) {
        const row = await localDB.equipmentTemplateRefs.get(equipmentId);
        if (row) return row.refs;
        throw error;
      }
      const seen = new Set<string>();
      const result: TemplateRef[] = [];
      for (const r of (rows ?? [])) {
        if (seen.has(r.template_id)) continue;
        seen.add(r.template_id);
        result.push({ id: r.template_id, code: r.template_key, name: r.template_name, discipline: r.discipline ?? "", source: r.source as TemplateRef["source"] });
      }
      await localDB.equipmentTemplateRefs.put({ equipmentId, refs: result, updatedAt: new Date().toISOString() });
      return result;
```

- [ ] **Step 3: `useInspectionTemplate` — cache online + fallback offline**

Reemplazar el cuerpo real (no-mock) que hoy quedó (Task 4 Step 4) por:
```ts
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      if (offline) {
        const row = await localDB.offlineTemplates.get(templateId);
        if (row) { row.template._source = "offline"; return row.template; }
        return null;
      }
      const supabase = createClient();
      const tpl = await assembleTemplate(supabase, templateId);
      if (tpl) {
        tpl._source = "online";
        await localDB.offlineTemplates.put({ id: templateId, template: tpl, updatedAt: new Date().toISOString() });
      }
      return tpl;
```

- [ ] **Step 4: `syncEquipmentStatus` offline-aware**

En `app/src/hooks/useEquipmentStatusSync.ts`, agregar imports:
```ts
import { localDB, enqueueSync } from "@/lib/db/local";
```
Dentro de `syncEquipmentStatus`, reemplazar el bloque `await supabase.from("equipment").update(patch).eq("id", equipmentId);` por:
```ts
    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    await localDB.equipment.update(equipmentId, patch as Record<string, unknown>);
    if (offline) {
      await enqueueSync("equipment", equipmentId, "UPDATE", { id: equipmentId, ...patch });
    } else {
      await supabase.from("equipment").update(patch).eq("id", equipmentId);
    }
```
(El `patch` ya se construye arriba en la función; solo cambia cómo se persiste.)

- [ ] **Step 5: Verificar tipos**

Run (desde `app/`): `npx tsc --noEmit`
Expected: 0 errores.

- [ ] **Step 6: Commit**

```bash
git add app/src/hooks/useInspectionData.ts app/src/hooks/useEquipmentStatusSync.ts
git commit -m "feat(offline): fallback offline en hooks de inspeccion + cache de plantillas

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: Migración de snapshot (número auto-detectado)

**Files:**
- Create: `database/migrations/<NNNN>_inspection_template_snapshot.sql` (número calculado)

- [ ] **Step 1: Detectar el siguiente número de migración**

Run (desde la raíz del repo): `ls database/migrations | grep -oE '^[0-9]{4}' | sort -n | tail -1`
Tomar ese valor `MAX` y calcular `NNNN = printf "%04d" $((10#$MAX + 1))`. Usar `NNNN` como prefijo del archivo. (Ej.: si MAX=0046 → archivo `0047_...`; si ya existiera 0047, será el siguiente disponible.)

- [ ] **Step 2: Crear el archivo de migración con ese nombre**

Contenido (idéntico salvo el número del nombre):
```sql
-- ============================================================
-- <NNNN> — Snapshot de plantilla por inspección (trazabilidad)
-- Aditivo/nullable. No modifica RLS ni el enum record_sync_status.
-- ============================================================
BEGIN;

ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS template_id        uuid REFERENCES public.form_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS template_revision  text,
  ADD COLUMN IF NOT EXISTS template_hash      text,
  ADD COLUMN IF NOT EXISTS template_snapshot  jsonb;

CREATE INDEX IF NOT EXISTS idx_tests_template_id ON public.tests(template_id);

COMMENT ON COLUMN public.tests.template_snapshot IS
  'Copia inmutable de la plantilla (definición + meta) tal como la vio el inspector.';

COMMIT;
```

- [ ] **Step 3: Verificar idempotencia**

Run (desde la raíz): `grep -c "IF NOT EXISTS" database/migrations/<NNNN>_inspection_template_snapshot.sql`
Expected: `5` (4 columnas + 1 índice).

- [ ] **Step 4: Commit**

```bash
git add database/migrations/<NNNN>_inspection_template_snapshot.sql
git commit -m "db: columnas de snapshot de plantilla en tests (<NNNN>)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

> El SQL lo aplica el usuario en Supabase (como las migraciones previas). No hay connection string en el entorno.

---

### Task 10: UI — Preparar offline + indicador de sync

**Files:**
- Create: `app/src/components/settings/OfflinePrepCard.tsx`, `app/src/components/sync/SyncStatusBadge.tsx`
- Modify: `app/src/app/(workspace)/projects/[projectId]/settings/page.tsx`, `app/src/components/layout/ProjectSidebar.tsx`

**Interfaces:**
- Consumes: `prepareProjectOffline`, `runSync`, `localDB`, `createClient`.

- [ ] **Step 1: `OfflinePrepCard.tsx`**

```tsx
"use client";
import { useState } from "react";
import { DownloadCloud, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { localDB } from "@/lib/db/local";
import { prepareProjectOffline } from "@/lib/sync/prefetch";

export function OfflinePrepCard({ projectId }: { projectId: string }) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<{ equipment: number; templates: number; errors: string[] } | null>(null);

  async function handlePrepare() {
    setBusy(true); setResult(null); setProgress({ done: 0, total: 0 });
    try {
      const res = await prepareProjectOffline(
        projectId,
        { client: createClient(), db: localDB },
        (done, total) => setProgress({ done, total }),
      );
      setResult(res);
    } finally { setBusy(false); }
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 max-w-xl">
      <div className="flex items-center gap-2 mb-2">
        <DownloadCloud size={16} className="text-blue-400" />
        <h3 className="text-sm font-semibold text-slate-200">Preparar para offline</h3>
      </div>
      <p className="text-xs text-slate-400 mb-3">
        Descarga equipos y plantillas del proyecto a este dispositivo para inspeccionar sin conexión.
      </p>
      <button onClick={handlePrepare} disabled={busy}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white">
        {busy ? <Loader2 size={13} className="animate-spin" /> : <DownloadCloud size={13} />}
        {busy ? "Descargando…" : "Descargar para offline"}
      </button>
      {progress && busy && (
        <p className="text-[11px] text-slate-500 mt-2">Plantillas/equipos: {progress.done}/{progress.total}</p>
      )}
      {result && (
        <div className="mt-3 text-[11px] text-slate-400">
          <p className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 size={12} /> {result.equipment} equipos · {result.templates} plantillas cacheadas
          </p>
          {result.errors.length > 0 && (
            <p className="text-amber-400 mt-1">{result.errors.length} con incidencias (revisar conexión)</p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Montar la card en settings**

En `app/src/app/(workspace)/projects/[projectId]/settings/page.tsx`, importar `import { OfflinePrepCard } from "@/components/settings/OfflinePrepCard";` y renderizar `<OfflinePrepCard projectId={projectId} />` dentro del contenedor de la página (junto a las demás cards de settings; `projectId` ya está disponible vía `useParams`).

- [ ] **Step 3: `SyncStatusBadge.tsx`**

```tsx
"use client";
import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { localDB } from "@/lib/db/local";
import { runSync } from "@/lib/sync/engine";

export function SyncStatusBadge() {
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    setPending(await localDB.syncQueue.count());
    setFailed(await localDB.syncQueue.filter((o) => o.attempts >= 5).count());
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [refresh]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try { await runSync(); } finally { setSyncing(false); refresh(); }
  }, [refresh]);

  if (pending === 0 && !syncing) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 px-2 py-1">
        <CheckCircle2 size={11} className="text-emerald-500" /> Sincronizado
      </div>
    );
  }

  return (
    <button onClick={handleSync} disabled={syncing}
      className="flex items-center gap-1.5 text-[10px] text-slate-300 px-2 py-1 rounded hover:bg-slate-800 w-full">
      {syncing ? <Loader2 size={11} className="animate-spin text-blue-400" />
        : failed > 0 ? <AlertTriangle size={11} className="text-amber-400" />
        : <RefreshCw size={11} className="text-blue-400" />}
      {syncing ? "Sincronizando…" : `${pending} pendiente(s)${failed > 0 ? ` · ${failed} con error` : ""}`}
    </button>
  );
}
```

- [ ] **Step 4: Montar el badge en `ProjectSidebar.tsx`**

Importar `import { SyncStatusBadge } from "@/components/sync/SyncStatusBadge";` y renderizar `<SyncStatusBadge />` en el footer del sidebar (cerca del logo Biotec, en la sección inferior).

- [ ] **Step 5: Verificar build**

Run (desde `app/`): `npx tsc --noEmit` → 0 errores.
Run (desde `app/`): `npx next build --webpack` → EXIT 0.

- [ ] **Step 6: Commit**

```bash
git add app/src/components/settings/OfflinePrepCard.tsx app/src/components/sync/SyncStatusBadge.tsx "app/src/app/(workspace)/projects/[projectId]/settings/page.tsx" app/src/components/layout/ProjectSidebar.tsx
git commit -m "feat(offline): UI preparar-offline + badge de sincronizacion

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 11: Smoke e2e Playwright offline

**Files:**
- Create: `app/e2e/offline-inspection.spec.ts`

> Este test requiere app corriendo + Supabase. Se incluye como spec ejecutable; correrlo es manual/CI (el entorno del agente puede no tener servidor). El agente lo escribe y verifica que **tipa/lintea**, no que pase en vivo.

- [ ] **Step 1: Escribir el spec**

```ts
import { test, expect } from "@playwright/test";

// Pre-requisito: usuario logueado y un proyecto con equipos preparados para offline.
// Ajustar BASE_URL/credenciales/IDs al entorno antes de correr.
test("captura offline → sync al reconectar", async ({ page, context }) => {
  await page.goto("/");                       // login asumido vía storageState
  // 1. Preparar offline (online)
  await page.goto("/projects/PROJECT_ID/settings");
  await page.getByRole("button", { name: /Descargar para offline/i }).click();
  await expect(page.getByText(/plantillas cacheadas/i)).toBeVisible({ timeout: 30000 });

  // 2. Ir offline
  await context.setOffline(true);

  // 3. Abrir inspección de un equipo preparado y guardarla
  await page.goto("/equipment/EQUIPMENT_ID/inspection/TEMPLATE_ID");
  await expect(page.getByText(/Datos Generales|Check List|Verificación/i).first()).toBeVisible();
  // (rellenar mínimos según la plantilla, luego ir a summary y guardar)
  await page.goto("/equipment/EQUIPMENT_ID/inspection/TEMPLATE_ID/summary");
  await page.getByRole("button", { name: /Guardar|Generar/i }).first().click();

  // 4. Badge muestra pendiente
  await expect(page.getByText(/pendiente/i)).toBeVisible();

  // 5. Reconectar → auto-sync
  await context.setOffline(false);
  await expect(page.getByText(/Sincronizado/i)).toBeVisible({ timeout: 30000 });
});
```

- [ ] **Step 2: Verificar tipos del spec**

Run (desde `app/`): `npx tsc --noEmit`
Expected: 0 errores (el spec usa `@playwright/test`, ya instalado).

- [ ] **Step 3: Commit**

```bash
git add app/e2e/offline-inspection.spec.ts
git commit -m "test(e2e): smoke playwright captura offline + sync

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Notas de implementación

- **Orden de dependencias:** T1→T2 son base. T3 (hash) y T9 (migración) son independientes tras T2. T4→T5, T6 (usa T2/T3), T7 (usa T2), T8 (usa T2/T4/T5). T10 (usa T5/T6/T7). T11 al final.
- **Sin `checklist_items`:** las respuestas viven en `tests.data` (igual que hoy); este sprint no normaliza checklist (fuera de alcance).
- **`uuid`** ya es dependencia del repo (`usePunch` lo usa). No instalar nada extra salvo Vitest/fake-indexeddb (T1).
- **No** modificar el enum `record_sync_status` ni las RLS. El push sanea el payload (fuerza `sync_status='synced'`, elimina `last_sync_error`).
- Si `npx next build --webpack` falla por un archivo nuevo no incluido en git, verificar `git status` (lección previa: Vercel falla con archivos importados pero untracked).
