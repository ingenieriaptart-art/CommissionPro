# Sprint Técnico — Correcciones Críticas C-01 / C-02 / C-03

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir tres hallazgos críticos confirmados en auditoría post-sprint: import roto de pdf-parse en runtime (C-03), ausencia de .gitignore en raíz del repo (C-02), y falta de RLS en `project_members`, `signatures` y `mv_project_stats` (C-01).

**Architecture:** Tres cambios independientes y de bajo riesgo: (1) reescribir `extractFromPDF` para usar la API de clase de pdf-parse v2.x, eliminando también el `@types/pdf-parse` de v1.x que genera conflicto; (2) crear `.gitignore` en la raíz; (3) migración SQL 0018 que agrega una función `SECURITY DEFINER` para evitar recursión infinita al habilitar RLS en `project_members`, luego activa RLS en las tres tablas/vistas. No se modifican políticas existentes.

**Tech Stack:** TypeScript, Next.js 16 App Router (Node.js runtime), pdf-parse v2.4.5 (API de clase), PostgreSQL/Supabase.

---

## File Map

| Acción | Archivo | Responsabilidad |
|--------|---------|----------------|
| MODIFY | `app/src/app/api/process-document/route.ts:103-119` | Reescribir `extractFromPDF` con API v2 de pdf-parse |
| MODIFY | `app/package.json` | Eliminar `@types/pdf-parse` (tipos v1.x incompatibles con v2.x) |
| CREATE | `.gitignore` (raíz del repo) | Cubrir `.env*` y archivos sensibles fuera de `app/` |
| CREATE | `database/migrations/0018_rls_project_members_signatures.sql` | Función helper SECURITY DEFINER + RLS en 3 objetos |

---

## Task 1: Fix C-03 — Reescribir `extractFromPDF` para pdf-parse v2.x

**Contexto:** pdf-parse pasó de v1.x (función `pdfParse(buffer)`) a v2.x (clase `PDFParse({ data: Uint8Array })`). El import actual `require("pdf-parse/lib/pdf-parse.js")` apunta a una ruta que no existe en v2.x. Además, `@types/pdf-parse` en devDependencies cubre la API v1.x y genera conflicto de tipos.

**Files:**
- Modify: `app/src/app/api/process-document/route.ts:103-119`
- Modify: `app/package.json` (eliminar `@types/pdf-parse`)

- [ ] **Step 1: Eliminar @types/pdf-parse de package.json**

En `app/package.json`, dentro de `devDependencies`, elimina la línea:
```json
"@types/pdf-parse": "^1.1.5",
```
Luego ejecuta:
```
cd app && npm install
```
Resultado esperado: `node_modules/@types/pdf-parse/` desaparece.

- [ ] **Step 2: Reemplazar la función extractFromPDF**

En `app/src/app/api/process-document/route.ts`, reemplaza las líneas 103-119 (la función completa `extractFromPDF`):

```ts
async function extractFromPDF(buffer: Buffer): Promise<TextChunk[]> {
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    await parser.destroy();
    return [{ text: result.text ?? "", page: 1, source: "pdf" }];
  } catch {
    const raw     = buffer.toString("latin1");
    const blocks  = raw.match(/BT[\s\S]{1,500}?ET/g) ?? [];
    const strings: string[] = [];
    for (const block of blocks) {
      const tjs = block.match(/\(([^)]{1,100})\)\s*Tj/g) ?? [];
      for (const m of tjs) {
        const v = m.match(/\(([^)]+)\)/)?.[1];
        if (v) strings.push(v);
      }
    }
    return [{ text: strings.join(" "), source: "pdf-basic" }];
  }
}
```

- [ ] **Step 3: Verificar TypeScript**

```
cd app && npx tsc --noEmit
```
Resultado esperado: exit 0, sin errores.

- [ ] **Step 4: Verificar que el warning de build desapareció**

```
cd app && npx next build --webpack 2>&1
```
Resultado esperado: build con EXIT_CODE 0. La línea `Module not found: Package path ./lib/pdf-parse.js` **no debe aparecer**.

- [ ] **Step 5: Commit**

```bash
git add app/src/app/api/process-document/route.ts app/package.json app/package-lock.json
git commit -m "fix: migrar extractFromPDF a API de clase de pdf-parse v2.x (C-03)"
```

---

## Task 2: Fix C-02 — .gitignore en raíz del repositorio

**Contexto:** El único `.gitignore` existe en `app/.gitignore`. Archivos sensibles creados fuera de `app/` (scripts en raíz, `.env` en raíz) no están cubiertos. Un `git add .` desde la raíz puede incluir `app/.env.local`.

**Files:**
- Create: `.gitignore` (en la raíz: `C:\Users\USUARIO\Documents\CodigoIA\PrecomisionamientoProjects\.gitignore`)

- [ ] **Step 1: Crear el archivo .gitignore en la raíz**

Crea el archivo `.gitignore` en la raíz del repositorio con este contenido exacto:

```gitignore
# Variables de entorno — nunca commitear
.env
.env.*
*.env
app/.env.local
app/.env.*.local

# Scripts temporales de debugging (pueden contener credenciales)
query_*.js
pw_*.js
insert_*.js
migrate_*.js
seed_*.js
fix_*.js

# Directorios temporales
.tmp/
temp/

# OS
.DS_Store
Thumbs.db
desktop.ini

# IDEs
.vscode/settings.json
.idea/

# Node (scripts raíz o herramientas auxiliares)
node_modules/

# Logs
*.log
npm-debug.log*
```

- [ ] **Step 2: Verificar cobertura de .env.local**

```bash
git check-ignore -v app/.env.local
```
Resultado esperado: `.gitignore:4:app/.env.local   app/.env.local`

Si no aparece, verificar que el patrón `app/.env.local` está en el archivo y que git lo reconoce. Alternativa: usar `*.env.local` como patrón.

- [ ] **Step 3: Verificar que git status no muestra .env.local como untracked**

```bash
git status
```
`app/.env.local` NO debe aparecer en "Untracked files".

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git commit -m "chore: agregar .gitignore en raíz del repositorio (C-02)"
```

---

## Task 3: Fix C-01 — Migración 0018: RLS en project_members, signatures y mv_project_stats

**Contexto técnico crítico:** Habilitar RLS en `project_members` directamente causaría recursión infinita. Las políticas existentes en otras tablas (ej. `projects_select`) usan subqueries inline como `(SELECT project_id FROM project_members WHERE user_id = auth.uid())`. Si `project_members` tiene RLS, esas subqueries disparan la política de `project_members`, que a su vez consulta `project_members`... loop infinito.

**Solución:** Función `get_accessible_project_ids()` con `SECURITY DEFINER`. Las funciones SECURITY DEFINER ejecutan con los permisos del owner (normalmente postgres/service_role) y **no** se les aplica RLS. El loop se rompe porque cuando la política de `project_members` evalúa `get_accessible_project_ids()`, esa función consulta `project_members` sin RLS.

**Files:**
- Create: `database/migrations/0018_rls_project_members_signatures.sql`

- [ ] **Step 1: Crear la migración SQL**

Crea `database/migrations/0018_rls_project_members_signatures.sql`:

```sql
-- ============================================================
-- 0018 — RLS: project_members, signatures, mv_project_stats
-- ============================================================
-- SECURITY DEFINER en get_accessible_project_ids() rompe la recursión:
-- las subqueries inline de otras tablas que consultan project_members
-- seguirán funcionando porque SECURITY DEFINER bypasea RLS.
-- ============================================================

-- ── Helper SECURITY DEFINER ────────────────────────────────
-- Devuelve los project_ids accesibles para auth.uid().
-- NO aplica RLS al consultar project_members → rompe la recursión.
CREATE OR REPLACE FUNCTION get_accessible_project_ids()
  RETURNS SETOF uuid
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  SET search_path = public
AS $$
  SELECT project_id
  FROM public.project_members
  WHERE user_id = auth.uid();
$$;

-- ── project_members ────────────────────────────────────────
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Un usuario ve los miembros de todos los proyectos a los que pertenece.
-- La policy llama a get_accessible_project_ids() (SECURITY DEFINER)
-- para evitar recursión.
CREATE POLICY project_members_select ON project_members
  FOR SELECT USING (
    project_id IN (SELECT get_accessible_project_ids())
  );

-- INSERT/DELETE de miembros: solo via service_role (gestión admin).
-- Se amplía en sprint futuro cuando se implemente UI de gestión de miembros.

-- ── signatures ─────────────────────────────────────────────
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;

-- Un usuario ve firmas de tests que pertenezcan a sus proyectos.
CREATE POLICY signatures_select ON signatures
  FOR SELECT USING (
    test_id IN (
      SELECT t.id
      FROM tests t
      WHERE t.project_id IN (SELECT get_accessible_project_ids())
        AND t.deleted_at IS NULL
    )
  );

-- Un usuario puede insertar su propia firma en tests de sus proyectos.
CREATE POLICY signatures_insert ON signatures
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND test_id IN (
      SELECT t.id
      FROM tests t
      WHERE t.project_id IN (SELECT get_accessible_project_ids())
        AND t.deleted_at IS NULL
    )
  );

-- ── mv_project_stats (vista materializada) ─────────────────
ALTER TABLE mv_project_stats ENABLE ROW LEVEL SECURITY;

-- Un usuario solo ve stats de proyectos a los que pertenece.
CREATE POLICY mv_project_stats_select ON mv_project_stats
  FOR SELECT USING (
    project_id IN (SELECT get_accessible_project_ids())
  );

-- ── ROLLBACK ───────────────────────────────────────────────
-- DROP POLICY IF EXISTS project_members_select ON project_members;
-- ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS signatures_select ON signatures;
-- DROP POLICY IF EXISTS signatures_insert ON signatures;
-- ALTER TABLE signatures DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS mv_project_stats_select ON mv_project_stats;
-- ALTER TABLE mv_project_stats DISABLE ROW LEVEL SECURITY;
-- DROP FUNCTION IF EXISTS get_accessible_project_ids();
```

- [ ] **Step 2: Aplicar en Supabase SQL Editor**

Copia el contenido completo de `0018_rls_project_members_signatures.sql` y ejecútalo en el SQL Editor del proyecto Supabase `nkjunkolsmjledzwuxgn`.

Confirma que no hay errores. Si aparece "policy already exists", asegúrate de que la migración no fue aplicada parcialmente antes.

- [ ] **Step 3: Smoke test — verificar que la app no se rompe**

```
cd app && npm run dev
```
Navega a la app y verifica:
1. La lista de proyectos carga correctamente.
2. Entrando a un proyecto, los equipos y tests son visibles.
3. El dashboard del proyecto carga KPIs.

Si algo falla (lista vacía, errores 500), ejecutar el bloque ROLLBACK en SQL Editor antes de continuar.

- [ ] **Step 4: Verificar RLS activo en Supabase Dashboard**

En Supabase → Table Editor, confirma que las tablas `project_members` y `signatures` muestran "RLS enabled". Para `mv_project_stats`, verificar en SQL Editor:

```sql
SELECT schemaname, matviewname
FROM pg_matviews
WHERE matviewname = 'mv_project_stats';

-- Verificar que la policy existe
SELECT policyname, tablename
FROM pg_policies
WHERE tablename IN ('project_members', 'signatures', 'mv_project_stats');
```

Resultado esperado: 4 filas (project_members_select, signatures_select, signatures_insert, mv_project_stats_select).

- [ ] **Step 5: Commit**

```bash
git add database/migrations/0018_rls_project_members_signatures.sql
git commit -m "feat: RLS en project_members, signatures y mv_project_stats — migración 0018 (C-01)"
```

---

## Verificación Final del Sprint Técnico

- [ ] Build sin warning de pdf-parse:
  ```
  cd app && npx next build --webpack 2>&1 | Select-String "pdf-parse"
  ```
  Resultado esperado: 0 líneas (warning desaparecido).

- [ ] TypeScript limpio:
  ```
  cd app && npx tsc --noEmit
  ```
  Resultado esperado: exit 0.

- [ ] .gitignore cubre app/.env.local:
  ```
  git check-ignore -v app/.env.local
  ```
  Resultado esperado: ruta cubierta por .gitignore raíz.

- [ ] RLS activo (4 políticas en SQL Editor):
  ```sql
  SELECT policyname, tablename FROM pg_policies
  WHERE tablename IN ('project_members','signatures','mv_project_stats')
  ORDER BY tablename;
  ```
  Resultado esperado: 4 filas.
