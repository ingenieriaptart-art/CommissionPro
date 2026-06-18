# Import de Formularios de Precomisionamiento de Instrumentos

Fecha: 2026-06-18
Estado: Aprobado

## Objetivo

Cargar al sistema los 12 formularios de checklist de precomisionamiento de
instrumentos (sensores de presión, temperatura, caudal, nivel, válvulas)
definidos en el Excel `ASIGNACION FORMATOS PRE COMISIONAMIENTO INSTRUMENTOS
BIOTEC.xlsx`, manteniendo intactos los formularios universales existentes.

## Fuente de datos (Excel)

- **Hoja `TIPOS DE EQUIPOS`** — mapeo (columnas reales, corridas respecto al
  texto del usuario):
  - **B** = TAG(s) del instrumento (puede contener varios: `"PIT204 PIT 205 ..."`)
  - **G** = código del formato de formulario (`CHK-201` … `CHK-212`)
  - **H** = marca / modelo del instrumento
  - **I** = tipo de sensor (descripción)
- **Hojas `CHK-201` … `CHK-212`** — definición de cada formulario. Estructura
  heterogénea en cantidad de secciones (3 a 8) pero homogénea en filas:
  - Secciones numeradas (`1. INSPECCIÓN MECÁNICA`, `2. VERIFICACIÓN ELÉCTRICA`…)
  - Tablas de ítems: `Ítem | Verificación | OK | N/A | Observaciones`, casillas `☐`
  - Valores medidos (`Resistencia de tierra: ____ Ω`)
  - Firmas de liberación + Resultado Final

## Arquitectura destino (sistema existente, sin tablas nuevas)

Migraciones 0021–0023 ya proveen el modelo:

| Excel | Sistema |
|---|---|
| Cada hoja CHK-2xx | una fila en `form_templates` (`key`=CHK-2xx, `test_type`=precomisionamiento, `project_id`=NULL global) |
| Secciones numeradas | `template_sections` namespaced (`CHK201-S1`…), `is_universal=false` |
| Cada ítem `☐` | `section_fields` tipo `checkbox` opciones `["OK","N/A"]` **+** `textarea` "Observación" (fiel por ítem) |
| Valores medidos `____` | `section_fields` tipo `numero` con `validations.unit` |
| Vínculo template↔sección | `form_template_sections` |
| Firmas / Datos generales | secciones **universales** `FIRMAS` y `DATOS_GENERALES` (ya existen, se añaden solas vía RPC `get_template_sections`) |
| Columna I (tipo) | `equipment_types` (clasificación; se crean los faltantes: nivel radar, switch flotador) |
| Columna H (marca) | campo `equipment.manufacturer` |
| Columna B (TAG) | asignación directa vía `equipment_templates` |

El renderizador del formulario (`useInspectionTemplate`) lee de Supabase para
IDs UUID: `form_templates` → RPC `get_template_sections` → `section_fields`.
Por eso el seed SQL aparece directamente en la app.

## Decisiones (aprobadas por el usuario)

1. **Observaciones por ítem** — cada ítem genera checkbox (OK/N/A) + textarea de
   observación. Fiel 100% al Excel (formularios largos).
2. **Entrega por SQL de seed generado** — el parser produce archivos `.sql` que
   se aplican en Supabase (igual que migraciones previas). No se construye
   importador UI.
3. **Asignación por TAG + marca** — además de crear los formularios, se asigna
   cada plantilla a los equipos por TAG normalizado y se guarda la marca.

## Componentes

### Parser `scripts/parse-instrument-forms.cjs`

Detección por **marcadores** (robusta ante variaciones de layout):
- Fila con `☐` → ítem de checklist (descripción = primera celda no vacía sin `☐`;
  nº de ítem = col A si es numérico).
- Fila con `____` → valor medido → `numero` con unidad extraída del texto.
- Fila numerada sin `☐` → título de sección.
- Filas de Firmas/Resultado Final → no se replican como sección propia; se usa
  `FIRMAS` universal + un campo `select` de resultado.

Esquema de claves de campo: `iXY` (checkbox) y `iXY_obs` (textarea) por ítem,
namespaced por sección para evitar colisiones.

Imprime un **resumen de validación** (por formulario: nº secciones, nº campos;
y lista de TAGs detectados) antes de generar el SQL final.

### SQL generado

1. **`database/migrations/0036_seed_instrument_forms.sql`**
   - Idempotente: `DELETE` acotado a `form_templates.key LIKE 'CHK-%'` y
     `template_sections.code LIKE 'CHK%-S%'` (cascade a campos/vínculos), luego
     INSERT fresco con UUIDs deterministas.
   - `is_active` usa default TRUE (no se setea).

2. **`database/migrations/0037_assign_instrument_equipment.sql`**
   - Por cada TAG (normalizado `upper(regexp_replace(tag,'[^A-Za-z0-9]','','g'))`)
     dentro del proyecto LDC (`eba099c0-32ca-4be7-823f-4ab7f3480004`):
     - `UPDATE equipment` → `manufacturer` (col H) + `equipment_type_id`.
     - `INSERT equipment_templates` (ON CONFLICT DO NOTHING) → plantilla CHK directa.
   - Best-effort: TAGs ausentes en BD simplemente no afectan filas.

## Notas de diseño

- **Por qué asignación por TAG y no por tipo**: CHK-201 y CHK-202 son ambos
  caudalímetros pero con formularios distintos. Mapear tipo→plantilla asignaría
  varios formularios al mismo equipo. La asignación precisa va por TAG;
  `equipment_type_id` solo clasifica.
- Los formularios universales (`DATOS_GENERALES`, `INSPECCION_VISUAL`, `FIRMAS`)
  no se modifican.

## Fuera de alcance

- Importador UI reutilizable para Excel arbitrarios.
- Migración de datos de inspecciones ya realizadas.
