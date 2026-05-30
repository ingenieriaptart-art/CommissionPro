# FASE B — FORMULARIOS DINÁMICOS VERSIONADOS
## Diseño Técnico Completo

---

## PROBLEMA ACTUAL

El sistema tiene `form_templates`, `form_versions` y `form_fields` pero:
- No tiene secciones agrupadas
- No tiene opciones de campo normalizadas en tabla propia
- No hay flujo de publicacion ni desactivacion
- No hay mecanismo de clonacion
- No es compartible entre proyectos

---

## ARQUITECTURA PROPUESTA

### Modelo de jerarquia de formularios

```
form_templates         (definicion raiz — puede ser global o por proyecto)
  └── form_versions    (version especifica — draft, published, deprecated)
        └── form_sections  (agrupacion de campos por seccion)
              └── form_fields    (campo individual con tipo y reglas)
                    └── form_field_options  (opciones para select/radio/checkbox)
```

---

## TABLAS PROPUESTAS

### form_templates (MODIFICAR)
```sql
create table form_templates (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid references projects(id) on delete cascade,
  -- NULL = plantilla global reutilizable en cualquier proyecto
  is_global     boolean not null default false,
  key           text not null,
  name          text not null,
  description   text,
  test_type     test_type,
  discipline    text,        -- electrica, instrumentacion, mecanica, civil
  icon          text,        -- nombre de icono lucide
  color         text,        -- color identificador hex
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  created_by    uuid references users(id)
);
```

### form_versions (MODIFICAR)
```sql
create table form_versions (
  id            uuid primary key default gen_random_uuid(),
  template_id   uuid not null references form_templates(id) on delete cascade,
  version       int not null,
  status        text not null default 'draft',
  -- draft | published | deprecated | archived
  title         text,        -- titulo de esta version especifica
  notes         text,        -- notas de cambios respecto a version anterior
  cloned_from   uuid references form_versions(id),
  -- referencia si fue clonado de otra version
  published_at  timestamptz,
  published_by  uuid references users(id),
  deprecated_at timestamptz,
  deprecated_by uuid references users(id),
  created_at    timestamptz not null default now(),
  created_by    uuid references users(id),
  unique (template_id, version)
);
```

### form_sections (NUEVA)
```sql
create table form_sections (
  id            uuid primary key default gen_random_uuid(),
  version_id    uuid not null references form_versions(id) on delete cascade,
  title         text not null,
  description   text,
  icon          text,
  sort_order    int not null default 0,
  is_required   boolean not null default false,
  -- si toda la seccion es opcional o requerida
  condition     jsonb
  -- logica condicional: mostrar seccion solo si campo X = valor Y
);
```

### form_fields (MODIFICAR)
```sql
create table form_fields (
  id            uuid primary key default gen_random_uuid(),
  version_id    uuid not null references form_versions(id) on delete cascade,
  section_id    uuid references form_sections(id) on delete cascade,
  key           text not null,
  label         text not null,
  description   text,      -- texto de ayuda bajo el campo
  placeholder   text,
  type          field_type not null,
  required      boolean not null default false,
  sort_order    int default 0,
  default_value text,
  min_value     numeric,
  max_value     numeric,
  min_length    int,
  max_length    int,
  regex_pattern text,
  unit          text,      -- unidad de medida: V, A, Ohm, kW, etc.
  condition     jsonb,     -- logica condicional para mostrar/ocultar
  metadata      jsonb,     -- configuracion adicional por tipo
  unique (version_id, key)
);
```

### form_field_options (NUEVA)
```sql
create table form_field_options (
  id            uuid primary key default gen_random_uuid(),
  field_id      uuid not null references form_fields(id) on delete cascade,
  value         text not null,
  label         text not null,
  color         text,      -- color para visualizacion (cumple=verde, no_cumple=rojo)
  sort_order    int default 0,
  is_default    boolean default false
);
```

---

## TIPOS DE CAMPO SOPORTADOS

| Tipo         | Descripcion                        | Requiere opciones |
|--------------|------------------------------------|-------------------|
| texto        | Texto libre una linea              | No                |
| textarea     | Texto largo multilinea             | No                |
| numero       | Valor numerico con unidad          | No                |
| fecha        | Selector de fecha                  | No                |
| hora         | Selector de hora                   | No                |
| fecha_hora   | Selector fecha y hora combinados   | No                |
| moneda       | Valor monetario con separadores    | No                |
| select       | Lista desplegable (una opcion)     | Si                |
| multiselect  | Lista desplegable (varias)         | Si                |
| radio        | Botones de opcion exclusivos       | Si                |
| checkbox     | Casillas multiples                 | Si                |
| cumple_nca   | Cumple / No Cumple / N/A           | No (fijo)         |
| firma        | Firma electronica canvas           | No                |
| imagen       | Captura o carga de foto            | No                |
| video        | Captura o carga de video           | No                |
| pdf          | Carga de documento PDF             | No                |
| archivo      | Carga de cualquier archivo         | No                |
| gps          | Coordenadas automaticas del GPS    | No                |
| observacion  | Campo de observacion libre grande  | No                |
| separador    | Linea divisoria visual             | No                |
| encabezado   | Texto de encabezado dentro del form| No                |

---

## ESTRUCTURA JSON DEL SCHEMA (para uso offline)

Cuando un formulario se sincroniza al dispositivo, se guarda como JSON completo:

```json
{
  "id": "uuid",
  "version": 3,
  "status": "published",
  "template": {
    "id": "uuid",
    "name": "Protocolo Megger - Cables BT",
    "test_type": "precomisionamiento",
    "discipline": "electrica"
  },
  "sections": [
    {
      "id": "uuid",
      "title": "1. Datos del Equipo",
      "sort_order": 1,
      "fields": [
        {
          "id": "uuid",
          "key": "voltaje_prueba",
          "label": "Voltaje de Prueba",
          "type": "numero",
          "required": true,
          "unit": "V",
          "min_value": 500,
          "max_value": 5000,
          "default_value": "1000"
        },
        {
          "id": "uuid",
          "key": "resultado_aislamiento",
          "label": "Resultado de Aislamiento",
          "type": "numero",
          "required": true,
          "unit": "MOhm",
          "min_value": 1
        }
      ]
    },
    {
      "id": "uuid",
      "title": "2. Verificacion Visual",
      "sort_order": 2,
      "fields": [
        {
          "id": "uuid",
          "key": "estado_cable",
          "label": "Estado fisico del cable",
          "type": "cumple_nca",
          "required": true
        },
        {
          "id": "uuid",
          "key": "foto_resultado",
          "label": "Fotografia del medidor",
          "type": "imagen",
          "required": true
        }
      ]
    },
    {
      "id": "uuid",
      "title": "3. Firmas",
      "sort_order": 3,
      "fields": [
        {
          "id": "uuid",
          "key": "firma_tecnico",
          "label": "Firma del Tecnico",
          "type": "firma",
          "required": true
        },
        {
          "id": "uuid",
          "key": "firma_supervisor",
          "label": "Firma del Supervisor",
          "type": "firma",
          "required": true
        }
      ]
    }
  ]
}
```

---

## FLUJO DE CICLO DE VIDA DE UN FORMULARIO

```
CREAR TEMPLATE
     |
     v
CREAR VERSION (status: draft)
     |
     v
DISENAR SECCIONES Y CAMPOS
     |
     v
PREVISUALIZAR Y PROBAR
     |
     v
PUBLICAR VERSION (status: published)
     |
     +---> Solo una version puede estar published a la vez
     |
     v
(si se necesitan cambios)
CLONAR VERSION published → nueva VERSION draft
     |
     v
EDITAR CAMPOS
     |
     v
PUBLICAR nueva VERSION → la anterior pasa a deprecated
     |
     v
(cuando version es obsoleta)
ARCHIVAR VERSION (status: archived)
     |
     v
Los tests ejecutados conservan form_version_id historico (inmutable)
```

---

## REGLAS DE NEGOCIO

1. Solo puede existir UNA version con status=published por template a la vez.
2. Los tests ejecutados NUNCA cambian su form_version_id. El protocolo queda congelado.
3. Una version en status=published NO puede editarse. Se clona para hacer cambios.
4. Una version deprecated puede consultarse pero no usarse para nuevas pruebas.
5. Un template global (is_global=true) puede copiarse a un proyecto especifico.
6. Los campos type=firma y type=imagen requieren almacenamiento en Supabase Storage.
7. Los campos con condition (logica condicional) se evaluan en el cliente en tiempo real.

---

## INDICES RECOMENDADOS

```sql
create index idx_form_templates_global on form_templates(is_global) where deleted_at is null;
create index idx_form_templates_project on form_templates(project_id) where deleted_at is null;
create index idx_form_versions_template on form_versions(template_id, status);
create index idx_form_sections_version on form_sections(version_id, sort_order);
create index idx_form_fields_section on form_fields(section_id, sort_order);
create index idx_form_fields_version on form_fields(version_id);
create index idx_form_options_field on form_field_options(field_id, sort_order);
```
