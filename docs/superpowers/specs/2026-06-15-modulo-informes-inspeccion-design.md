# Módulo Informes — Listado de Inspección de Equipos

**Fecha:** 2026-06-15  
**Proyecto:** PrecomisionamientoProjects  
**Enfoque:** A (HTML print) + C (xlsx export)

---

## 1. Contexto

Se necesita un módulo de "Documentos de Salida" que permita generar e imprimir informes profesionales con los datos del proyecto. El primer informe replica la hoja **"1.1. Inspeccion"** del Excel `1 INSPECCION EQUIPOS ELECTROMEC.xlsx` (proyecto BIOTEC JUN 2026 / LDC Brasil).

El diseño se validó iterativamente en URL local usando el visual companion. El documento imprimible replica fielmente la estructura del Excel original: encabezado con logos, tabla de equipos con subcolumnas de potencia, formato condicional por estado, y bloque de 3 firmantes.

---

## 2. Arquitectura y rutas

### 2.1 Rutas nuevas

```
app/src/app/(workspace)/projects/[projectId]/
├── reports/
│   ├── page.tsx                  ← índice de informes disponibles
│   └── inspeccion/
│       └── page.tsx              ← documento imprimible + botón Export Excel
│
└── equipment/page.tsx            ← MODIFICAR: agregar botón "Generar Listado Inspección"

app/src/app/api/reports/
└── inspeccion-xlsx/
    └── route.ts                  ← GET ?projectId=xxx → devuelve .xlsx (SheetJS)

app/src/components/reports/
├── InspeccionPrintView.tsx       ← documento completo imprimible
├── InspeccionHeader.tsx          ← encabezado: logos + info proyecto + título
├── InspeccionTable.tsx           ← tabla de equipos con todas las columnas
├── InspeccionSignatures.tsx      ← bloque 3 firmantes
└── ReportIndexCard.tsx           ← tarjeta en el índice de informes
```

### 2.2 Navegación

- **Sidebar:** nueva entrada "Informes" (ícono 🖨️) entre Punch List y Documentos, con sub-ítem "Listado Inspección"
- **Equipos:** botón contextual "Generar Listado Inspección" en la cabecera de la página de equipos

### 2.3 Hook de datos

```ts
// app/src/hooks/useInspeccionReport.ts
useInspeccionReport(projectId: string)
// Fetcha en paralelo:
//   - project + client_company (nombre, logo_url)
//   - equipment[] con área via subsystem→system→area JOIN
//   - evidences[] por equipment_id
//   - tests[] type='fat' por project_id
```

---

## 3. Estructura del documento imprimible

### 3.1 Orientación y tamaño

- Página: A4 horizontal (landscape), `@media print { @page { size: A4 landscape; margin: 10mm; } }`
- Fuente base: Arial 8px para datos, 11px para título

### 3.2 Encabezado (filas 3–6 del Excel)

Distribución de columnas (proporcional al Excel original):

| Zona | Cols Excel | Contenido | Fuente datos |
|------|-----------|-----------|--------------|
| Logo empresa | C3:D6 | `<img src={company.logo_url} />` + fallback texto | `companies.logo_url` |
| Sep | E | vacío | — |
| Etiqueta | F3–F5 | "Cliente" / "Proyecto" / "Ubicación" — **texto izquierda**, fondo amarillo claro | hardcoded |
| Valor | G3–H5 | Valor real — ocupa G+H (178px) para no desbordarse | `project.client_company.name` / `project.name` / `project.location` |
| Sep | I–J | vacío (separador natural) | — |
| Título | K3:N3 | "LISTADO DE INSPECCIÓN DE EQUIPOS ELECTROMECÁNICOS" | hardcoded |
| Subtítulo | K5:N5 | `project.name` dinámico | `project.name` |
| Logo cliente | V3:V5 | `<img src={client_company.logo_url} />` + fallback texto | `project.client_company.logo_url` |

**Reglas:**
- Etiquetas (F): `text-align: left; padding-left: 6px; background: #fef9c3`
- Valores (G+H): `width: 178px; white-space: normal; word-break: break-word`
- Fecha: **NO aparece en el encabezado** — solo en bloque de firmas

### 3.3 Banda "Esquemas de verificación" (fila 7)

`F7:J7` — fondo `#0f172a`, texto blanco, `ESQUEMAS DE VERIFICACIÓN`

### 3.4 Tabla de equipos (filas 8–44+)

**Cabecera (filas 8–9, celdas combinadas):**

| Col(s) Excel | Header fila 8 | Subfila 9 | Notas |
|-------------|--------------|-----------|-------|
| A (Act. JCB) | "Act. JCB" | — | rowspan=2 |
| B (Est.) | "Est." | — | rowspan=2 |
| C8:C9 | "ITEM" | — | rowspan=2 |
| D8:D9 | "TAG" | — | rowspan=2 |
| E8:E9 | "ÁREA" | — | rowspan=2 |
| F8:G9 | "APLICACIÓN" | — | rowspan=2, colspan=2 |
| H8:I8 | "POTENCIA DEMANDADA" | "kW" / "HP" | colspan=2 |
| J8:J9 | "Pot. Inst. kW" | — | rowspan=2 |
| K8:K9 | "FOTO EQUIPO INSTALADO" | — | rowspan=2 |
| L8:L9 | "FOTO DATOS DE PLACA" | — | rowspan=2 |
| M8:M9 | "MANUAL CATÁLOGO" | — | rowspan=2 |
| N8:N9 | "PROTOCOLOS PRUEBAS FAT" | — | rowspan=2 |
| O8:S9 | (reservadas — ocultas, editables) | — | rowspan=2, no se imprimen |
| T8:U8 | "CONFORME" | "SI" / "NO" | colspan=2 |
| V8:V9 | "OBSERVACIONES" | — | rowspan=2 |

**Filas de datos — mapeo a Supabase:**

| Col | Campo | Cálculo |
|-----|-------|---------|
| A | Estado visual | `equipment.status === 'aprobado'` → "✓" |
| B | Estado texto | `aprobado`→"OK" / `pendiente`→"PEND" / `rechazado`→"NC" |
| C | ITEM | índice secuencial (1, 2, 3…) |
| D | TAG | `equipment.tag` |
| E | ÁREA | `area.name` (via subsystem→system→area) |
| F+G | APLICACIÓN | `equipment.name` |
| H | Pot. Demandada kW | `equipment.power_kw` |
| I | Pot. Demandada HP | `power_kw ? (power_kw * 1.341022).toFixed(1) : ""` |
| J | Pot. Instalada kW | `equipment.power_installed_kw` *(campo nuevo)* |
| K | Foto equipo | URL primera evidencia `stage='durante'` o ícono 📷 |
| L | Foto placa | URL primera evidencia `stage='antes'` o ícono 📷 |
| M | Manual/Catálogo | referencia documental de `documents` |
| N | Protocolos FAT | `tests.code` donde `type='fat'` |
| O–S | — | vacías (ocultas, reservadas) |
| T | Conforme SI | "✓" si `status === 'aprobado'` |
| U | Conforme NO | "✓" si `status === 'rechazado'` |
| V | Observaciones | `tests.data?.observations` o texto libre |

**Separadores de área:** fila especial entre grupos, fondo `#1e3a5f`, texto `#93c5fd`, "▸ ÁREA: LODOS / BIOGAS"

**Formato condicional:**
- `status === 'aprobado'` → fondo verde claro `#f0fdf4`
- `status === 'pendiente'` → fondo amarillo `#fefce8`
- `status === 'rechazado'` → fondo rojo `#fee2e2`

### 3.5 Bloque de firmas (filas 48–51)

3 columnas iguales:

| Columna | Organización | Rol |
|---------|-------------|-----|
| 1 | POR BIOTEC | Responsable |
| 2 | POR BIOTEC | Revisa |
| 3 | POR LDC | Aprueba |

Cada bloque contiene:
- Organización (azul, bold)
- Rol
- Línea de firma (espacio en blanco de 22px)
- Campo Nombre (línea vacía)
- Campo Cargo (línea vacía)
- **Fecha al final:** etiqueta gris claro `color: #94a3b8` + indicación `DD / MM / AAAA` en cursiva — el firmante escribe a mano

---

## 4. Campo nuevo: `power_installed_kw`

**Migración Supabase:**
```sql
ALTER TABLE equipment ADD COLUMN power_installed_kw numeric;
```

**Tipo TypeScript** (`src/types/index.ts`):
```ts
interface Equipment {
  // ... campos existentes ...
  power_installed_kw?: number;  // Potencia instalada en kW (col J del listado)
}
```

**UI:** agregar campo en el formulario de edición de equipo, junto a `power_kw` existente.

---

## 5. Logos

| Logo | Celda | Fuente | Fallback |
|------|-------|--------|----------|
| Empresa (contratista) | C3:D6 | `user.company.logo_url` — empresa del usuario logueado (`user.company_id → companies.logo_url`) | Texto "LOGO EMPRESA" en recuadro azul punteado |
| Cliente | V3:V5 | `project.client_company.logo_url` | Texto "LOGO CLIENTE" en recuadro verde punteado |

Si `logo_url` no existe en `companies`, se usa `companies.metadata.logo_url` como campo alternativo.  
El hook fetcha `user.company` junto con el proyecto para tener ambos logos disponibles.

---

## 6. Export .xlsx (SheetJS)

**Ruta API:** `GET /api/reports/inspeccion-xlsx?projectId=xxx`

**Entrega:**
- Archivo `INSPECCION_[PROYECTO]_[FECHA].xlsx`
- Celdas combinadas replicando el Excel original
- Fórmula HP: `=IF(H10="","",H10*1.341022)` en col I
- Formato condicional por estado
- Columnas O–S incluidas pero ocultas (`hidden: true`)
- Bloque de firmas en filas 48–51

---

## 7. CSS Print

```css
@media print {
  .ui-controls { display: none; }   /* barra superior no imprime */
  @page { size: A4 landscape; margin: 10mm; }
  table { page-break-inside: auto; }
  tr { page-break-inside: avoid; }
  tr.area-row { page-break-before: auto; }
}
```

---

## 8. Sidebar — entrada nueva

Archivo: `app/src/components/layout/Sidebar.tsx`

Nueva entrada entre "Punch List" y "Documentos":
```tsx
{ href: `/projects/${projectId}/reports`, icon: Printer, label: "Informes" }
```

---

## 9. Fuera de scope (primera versión)

- Otros informes (Check Características, En Revisión) — solo tarjeta "Próximamente"
- Columnas O–S con contenido real
- Subir logos desde la UI (se gestiona directo en Supabase Storage)
- Paginación automática con saltos de página entre áreas
