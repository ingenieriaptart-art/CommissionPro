# Módulo Informes — Listado de Inspección de Equipos

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear el módulo "Informes" que genera e imprime un Listado de Inspección de Equipos Electromecánicos en formato A4 landscape, replicando la hoja "1.1. Inspeccion" del Excel original, con botón de exportación .xlsx.

**Architecture:** HTML page con `@media print` (enfoque A) + API route con SheetJS para descargar .xlsx (enfoque C). Hook `useInspeccionReport` fetcha en paralelo proyecto, equipos con área, evidencias y pruebas FAT. Nuevas rutas bajo `(workspace)/projects/[projectId]/reports/`.

**Tech Stack:** Next.js App Router, React Query, Supabase, SheetJS (`xlsx`), Tailwind CSS, Lucide icons.

---

## File Map

**Crear:**
- `app/src/hooks/useInspeccionReport.ts` — fetcha todos los datos del informe
- `app/src/components/reports/InspeccionHeader.tsx` — encabezado con logos, info proyecto, título
- `app/src/components/reports/InspeccionTable.tsx` — tabla con cabecera de 2 filas y datos por equipo
- `app/src/components/reports/InspeccionSignatures.tsx` — bloque 3 firmantes con guías de fecha
- `app/src/components/reports/InspeccionPrintView.tsx` — wrapper que compone los 3 componentes
- `app/src/components/reports/ReportIndexCard.tsx` — tarjeta de informe para el índice
- `app/src/app/(workspace)/projects/[projectId]/reports/page.tsx` — índice de informes
- `app/src/app/(workspace)/projects/[projectId]/reports/inspeccion/page.tsx` — página imprimible
- `app/src/app/api/reports/inspeccion-xlsx/route.ts` — GET ?projectId=xxx → .xlsx

**Modificar:**
- `app/src/types/index.ts` — agregar `power_installed_kw?: number` a `Equipment`
- `app/src/components/layout/ProjectSidebar.tsx` — agregar entrada "Informes" en `navItems`
- `app/src/app/(workspace)/projects/[projectId]/equipment/page.tsx` — agregar botón contextual

---

## Task 1: Migración Supabase — power_installed_kw

**Files:**
- No files in repo — ejecutar SQL en Supabase Dashboard

- [ ] **Step 1: Ejecutar migración en Supabase SQL Editor**

Ir a https://supabase.com → proyecto → SQL Editor → New Query:

```sql
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS power_installed_kw numeric;
COMMENT ON COLUMN equipment.power_installed_kw IS 'Potencia instalada en kW (col J del listado de inspección)';
```

Ejecutar y verificar que no arroje error. La columna es nullable — los equipos existentes quedan con NULL.

- [ ] **Step 2: Verificar en Table Editor**

En Supabase → Table Editor → equipment: confirmar que aparece la columna `power_installed_kw` de tipo `numeric`.

---

## Task 2: Actualizar tipo Equipment

**Files:**
- Modify: `app/src/types/index.ts:161` (después de `power_kw?: number;`)

- [ ] **Step 1: Agregar el campo al interface**

En `app/src/types/index.ts`, localizar `power_kw?: number;` (línea ~161) y agregar debajo:

```ts
  power_installed_kw?: number;
```

El bloque queda:
```ts
  power_kw?: number;
  power_installed_kw?: number;
  ccm_panel?: string;
```

- [ ] **Step 2: Verificar compilación**

```bash
cd app && npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add app/src/types/index.ts
git commit -m "feat(types): add power_installed_kw to Equipment interface"
```

---

## Task 3: Hook useInspeccionReport

**Files:**
- Create: `app/src/hooks/useInspeccionReport.ts`

El hook fetcha en paralelo: proyecto+empresa+logo, equipos con área (via subsystem→system→area JOIN), evidencias y pruebas FAT. Usa el patrón online/offline de `useProject.ts`.

- [ ] **Step 1: Crear el hook**

Crear `app/src/hooks/useInspeccionReport.ts`:

```ts
"use client";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Equipment, Project, Company } from "@/types";

export interface EquipmentWithArea extends Equipment {
  area_name?: string;
  subsystem?: { system?: { area?: { name: string } } };
}

export interface Evidence {
  id: string;
  equipment_id: string;
  stage: "antes" | "durante" | "despues" | "general";
  file_url: string;
  file_type: string;
}

export interface FatTest {
  id: string;
  equipment_id: string;
  code?: string;
  data?: { observations?: string } & Record<string, unknown>;
}

export interface InspeccionReportData {
  project: Project & { client_company?: Company & { logo_url?: string; metadata?: { logo_url?: string } } };
  contractorCompany?: Company & { logo_url?: string; metadata?: { logo_url?: string } };
  equipment: EquipmentWithArea[];
  evidences: Evidence[];
  fatTests: FatTest[];
}

export function useInspeccionReport(projectId: string) {
  return useQuery<InspeccionReportData | null>({
    queryKey: ["inspeccion-report", projectId],
    queryFn: async () => {
      if (!navigator.onLine) return null;
      const supabase = createClient();

      const [projectRes, equipmentRes, evidencesRes, fatTestsRes, userRes] =
        await Promise.all([
          supabase
            .from("projects")
            .select("*, client_company:companies(id, name, type, nit, metadata)")
            .eq("id", projectId)
            .single(),
          supabase
            .from("equipment")
            .select(`
              *,
              subsystem:subsystems(
                id, name,
                system:systems(
                  id, name,
                  area:areas(id, name)
                )
              )
            `)
            .eq("project_id", projectId)
            .is("deleted_at", null)
            .order("tag"),
          supabase
            .from("evidences")
            .select("id, equipment_id, stage, file_url, file_type")
            .eq("project_id", projectId),
          supabase
            .from("tests")
            .select("id, equipment_id, code, data")
            .eq("project_id", projectId)
            .eq("type", "fat"),
          supabase.auth.getUser(),
        ]);

      if (projectRes.error) throw projectRes.error;

      let contractorCompany: InspeccionReportData["contractorCompany"] | undefined;
      if (userRes.data.user) {
        const { data: userData } = await supabase
          .from("users")
          .select("company_id, company:companies(id, name, metadata)")
          .eq("id", userRes.data.user.id)
          .single();
        contractorCompany = userData?.company as typeof contractorCompany;
      }

      const equipmentList = (equipmentRes.data ?? []) as EquipmentWithArea[];
      equipmentList.forEach((eq) => {
        eq.area_name = eq.subsystem?.system?.area?.name ?? "";
      });

      return {
        project: projectRes.data as InspeccionReportData["project"],
        contractorCompany,
        equipment: equipmentList,
        evidences: (evidencesRes.data ?? []) as Evidence[],
        fatTests: (fatTestsRes.data ?? []) as FatTest[],
      };
    },
    enabled: !!projectId,
    staleTime: 2 * 60_000,
  });
}
```

- [ ] **Step 2: Verificar compilación**

```bash
cd app && npx tsc --noEmit
```

Expected: sin errores relacionados al hook.

- [ ] **Step 3: Commit**

```bash
git add app/src/hooks/useInspeccionReport.ts
git commit -m "feat(reports): hook useInspeccionReport para datos del listado de inspección"
```

---

## Task 4: Componente InspeccionHeader

**Files:**
- Create: `app/src/components/reports/InspeccionHeader.tsx`

Encabezado con logos (C3:D6 y V3:V5 del Excel), info de cliente/proyecto/ubicación (F3:H5), título+subtítulo (K3:N5).

- [ ] **Step 1: Crear el componente**

Crear `app/src/components/reports/InspeccionHeader.tsx`:

```tsx
import type { InspeccionReportData } from "@/hooks/useInspeccionReport";

function getLogoUrl(company?: { logo_url?: string; metadata?: { logo_url?: string } }): string | null {
  if (!company) return null;
  return company.logo_url ?? company.metadata?.logo_url ?? null;
}

interface Props {
  data: InspeccionReportData;
}

export function InspeccionHeader({ data }: Props) {
  const { project, contractorCompany } = data;
  const clientCompany = project.client_company;

  const contractorLogo = getLogoUrl(contractorCompany);
  const clientLogo = getLogoUrl(clientCompany as Parameters<typeof getLogoUrl>[0]);

  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "8px",
        marginBottom: 0,
        tableLayout: "fixed",
      }}
    >
      <colgroup>
        {/* C+D: logo empresa ~80px */}
        <col style={{ width: "80px" }} />
        {/* E: separador */}
        <col style={{ width: "12px" }} />
        {/* F: etiqueta */}
        <col style={{ width: "56px" }} />
        {/* G+H: valor */}
        <col style={{ width: "178px" }} />
        {/* I-J: separador */}
        <col style={{ width: "24px" }} />
        {/* K-N: título (4 cols ~240px) */}
        <col style={{ width: "60px" }} />
        <col style={{ width: "60px" }} />
        <col style={{ width: "60px" }} />
        <col style={{ width: "60px" }} />
        {/* O-U: vacío */}
        <col style={{ width: "56px" }} />
        {/* V: logo cliente ~80px */}
        <col style={{ width: "80px" }} />
      </colgroup>
      <tbody>
        {/* Fila 3 */}
        <tr>
          <td
            rowSpan={4}
            style={{
              border: "1px solid #94a3b8",
              padding: "4px",
              textAlign: "center",
              verticalAlign: "middle",
            }}
          >
            {contractorLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={contractorLogo} alt="Logo empresa" style={{ maxHeight: "54px", maxWidth: "72px", objectFit: "contain" }} />
            ) : (
              <span style={{ color: "#2563eb", fontSize: "7px", fontWeight: 700, border: "1px dashed #2563eb", padding: "6px", display: "block" }}>
                LOGO<br />EMPRESA
              </span>
            )}
          </td>
          <td />
          <td style={{ background: "#fef9c3", border: "1px solid #e2e8f0", padding: "3px 6px", fontWeight: 600, textAlign: "left" }}>
            Cliente
          </td>
          <td style={{ border: "1px solid #e2e8f0", padding: "3px 6px", whiteSpace: "normal", wordBreak: "break-word" }}>
            {clientCompany?.name ?? "—"}
          </td>
          <td />
          <td
            colSpan={4}
            rowSpan={1}
            style={{
              border: "1px solid #94a3b8",
              padding: "4px 8px",
              fontWeight: 700,
              fontSize: "9px",
              textAlign: "center",
              verticalAlign: "middle",
              background: "#f8fafc",
              textTransform: "uppercase",
              letterSpacing: "0.3px",
            }}
          >
            LISTADO DE INSPECCIÓN DE EQUIPOS ELECTROMECÁNICOS
          </td>
          <td />
          <td
            rowSpan={3}
            style={{
              border: "1px solid #94a3b8",
              padding: "4px",
              textAlign: "center",
              verticalAlign: "middle",
            }}
          >
            {clientLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={clientLogo} alt="Logo cliente" style={{ maxHeight: "42px", maxWidth: "72px", objectFit: "contain" }} />
            ) : (
              <span style={{ color: "#16a34a", fontSize: "7px", fontWeight: 700, border: "1px dashed #16a34a", padding: "6px", display: "block" }}>
                LOGO<br />CLIENTE
              </span>
            )}
          </td>
        </tr>
        {/* Fila 4 */}
        <tr>
          <td />
          <td style={{ background: "#fef9c3", border: "1px solid #e2e8f0", padding: "3px 6px", fontWeight: 600, textAlign: "left" }}>
            Proyecto
          </td>
          <td style={{ border: "1px solid #e2e8f0", padding: "3px 6px", whiteSpace: "normal", wordBreak: "break-word" }}>
            {project.name}
          </td>
          <td />
          <td colSpan={4} />
          <td />
        </tr>
        {/* Fila 5 */}
        <tr>
          <td />
          <td style={{ background: "#fef9c3", border: "1px solid #e2e8f0", padding: "3px 6px", fontWeight: 600, textAlign: "left" }}>
            Ubicación
          </td>
          <td style={{ border: "1px solid #e2e8f0", padding: "3px 6px", whiteSpace: "normal", wordBreak: "break-word" }}>
            {project.location ?? "—"}
          </td>
          <td />
          <td
            colSpan={4}
            style={{
              border: "1px solid #94a3b8",
              padding: "3px 8px",
              textAlign: "center",
              verticalAlign: "middle",
              fontSize: "8px",
              fontWeight: 600,
            }}
          >
            {project.name}
          </td>
          <td />
        </tr>
        {/* Fila 6 — cierra rowspan logo empresa */}
        <tr>
          <td />
          <td />
          <td />
          <td />
          <td colSpan={4} />
          <td />
        </tr>
        {/* Banda "Esquemas de verificación" */}
        <tr>
          <td
            colSpan={11}
            style={{
              background: "#0f172a",
              color: "#fff",
              fontWeight: 700,
              padding: "3px 8px",
              fontSize: "8px",
              letterSpacing: "0.5px",
            }}
          >
            ESQUEMAS DE VERIFICACIÓN
          </td>
        </tr>
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2: Verificar compilación**

```bash
cd app && npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add app/src/components/reports/InspeccionHeader.tsx
git commit -m "feat(reports): componente InspeccionHeader con logos e info de proyecto"
```

---

## Task 5: Componente InspeccionTable

**Files:**
- Create: `app/src/components/reports/InspeccionTable.tsx`

Tabla con cabecera doble (filas 8-9) y filas de datos por equipo. Columna A eliminada. Separadores de área. Formato condicional por status. Columnas O-S vacías (no se imprimen).

- [ ] **Step 1: Crear el componente**

Crear `app/src/components/reports/InspeccionTable.tsx`:

```tsx
import type { EquipmentWithArea, Evidence, FatTest } from "@/hooks/useInspeccionReport";
import type { EquipmentStatus } from "@/types";

const STATUS_LABEL: Record<EquipmentStatus, string> = {
  pendiente: "PEND",
  en_ejecucion: "EJEC",
  aprobado: "OK",
  rechazado: "NC",
  bloqueado: "BLOQ",
  listo_energizacion: "L-EN",
  listo_arranque: "L-AR",
  operativo: "OPER",
  futuro: "FUT",
};

const STATUS_BG: Partial<Record<EquipmentStatus, string>> = {
  aprobado: "#f0fdf4",
  pendiente: "#fefce8",
  rechazado: "#fee2e2",
};

const cell: React.CSSProperties = {
  border: "1px solid #94a3b8",
  padding: "2px 4px",
  fontSize: "7.5px",
  verticalAlign: "middle",
  whiteSpace: "nowrap",
};

const cellWrap: React.CSSProperties = {
  ...cell,
  whiteSpace: "normal",
  wordBreak: "break-word",
};

const thStyle: React.CSSProperties = {
  ...cell,
  background: "#1e3a5f",
  color: "#fff",
  fontWeight: 700,
  textAlign: "center",
  fontSize: "7px",
};

interface Props {
  equipment: EquipmentWithArea[];
  evidences: Evidence[];
  fatTests: FatTest[];
}

export function InspeccionTable({ equipment, evidences, fatTests }: Props) {
  // Agrupar por área
  const byArea: Record<string, EquipmentWithArea[]> = {};
  for (const eq of equipment) {
    const key = eq.area_name ?? "Sin área";
    if (!byArea[key]) byArea[key] = [];
    byArea[key].push(eq);
  }

  const evidencesByEquipment: Record<string, Evidence[]> = {};
  for (const ev of evidences) {
    if (!evidencesByEquipment[ev.equipment_id]) evidencesByEquipment[ev.equipment_id] = [];
    evidencesByEquipment[ev.equipment_id].push(ev);
  }

  const fatByEquipment: Record<string, FatTest[]> = {};
  for (const t of fatTests) {
    if (t.equipment_id) {
      if (!fatByEquipment[t.equipment_id]) fatByEquipment[t.equipment_id] = [];
      fatByEquipment[t.equipment_id].push(t);
    }
  }

  let seqNum = 0;

  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "7.5px",
        tableLayout: "fixed",
      }}
    >
      <colgroup>
        <col style={{ width: "28px" }} />   {/* B: Est. */}
        <col style={{ width: "28px" }} />   {/* C: ITEM */}
        <col style={{ width: "52px" }} />   {/* D: TAG */}
        <col style={{ width: "52px" }} />   {/* E: ÁREA */}
        <col style={{ width: "110px" }} />  {/* F+G: APLICACIÓN */}
        <col style={{ width: "32px" }} />   {/* H: kW dem. */}
        <col style={{ width: "32px" }} />   {/* I: HP dem. */}
        <col style={{ width: "38px" }} />   {/* J: kW inst. */}
        <col style={{ width: "38px" }} />   {/* K: Foto equipo */}
        <col style={{ width: "38px" }} />   {/* L: Foto placa */}
        <col style={{ width: "38px" }} />   {/* M: Manual */}
        <col style={{ width: "38px" }} />   {/* N: FAT */}
        <col style={{ width: "22px" }} />   {/* T: SI */}
        <col style={{ width: "22px" }} />   {/* U: NO */}
        <col />                              {/* V: Observaciones */}
      </colgroup>
      <thead>
        <tr>
          <th style={thStyle} rowSpan={2}>Est.</th>
          <th style={thStyle} rowSpan={2}>ITEM</th>
          <th style={thStyle} rowSpan={2}>TAG</th>
          <th style={thStyle} rowSpan={2}>ÁREA</th>
          <th style={thStyle} rowSpan={2} colSpan={2}>APLICACIÓN</th>
          <th style={thStyle} colSpan={2}>POTENCIA DEMANDADA</th>
          <th style={thStyle} rowSpan={2}>Pot. Inst.<br />kW</th>
          <th style={thStyle} rowSpan={2}>FOTO<br />EQUIPO</th>
          <th style={thStyle} rowSpan={2}>FOTO<br />PLACA</th>
          <th style={thStyle} rowSpan={2}>MANUAL/<br />CATÁLOGO</th>
          <th style={thStyle} rowSpan={2}>PROTOCOLOS<br />FAT</th>
          <th style={thStyle} colSpan={2}>CONFORME</th>
          <th style={thStyle} rowSpan={2}>OBSERVACIONES</th>
        </tr>
        <tr>
          <th style={thStyle}>kW</th>
          <th style={thStyle}>HP</th>
          <th style={thStyle}>SI</th>
          <th style={thStyle}>NO</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(byArea).map(([areaName, eqs]) => (
          <>
            <tr key={`area-${areaName}`}>
              <td
                colSpan={15}
                style={{
                  background: "#1e3a5f",
                  color: "#93c5fd",
                  fontWeight: 700,
                  padding: "3px 8px",
                  fontSize: "7.5px",
                }}
              >
                ▸ ÁREA: {areaName.toUpperCase()}
              </td>
            </tr>
            {eqs.map((eq) => {
              seqNum++;
              const bg = STATUS_BG[eq.status] ?? "#fff";
              const eqEvidences = evidencesByEquipment[eq.id] ?? [];
              const fotoEquipo = eqEvidences.find((e) => e.stage === "durante");
              const fotoPlaca = eqEvidences.find((e) => e.stage === "antes");
              const fats = fatByEquipment[eq.id] ?? [];
              const hpVal = eq.power_kw ? (eq.power_kw * 1.341022).toFixed(1) : "";
              const obs = fats[0]?.data?.observations ?? "";

              return (
                <tr key={eq.id} style={{ background: bg }}>
                  <td style={{ ...cell, textAlign: "center", fontWeight: 700 }}>
                    {STATUS_LABEL[eq.status] ?? eq.status}
                  </td>
                  <td style={{ ...cell, textAlign: "center" }}>{seqNum}</td>
                  <td style={cell}>{eq.tag}</td>
                  <td style={cellWrap}>{eq.area_name ?? ""}</td>
                  <td style={{ ...cellWrap, whiteSpace: "normal" }} colSpan={2}>
                    {eq.name}
                  </td>
                  <td style={{ ...cell, textAlign: "right" }}>
                    {eq.power_kw ?? ""}
                  </td>
                  <td style={{ ...cell, textAlign: "right" }}>{hpVal}</td>
                  <td style={{ ...cell, textAlign: "right" }}>
                    {eq.power_installed_kw ?? ""}
                  </td>
                  <td style={{ ...cell, textAlign: "center" }}>
                    {fotoEquipo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={fotoEquipo.file_url} alt="foto" style={{ maxWidth: "32px", maxHeight: "24px", objectFit: "cover" }} />
                    ) : (
                      <span style={{ color: "#94a3b8" }}>📷</span>
                    )}
                  </td>
                  <td style={{ ...cell, textAlign: "center" }}>
                    {fotoPlaca ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={fotoPlaca.file_url} alt="placa" style={{ maxWidth: "32px", maxHeight: "24px", objectFit: "cover" }} />
                    ) : (
                      <span style={{ color: "#94a3b8" }}>📷</span>
                    )}
                  </td>
                  <td style={{ ...cell, textAlign: "center" }}>—</td>
                  <td style={{ ...cell, textAlign: "center" }}>
                    {fats.length > 0 ? fats.map((f) => f.code).join(", ") : "—"}
                  </td>
                  <td style={{ ...cell, textAlign: "center", color: "#16a34a", fontWeight: 700 }}>
                    {eq.status === "aprobado" ? "✓" : ""}
                  </td>
                  <td style={{ ...cell, textAlign: "center", color: "#dc2626", fontWeight: 700 }}>
                    {eq.status === "rechazado" ? "✓" : ""}
                  </td>
                  <td style={cellWrap}>{obs}</td>
                </tr>
              );
            })}
          </>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2: Verificar compilación**

```bash
cd app && npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add app/src/components/reports/InspeccionTable.tsx
git commit -m "feat(reports): componente InspeccionTable con grupos por área y formato condicional"
```

---

## Task 6: Componente InspeccionSignatures

**Files:**
- Create: `app/src/components/reports/InspeccionSignatures.tsx`

Bloque de 3 firmantes. Cada uno: organización (azul bold), rol, línea de firma, nombre, cargo, guía de fecha en gris.

- [ ] **Step 1: Crear el componente**

Crear `app/src/components/reports/InspeccionSignatures.tsx`:

```tsx
const SIGNATORIES = [
  { org: "POR BIOTEC", role: "Responsable" },
  { org: "POR BIOTEC", role: "Revisa" },
  { org: "POR LDC",   role: "Aprueba" },
];

export function InspeccionSignatures() {
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        marginTop: "24px",
        fontSize: "8px",
      }}
    >
      <tbody>
        <tr>
          {SIGNATORIES.map((sig, i) => (
            <td
              key={i}
              style={{
                width: "33.33%",
                border: "1px solid #94a3b8",
                padding: "8px 16px",
                verticalAlign: "top",
              }}
            >
              <div style={{ color: "#1d4ed8", fontWeight: 700, fontSize: "9px", marginBottom: "2px" }}>
                {sig.org}
              </div>
              <div style={{ color: "#475569", marginBottom: "22px" }}>{sig.role}</div>
              <div style={{ borderBottom: "1px solid #1e293b", marginBottom: "4px" }} />
              <div style={{ color: "#94a3b8", marginBottom: "6px" }}>Nombre: ___________________________</div>
              <div style={{ color: "#94a3b8", marginBottom: "10px" }}>Cargo: ____________________________</div>
              <div style={{ color: "#cbd5e1", fontSize: "7px" }}>
                Fecha: <em style={{ color: "#94a3b8" }}>DD / MM / AAAA</em>
              </div>
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/src/components/reports/InspeccionSignatures.tsx
git commit -m "feat(reports): componente InspeccionSignatures con 3 firmantes y guía de fecha"
```

---

## Task 7: InspeccionPrintView wrapper + CSS print

**Files:**
- Create: `app/src/components/reports/InspeccionPrintView.tsx`

Wrapper que compone Header, Table y Signatures. Incluye estilos `@media print` inline para que Tailwind no interfiera con la impresión.

- [ ] **Step 1: Crear el wrapper**

Crear `app/src/components/reports/InspeccionPrintView.tsx`:

```tsx
import type { InspeccionReportData } from "@/hooks/useInspeccionReport";
import { InspeccionHeader } from "./InspeccionHeader";
import { InspeccionTable } from "./InspeccionTable";
import { InspeccionSignatures } from "./InspeccionSignatures";

const PRINT_STYLES = `
@media print {
  body * { visibility: hidden; }
  .inspeccion-print-root,
  .inspeccion-print-root * { visibility: visible; }
  .inspeccion-print-root { position: absolute; top: 0; left: 0; width: 100%; }
  .ui-controls { display: none !important; }
  @page { size: A4 landscape; margin: 10mm; }
  table { page-break-inside: auto; }
  tr { page-break-inside: avoid; }
}
`;

interface Props {
  data: InspeccionReportData;
}

export function InspeccionPrintView({ data }: Props) {
  return (
    <>
      <style>{PRINT_STYLES}</style>
      <div
        className="inspeccion-print-root"
        style={{
          fontFamily: "Arial, sans-serif",
          fontSize: "8px",
          color: "#1e293b",
          background: "#fff",
          padding: "8px",
          maxWidth: "100%",
        }}
      >
        <InspeccionHeader data={data} />
        <InspeccionTable
          equipment={data.equipment}
          evidences={data.evidences}
          fatTests={data.fatTests}
        />
        <InspeccionSignatures />
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/src/components/reports/InspeccionPrintView.tsx
git commit -m "feat(reports): InspeccionPrintView wrapper con estilos @media print landscape"
```

---

## Task 8: ReportIndexCard

**Files:**
- Create: `app/src/components/reports/ReportIndexCard.tsx`

Tarjeta de informe para la página índice.

- [ ] **Step 1: Crear el componente**

Crear `app/src/components/reports/ReportIndexCard.tsx`:

```tsx
import Link from "next/link";
import { Printer } from "lucide-react";

interface Props {
  title: string;
  description: string;
  href?: string;
  comingSoon?: boolean;
}

export function ReportIndexCard({ title, description, href, comingSoon }: Props) {
  const content = (
    <div
      className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${
        comingSoon
          ? "border-dashed border-slate-200 opacity-50"
          : "border-slate-200 hover:border-blue-400 hover:shadow-sm cursor-pointer"
      }`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 flex-shrink-0">
        <Printer size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 text-sm">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      {!comingSoon && (
        <span className="text-xs font-medium text-blue-600 flex-shrink-0">
          Abrir →
        </span>
      )}
      {comingSoon && (
        <span className="text-xs text-slate-400 flex-shrink-0">Próximamente</span>
      )}
    </div>
  );

  if (comingSoon || !href) return content;
  return <Link href={href}>{content}</Link>;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/src/components/reports/ReportIndexCard.tsx
git commit -m "feat(reports): componente ReportIndexCard para el índice de informes"
```

---

## Task 9: Página índice de informes

**Files:**
- Create: `app/src/app/(workspace)/projects/[projectId]/reports/page.tsx`

- [ ] **Step 1: Crear la página**

Crear `app/src/app/(workspace)/projects/[projectId]/reports/page.tsx`:

```tsx
"use client";
import { use } from "react";
import { ReportIndexCard } from "@/components/reports/ReportIndexCard";

interface Props { params: Promise<{ projectId: string }> }

export default function ReportsPage({ params }: Props) {
  const { projectId } = use(params);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Informes</h1>
        <p className="text-slate-500 text-sm mt-1">Documentos de salida del proyecto</p>
      </div>

      <div className="space-y-3 max-w-2xl">
        <ReportIndexCard
          title="Listado de Inspección de Equipos"
          description="Electromecánicos · Precomisionamiento · Formato horizontal A4"
          href={`/projects/${projectId}/reports/inspeccion`}
        />
        <ReportIndexCard
          title="Check Características"
          description="Resumen de especificaciones técnicas"
          comingSoon
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/src/app/(workspace)/projects/[projectId]/reports/page.tsx"
git commit -m "feat(reports): página índice de informes del proyecto"
```

---

## Task 10: Página del documento — reports/inspeccion/page.tsx

**Files:**
- Create: `app/src/app/(workspace)/projects/[projectId]/reports/inspeccion/page.tsx`

Página cliente que muestra el documento imprimible con barra de controles (botón Print, botón Export xlsx).

- [ ] **Step 1: Crear la página**

Crear `app/src/app/(workspace)/projects/[projectId]/reports/inspeccion/page.tsx`:

```tsx
"use client";
import { use } from "react";
import { useInspeccionReport } from "@/hooks/useInspeccionReport";
import { InspeccionPrintView } from "@/components/reports/InspeccionPrintView";
import { Button } from "@/components/ui/Button";
import { Printer, Download, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSession } from "@/hooks/useSession";

interface Props { params: Promise<{ projectId: string }> }

export default function InspeccionReportPage({ params }: Props) {
  const { projectId } = use(params);
  const { data, isLoading, isError } = useInspeccionReport(projectId);
  const { session } = useSession();

  function handlePrint() {
    window.print();
  }

  async function handleExportXlsx() {
    const res = await fetch(
      `/api/reports/inspeccion-xlsx?projectId=${projectId}`,
      {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
      }
    );
    if (!res.ok) {
      alert("Error al generar el Excel");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const projectName = data?.project.name?.replace(/\s+/g, "_").toUpperCase() ?? "PROYECTO";
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    a.download = `INSPECCION_${projectName}_${today}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      {/* Barra de controles — oculta al imprimir */}
      <div className="ui-controls flex items-center justify-between mb-4 flex-wrap gap-3">
        <Link
          href={`/projects/${projectId}/reports`}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft size={15} />
          Informes
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            icon={<Download size={15} />}
            onClick={handleExportXlsx}
            disabled={!data}
          >
            Exportar .xlsx
          </Button>
          <Button
            icon={<Printer size={15} />}
            onClick={handlePrint}
            disabled={!data}
          >
            Imprimir / PDF
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="py-12 text-center text-slate-500 text-sm">Cargando informe…</div>
      )}
      {isError && (
        <div className="py-12 text-center text-red-500 text-sm">Error al cargar los datos del informe.</div>
      )}
      {!isLoading && !data && !isError && (
        <div className="py-12 text-center text-slate-400 text-sm">Sin conexión — datos no disponibles.</div>
      )}
      {data && <InspeccionPrintView data={data} />}
    </>
  );
}
```

- [ ] **Step 2: Verificar que `useSession` existe**

```bash
cd app && ls src/hooks/ | grep -i session
```

Si no existe, reemplazar `useSession` con la forma de obtener sesión existente en el proyecto. Buscar el patrón en otros hooks o páginas:

```bash
grep -r "auth.getSession\|useSession" app/src --include="*.ts" --include="*.tsx" -l
```

Adaptar el `handleExportXlsx` para usar el token de la forma que el proyecto ya lo hace (ej.: `createClient().auth.getSession()`).

- [ ] **Step 3: Verificar compilación**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add "app/src/app/(workspace)/projects/[projectId]/reports/inspeccion/page.tsx"
git commit -m "feat(reports): página documento imprimible listado de inspección"
```

---

## Task 11: Entrada "Informes" en ProjectSidebar

**Files:**
- Modify: `app/src/components/layout/ProjectSidebar.tsx`

Agregar `FileOutput` (o `Printer`) icon y nueva entrada entre `punch` y `documents`.

- [ ] **Step 1: Modificar el sidebar**

En `app/src/components/layout/ProjectSidebar.tsx`:

1. Agregar `Printer` al import de lucide-react (línea 9):

```ts
import {
  LayoutDashboard, Wrench, CheckSquare, AlertTriangle,
  FileText, Settings, ChevronLeft, ArrowLeft, Zap, Cpu, Map,
  ClipboardList, Activity, Home, Printer,
} from "lucide-react";
```

2. En el array `navItems` (línea 12), agregar la nueva entrada entre `punch` y `documents`:

```ts
const navItems = [
  { segment: "dashboard",   icon: LayoutDashboard, label: "Dashboard"    },
  { segment: "equipment",   icon: Wrench,          label: "Equipos"      },
  { segment: "plant-map",   icon: Map,             label: "Mapa de Planta" },
  { segment: "ic02-rtu",    icon: Activity,        label: "Instrumentos IC02" },
  { segment: "tests",       icon: CheckSquare,     label: "Pruebas"      },
  { segment: "punch",       icon: AlertTriangle,   label: "Punch List"   },
  { segment: "reports",     icon: Printer,         label: "Informes"     },
  { segment: "documents",   icon: FileText,        label: "Documentos"   },
  { segment: "templates",   icon: ClipboardList,   label: "Templates"    },
  { segment: "engineering", icon: Cpu,             label: "Ing. Digital" },
];
```

- [ ] **Step 2: Commit**

```bash
git add app/src/components/layout/ProjectSidebar.tsx
git commit -m "feat(sidebar): agregar entrada Informes en sidebar del proyecto"
```

---

## Task 12: Botón contextual en página de Equipos

**Files:**
- Modify: `app/src/app/(workspace)/projects/[projectId]/equipment/page.tsx`

Agregar botón "Listado Inspección" al área de acciones del header (junto a "Nuevo equipo").

- [ ] **Step 1: Agregar import y botón**

En `app/src/app/(workspace)/projects/[projectId]/equipment/page.tsx`:

1. Agregar `useRouter` y `FileOutput` al import (línea 1-12):

```tsx
import { use, useState }   from "react";
import { useRouter }        from "next/navigation";
import { useSearchParams }  from "next/navigation";
import { useEquipment, useCreateEquipment } from "@/hooks/useEquipment";
import { Card }             from "@/components/ui/Card";
import { Button }           from "@/components/ui/Button";
import { Input }            from "@/components/ui/Input";
import { Select }           from "@/components/ui/Select";
import { EquipmentStatusBadge } from "@/components/ui/StatusBadge";
import { Badge }            from "@/components/ui/Badge";
import { Plus, Wrench, Search, ScanSearch, FileOutput } from "lucide-react";
import { TagSearchModal }   from "@/components/shared/TagSearchModal";
import type { Equipment, Criticality } from "@/types";
```

2. Agregar `const router = useRouter();` dentro del componente, después de `useCreateEquipment`.

3. En el div de acciones (junto al botón "Nuevo equipo"), agregar antes del botón Nuevo:

```tsx
<Button
  variant="outline"
  icon={<FileOutput size={16} />}
  onClick={() => router.push(`/projects/${projectId}/reports/inspeccion`)}
>
  Listado Inspección
</Button>
```

- [ ] **Step 2: Verificar compilación**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add "app/src/app/(workspace)/projects/[projectId]/equipment/page.tsx"
git commit -m "feat(equipment): botón contextual Listado Inspección en header de equipos"
```

---

## Task 13: API Route — inspeccion-xlsx (SheetJS)

**Files:**
- Create: `app/src/app/api/reports/inspeccion-xlsx/route.ts`

GET ?projectId=xxx → devuelve archivo .xlsx con estructura replicada del Excel original. Requiere el paquete `xlsx` (SheetJS).

- [ ] **Step 1: Instalar SheetJS**

```bash
cd app && npm install xlsx
```

Expected: `xlsx` agregado a `package.json`.

- [ ] **Step 2: Crear la API route**

Crear `app/src/app/api/reports/inspeccion-xlsx/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET(req: NextRequest) {
  const supabase = serviceClient();
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (token) {
    const { error } = await supabase.auth.getUser(token);
    if (error) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId requerido" }, { status: 400 });

  const [projectRes, equipmentRes] = await Promise.all([
    supabase
      .from("projects")
      .select("*, client_company:companies(name)")
      .eq("id", projectId)
      .single(),
    supabase
      .from("equipment")
      .select(`
        id, tag, name, status, power_kw, power_installed_kw,
        subsystem:subsystems(system:systems(area:areas(name)))
      `)
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("tag"),
  ]);

  if (projectRes.error) return NextResponse.json({ error: projectRes.error.message }, { status: 500 });

  const project = projectRes.data;
  const equipment = (equipmentRes.data ?? []) as Array<{
    id: string; tag: string; name: string; status: string;
    power_kw?: number; power_installed_kw?: number;
    subsystem?: { system?: { area?: { name: string } } };
  }>;

  const wb = XLSX.utils.book_new();
  const wsData: (string | number | null)[][] = [];

  // Fila 1-2: vacías (espacio para logos)
  wsData.push([], []);

  // Fila 3: encabezado proyecto
  wsData.push([null, null, null, null, "Cliente", (project.client_company as { name: string } | null)?.name ?? "", null, null, null, null, "LISTADO DE INSPECCIÓN DE EQUIPOS ELECTROMECÁNICOS"]);
  wsData.push([null, null, null, null, "Proyecto", project.name]);
  wsData.push([null, null, null, null, "Ubicación", project.location ?? ""]);
  wsData.push([]);

  // Fila 7: banda
  wsData.push([null, null, null, null, "ESQUEMAS DE VERIFICACIÓN"]);

  // Fila 8: cabecera col
  wsData.push([
    "Est.", "ITEM", "TAG", "ÁREA", "APLICACIÓN", "",
    "kW dem.", "HP dem.", "Pot. Inst. kW",
    "FOTO EQUIPO", "FOTO PLACA", "MANUAL/CATÁLOGO", "PROTOCOLOS FAT",
    "SI", "NO", "OBSERVACIONES",
  ]);

  // Filas de datos
  equipment.forEach((eq, i) => {
    const hp = eq.power_kw ? { f: `G${wsData.length + 1}*1.341022` } : null;
    wsData.push([
      eq.status === "aprobado" ? "OK" : eq.status === "rechazado" ? "NC" : "PEND",
      i + 1,
      eq.tag,
      eq.subsystem?.system?.area?.name ?? "",
      eq.name,
      "",
      eq.power_kw ?? null,
      hp as unknown as string | null,
      eq.power_installed_kw ?? null,
      "", "", "", "",
      eq.status === "aprobado" ? "✓" : "",
      eq.status === "rechazado" ? "✓" : "",
      "",
    ]);
  });

  // Firmas
  wsData.push([], []);
  wsData.push(["POR BIOTEC", null, null, null, null, "POR BIOTEC", null, null, null, null, "POR LDC"]);
  wsData.push(["Responsable", null, null, null, null, "Revisa", null, null, null, null, "Aprueba"]);
  wsData.push([]);
  wsData.push(["Nombre:", null, null, null, null, "Nombre:", null, null, null, null, "Nombre:"]);
  wsData.push(["Cargo:", null, null, null, null, "Cargo:", null, null, null, null, "Cargo:"]);
  wsData.push(["Fecha: DD/MM/AAAA", null, null, null, null, "Fecha: DD/MM/AAAA", null, null, null, null, "Fecha: DD/MM/AAAA"]);

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Ocultar columnas O-S (índices 14-18 en base-0, pero en xlsx son cols N-R → O-S 1-indexed)
  ws["!cols"] = Array.from({ length: 16 }, (_, i) => {
    if (i >= 13 && i <= 17) return { hidden: true, wch: 10 };
    return { wch: i === 4 ? 35 : 12 };
  });

  XLSX.utils.book_append_sheet(wb, ws, "1.1. Inspeccion");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const projectName = project.name.replace(/\s+/g, "_").toUpperCase();
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="INSPECCION_${projectName}_${today}.xlsx"`,
    },
  });
}
```

- [ ] **Step 3: Verificar compilación**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/src/app/api/reports/inspeccion-xlsx/route.ts app/package.json app/package-lock.json
git commit -m "feat(reports): API route inspeccion-xlsx con SheetJS para exportar .xlsx"
```

---

## Task 14: Prueba de extremo a extremo en local

- [ ] **Step 1: Levantar servidor de desarrollo**

```bash
cd app && npm run dev
```

- [ ] **Step 2: Verificar sidebar**

Abrir `http://localhost:3000/projects/9023a92f-.../dashboard` (usar el project_id del proyecto Zipaquirá).

Confirmar que aparece "Informes" en el sidebar entre "Punch List" y "Documentos".

- [ ] **Step 3: Verificar índice de informes**

Navegar a `/projects/[id]/reports`. Deben verse dos tarjetas: "Listado de Inspección de Equipos" (activa) y "Check Características" (próximamente).

- [ ] **Step 4: Verificar documento imprimible**

Navegar a `/projects/[id]/reports/inspeccion`. Debe verse:
- Barra de controles con botones "Exportar .xlsx" e "Imprimir / PDF"
- Encabezado con logos (o placeholders), campos Cliente/Proyecto/Ubicación, título centrado
- Tabla con separadores de área, datos de equipos, columnas kW/HP/kW-inst, checkmarks Conforme
- Bloque de 3 firmantes con guías de fecha

- [ ] **Step 5: Verificar impresión**

Ctrl+P en el browser → seleccionar "A4", orientación "Horizontal" → confirmar que la barra de controles no aparece y el documento luce como el Excel original.

- [ ] **Step 6: Verificar botón contextual en Equipos**

Navegar a `/projects/[id]/equipment`. Confirmar que aparece el botón "Listado Inspección" junto a "Nuevo equipo". Al hacer clic, redirige a `/reports/inspeccion`.

- [ ] **Step 7: Verificar export .xlsx**

Clic en "Exportar .xlsx". Se descarga un archivo `INSPECCION_[PROYECTO]_[FECHA].xlsx`. Abrirlo en Excel o LibreOffice para confirmar que tiene los datos del proyecto.

---

## Self-Review

### Spec coverage

| Requisito spec | Task |
|---------------|------|
| Migración `power_installed_kw` | Task 1 |
| Actualizar tipo Equipment | Task 2 |
| Hook `useInspeccionReport` | Task 3 |
| `InspeccionHeader` (logos + info + título) | Task 4 |
| `InspeccionTable` (cabecera 2 filas, datos, áreas) | Task 5 |
| `InspeccionSignatures` (3 firmantes + fecha guía) | Task 6 |
| `InspeccionPrintView` wrapper + CSS print | Task 7 |
| `ReportIndexCard` | Task 8 |
| Página índice `reports/page.tsx` | Task 9 |
| Página documento `reports/inspeccion/page.tsx` | Task 10 |
| Sidebar entrada "Informes" | Task 11 |
| Botón contextual en equipos | Task 12 |
| API route xlsx con SheetJS | Task 13 |
| Prueba E2E en local | Task 14 |

Columna A (Act. JCB) eliminada: ✅ no aparece en ningún componente.  
Etiquetas izquierda, valores G+H: ✅ Task 4.  
Fecha solo en firmas, guía gris: ✅ Task 6.  
Columnas O-S ocultas en xlsx: ✅ Task 13.  
CSS @page landscape: ✅ Task 7.  
Logo empresa = user.company: ✅ Task 3 (fetcha `users.company`).  
Logo cliente = project.client_company: ✅ Task 3 + Task 4.

### Notas importantes para el implementador

1. **`useSession`** — si el hook no existe, buscar con `grep -r "getSession" app/src --include="*.ts" --include="*.tsx"` y adaptar `handleExportXlsx` en Task 10 para obtener el token de sesión con `createClient().auth.getSession()`.

2. **`companies.logo_url`** — si la columna no existe en Supabase, los logos salen del fallback de placeholder. El hook ya maneja `metadata.logo_url` como alternativa.

3. **project_id Zipaquirá** — para pruebas locales usar el project_id `9023a92f-...` que es el proyecto foco.
