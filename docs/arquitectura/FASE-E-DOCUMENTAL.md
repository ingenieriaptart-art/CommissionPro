# FASE E — GESTIÓN DOCUMENTAL TÉCNICA
## Diseño del Modulo de Repositorio Documental Industrial

---

## PROBLEMA ACTUAL

La tabla `documents` actual es muy simple:
- `scope` es un campo texto libre (no normalizado)
- No hay flujo de aprobacion documental
- No hay control de revisiones (Rev A, Rev B, Rev 0...)
- No hay categorias estructuradas
- No se puede asociar a Equipo, Sistema y Subsistema al mismo tiempo

---

## CATEGORIAS DE DOCUMENTOS EN PROYECTOS INDUSTRIALES

| Categoria        | Descripcion                                     | Ejemplo              |
|------------------|-------------------------------------------------|----------------------|
| PID              | Piping and Instrumentation Diagram              | PID-PTAR-001-RevB    |
| plano_electrico  | Planos unifilares, escalera, layout             | UNI-MCC-001-Rev0     |
| plano_civil      | Planos arquitectonicos y estructurales          | ARQ-EDIFICIO-001     |
| plano_ifr        | Planos IFR (Issued for Review)                  |                      |
| plano_ifc        | Planos IFC (Issued for Construction)            |                      |
| as_built         | Planos As Built (como quedo construido)         |                      |
| datasheet        | Hoja de datos del equipo                        | DS-BOMBA-001         |
| manual_operacion | Manual del fabricante de operacion              |                      |
| manual_mtto      | Manual del fabricante de mantenimiento          |                      |
| catalogo         | Catalogo de productos                           |                      |
| certificado      | Certificados de calibracion, materiales         |                      |
| protocolo_fab    | Protocolo del fabricante (Factory Test)         |                      |
| informe_tecnico  | Informes de ingenieria                          |                      |
| memoria_calculo  | Memorias de calculo                             |                      |
| especificacion   | Especificaciones tecnicas                       |                      |
| contrato         | Documentos contractuales                        |                      |
| otro             | Otros documentos                                |                      |

---

## TABLAS PROPUESTAS

### documents (REDISENAR — reemplaza la actual)
```sql
create table documents (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  -- Clasificacion
  category        text not null,   -- ver catalogo de categorias arriba
  discipline      text,            -- electrica | instrumentacion | civil | mecanica
  -- Codigo de documento (estructura estandar de ingenieria)
  doc_number      text,            -- ej: PID-PTAR-001
  revision        text,            -- Rev 0 | Rev A | Rev B | Rev 1 ...
  title           text not null,
  description     text,
  -- Asociacion jerarquica (puede asociarse a multiples niveles)
  area_id         uuid references areas(id) on delete set null,
  system_id       uuid references systems(id) on delete set null,
  subsystem_id    uuid references subsystems(id) on delete set null,
  equipment_id    uuid references equipment(id) on delete set null,
  -- Estado y flujo
  status          text not null default 'draft',
  -- draft | review | approved | superseded | obsolete
  is_current      boolean not null default true,  -- es la revision mas reciente
  -- Archivo
  file_type       text,            -- pdf | dwg | xlsx | docx | jpg ...
  storage_url     text not null,
  file_size_bytes bigint,
  file_hash       text,            -- para verificar integridad
  -- Metadatos del documento
  author          text,            -- autor del documento (puede ser externo)
  source_company  text,            -- empresa que genero el documento
  doc_date        date,            -- fecha del documento (puede ser anterior a la carga)
  -- Auditoria
  uploaded_by     uuid references users(id),
  uploaded_at     timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create index idx_docs_project     on documents(project_id) where deleted_at is null;
create index idx_docs_category    on documents(project_id, category) where deleted_at is null;
create index idx_docs_equipment   on documents(equipment_id) where deleted_at is null;
create index idx_docs_system      on documents(system_id) where deleted_at is null;
create index idx_docs_current     on documents(project_id, is_current) where deleted_at is null;
```

### document_revisions (NUEVA — historial de revisiones)
```sql
create table document_revisions (
  id              uuid primary key default gen_random_uuid(),
  document_id     uuid not null references documents(id) on delete cascade,
  revision        text not null,        -- Rev 0, Rev A, Rev B, Rev 1
  title           text,
  change_summary  text,                 -- descripcion de los cambios
  storage_url     text not null,
  file_size_bytes bigint,
  file_hash       text,
  status          text not null default 'draft',
  -- Aprobacion de esta revision especifica
  reviewed_by     uuid references users(id),
  reviewed_at     timestamptz,
  approved_by     uuid references users(id),
  approved_at     timestamptz,
  approval_notes  text,
  -- Auditoria
  uploaded_by     uuid references users(id),
  uploaded_at     timestamptz not null default now(),
  unique (document_id, revision)
);
```

### document_approvals (NUEVA — flujo de aprobacion de documentos)
```sql
create table document_approvals (
  id              uuid primary key default gen_random_uuid(),
  document_id     uuid not null references documents(id) on delete cascade,
  revision_id     uuid references document_revisions(id),
  level           int not null,         -- 1=revisor | 2=aprobador | 3=cliente
  role_required   text,                 -- rol requerido para este nivel
  status          text not null default 'pending',
  -- pending | approved | rejected | waived
  approver_id     uuid references users(id),
  approver_name   text,
  approver_company text,
  signature_url   text,
  action_at       timestamptz,
  comments        text,
  unique (document_id, level)
);
```

### document_tags (NUEVA — etiquetas para busqueda)
```sql
create table document_tags (
  document_id uuid references documents(id) on delete cascade,
  tag         text not null,
  primary key (document_id, tag)
);

create index idx_doc_tags on document_tags(tag);
```

---

## CONTROL DE REVISIONES ESTANDAR

El sistema implementa el control de revisiones tipico de proyectos EPC:

```
ESTADO DEL DOCUMENTO: PID-PTAR-001

Rev  | Fecha      | Descripcion         | Autor  | Status
-----|------------|---------------------|--------|----------
0    | 2025-01-15 | Emision inicial     | JG     | Aprobado
A    | 2025-02-20 | Ajuste valvulas     | JG     | Aprobado
B    | 2025-03-10 | Cambio lineas 6"    | MR     | En revision
[*]  | ACTUAL     |                     |        |

- La revision actual (is_current=true) se muestra por defecto
- Las revisiones anteriores se pueden consultar para trazabilidad
- Al aprobar revision B, la A pasa a status=superseded
- La fecha y firma de aprobacion quedan registradas
```

---

## MATRIZ DE DOCUMENTACION POR EQUIPO

El sistema permite visualizar que documentos faltan por cargar para cada equipo:

```
EQUIPO: TAG-B-001 — Bomba Centrifuga Principal

Categoria          | Requerido | Cargado | Aprobado | Revision
-------------------|-----------|---------|----------|---------
Datasheet          | Si        | Si      | Si       | Rev A
Manual Operacion   | Si        | Si      | No       | Rev 0
Manual Mtto        | Si        | No      | -        | -
Certificado Fabrica| Si        | Si      | Si       | Rev 0
Plano P&ID         | Si        | Si      | Si       | Rev B
Protocolo FAT      | Si        | Si      | Si       | -

COMPLETITUD: 4/6 documentos (67%) — BLOQUEADO para dossier
```

---

## BUSQUEDA Y FILTROS

El modulo documental debe soportar busqueda por:
- Texto libre (titulo, descripcion, numero de documento)
- Categoria
- Disciplina
- Estado (aprobado, en revision, draft)
- Equipo TAG
- Sistema / Area
- Fecha de carga (rango)
- Revision
- Tipo de archivo (pdf, dwg, xlsx...)

---

## INTEGRACION CON DOSSIER

Los documentos aprobados se incluyen automaticamente en el dossier final segun su asociacion:
- Documentos de proyecto → seccion "Documentacion General"
- Documentos de equipo → ficha tecnica del equipo en el dossier
- Certificados → seccion "Certificados"
- Planos As Built → seccion "Planos Finales"
