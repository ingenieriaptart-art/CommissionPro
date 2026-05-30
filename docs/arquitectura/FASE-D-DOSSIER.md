# FASE D — DOSSIER AUTOMÁTICO DE COMISIONAMIENTO
## Diseño del Sistema de Generacion de Dossier Final

---

## CONCEPTO

El Dossier de Comisionamiento es el documento contractual final que se entrega al cliente como evidencia de que todos los sistemas han sido correctamente precomisionados, comisionados y puestos en marcha. Tiene validez legal y debe ser irrefutable.

---

## ESTRUCTURA DEL DOSSIER

```
DOSSIER FINAL
│
├── 1. PORTADA
│   ├── Logo del proyecto y cliente
│   ├── Nombre del proyecto
│   ├── Numero de contrato
│   ├── Responsables (cliente, contratista, supervisor QA)
│   ├── Periodo de comisionamiento
│   └── Fecha de cierre
│
├── 2. INDICE AUTOMATICO
│   └── Generado dinamicamente con numeros de pagina
│
├── 3. RESUMEN EJECUTIVO
│   ├── Cantidad de equipos comisionados
│   ├── Protocolos ejecutados por tipo
│   ├── Punch list: abiertos y cerrados
│   └── Observaciones generales
│
├── 4. EQUIPOS COMISIONADOS
│   ├── Inventario completo con TAG, nombre, estado
│   └── Fichas tecnicas por equipo
│
├── 5. PROTOCOLOS DE PRUEBA
│   ├── Precomisionamiento (por equipo)
│   ├── FAT (por sistema)
│   ├── SAT (por sistema)
│   ├── Energizacion (por tablero/transformador)
│   ├── Loop Check (por lazo)
│   └── Pruebas Funcionales (por sistema)
│
├── 6. PUNCH LIST
│   ├── Items cerrados con evidencia de correccion
│   └── Items pendientes con justificacion
│
├── 7. EVIDENCIAS FOTOGRAFICAS
│   ├── Por sistema (antes, durante, despues)
│   └── Galeria de fotos clave
│
├── 8. DOCUMENTACION TECNICA
│   ├── Planos aprobados
│   ├── Certificados
│   └── Manuales de operacion
│
└── 9. ACTAS DE ENTREGA
    ├── Acta de aceptacion del supervisor
    ├── Acta de aceptacion QA/QC
    └── Acta de aceptacion del cliente
```

---

## TABLAS PROPUESTAS

### dossiers (NUEVA)
```sql
create table dossiers (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id),
  name            text not null,
  description     text,
  status          text not null default 'draft',
  -- draft | building | ready | delivered | archived
  scope           text,         -- full | partial (por area o sistema)
  scope_ref       uuid,         -- area_id o system_id si es parcial
  -- Generacion
  generated_at    timestamptz,
  generated_by    uuid references users(id),
  generation_log  jsonb,        -- log del proceso de generacion
  -- Archivos resultantes
  pdf_url         text,         -- URL del PDF en Storage
  zip_url         text,         -- URL del ZIP con todos los adjuntos
  pdf_size_bytes  bigint,
  zip_size_bytes  bigint,
  page_count      int,
  -- Entrega
  delivered_at    timestamptz,
  delivered_to    text,         -- nombre del receptor del cliente
  delivery_note   text,
  -- Auditoria
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references users(id)
);
```

### dossier_sections (NUEVA)
```sql
create table dossier_sections (
  id              uuid primary key default gen_random_uuid(),
  dossier_id      uuid not null references dossiers(id) on delete cascade,
  section_type    text not null,
  -- cover | index | summary | equipment | protocols | punch | photos | documents | signatures
  title           text not null,
  sort_order      int not null default 0,
  status          text not null default 'pending',
  -- pending | generating | ready | error
  config          jsonb,
  -- configuracion especifica de la seccion (filtros, incluir/excluir)
  content_ref     jsonb,
  -- referencias a los datos incluidos en esta seccion
  page_start      int,
  page_end        int,
  generated_at    timestamptz
);
```

### dossier_signatures (NUEVA)
```sql
create table dossier_signatures (
  id              uuid primary key default gen_random_uuid(),
  dossier_id      uuid not null references dossiers(id) on delete cascade,
  role            text not null,
  -- supervisor_comisionamiento | qaqc | cliente | gerente_proyecto
  user_id         uuid references users(id),
  signer_name     text not null,
  signer_position text,
  signer_company  text,
  signature_url   text,
  signed_at       timestamptz,
  observations    text
);
```

---

## FLUJO DE GENERACION DEL DOSSIER

```
1. CONFIGURACION
   - Admin define el alcance (proyecto completo, area, sistema)
   - Selecciona que secciones incluir
   - Configura portada con datos del cliente

2. VALIDACION PRE-GENERACION
   - Verificar que todos los protocolos requeridos esten en status=cerrado
   - Verificar punch criticos cerrados
   - Verificar firmas de aprobacion multinivel completas
   - Mostrar reporte de completitud antes de generar

3. GENERACION (proceso asincrono en Supabase Edge Function)
   - Crear registro en dossiers con status=building
   - Generar cada seccion en orden
   - Por cada protocolo: generar PDF individual
   - Ensamblar PDF master con todos los protocolos
   - Crear ZIP con: PDF master + fotos + documentos tecnicos
   - Subir a Supabase Storage en carpeta /dossiers/{project_id}/{dossier_id}/
   - Actualizar dossier con URLs y status=ready
   - Notificar al usuario

4. REVISION Y FIRMA
   - Supervisor revisa el dossier
   - Firma digitalmente cada acta
   - QA/QC firma
   - Cliente firma

5. ENTREGA
   - Generar link de descarga temporal (24-72h)
   - Registrar entrega con fecha y receptor
   - Archivar en status=delivered
```

---

## ESTRATEGIA DE GENERACION PDF

### Opcion A: React PDF en Edge Function (Recomendada para MVP)
```
- Usar @react-pdf/renderer en Supabase Edge Function (Deno)
- Cada protocolo genera su propio PDF component React
- Se concatenan con pdf-lib
- Control total de estilos y layout
- Funciona en servidor sin browser
```

### Opcion B: Puppeteer/Playwright (Para alta fidelidad visual)
```
- Renderizar paginas HTML con Next.js
- Capturar con Puppeteer en servidor
- Mayor fidelidad visual (CSS identico a la UI)
- Requiere instancia con Chromium (mas costosa)
- Recomendada para clientes enterprise exigentes
```

### Opcion C: Template Word + conversion (Para legacy)
```
- Generar .docx con docx.js
- Convertir a PDF con LibreOffice en contenedor
- Util si el cliente requiere documentos editables
```

**Decision para CommissionPro:** Usar Opcion A para MVP, Opcion B para Enterprise.

---

## ESTRATEGIA DE ALMACENAMIENTO

```
Supabase Storage — Bucket: dossiers (privado, requiere autenticacion)

/dossiers/
  {project_id}/
    {dossier_id}/
      dossier_completo.pdf         <- PDF master ensamblado
      dossier_completo.zip         <- Todo incluyendo evidencias
      sections/
        01_portada.pdf
        02_resumen.pdf
        03_equipos.pdf
        04_protocolos/
          precom_{equipment_tag}.pdf
          fat_{system_code}.pdf
          ...
        05_punch_list.pdf
        06_evidencias/
          {evidence_id}.jpg
          ...
        07_documentos/
          {document_id}.pdf
          ...
        08_actas.pdf
```

### Politica de retencion
- Dossiers activos: sin limite
- Dossiers archivados: 10 anos minimo (requisito contractual tipico en proyectos EPC)
- Copias de seguridad: replicacion a segundo bucket en region diferente

---

## INFORME DE COMPLETITUD PRE-DOSSIER

Antes de generar, el sistema calcula:

```
COMPLETITUD DEL PROYECTO
========================
Equipos comisionados:     847/950   (89.2%)  <- minimo requerido: 95%
Protocolos cerrados:      1,234/1,400 (88.1%) <- minimo requerido: 100%
Punch criticos cerrados:  15/15    (100%)
Punch altos cerrados:     42/48    (87.5%)
Firmas de aprobacion:     856/856  (100%)
Documentacion cargada:   234/250   (93.6%)

BLOQUEOS PARA GENERAR DOSSIER:
- 166 protocolos sin cerrar (ver lista)
- 6 punch de prioridad alta sin cerrar (ver lista)
```

---

## INDICE AUTOMATICO

El indice se genera despues de ensamblar el PDF y calcular paginas reales:

```
INDICE DE CONTENIDO

1. Portada ................................................... 1
2. Datos Generales del Proyecto .............................. 2
3. Resumen Ejecutivo ......................................... 3
4. Inventario de Equipos ..................................... 5
5. Protocolos de Precomisionamiento
   5.1 Sistema de Bombeo Principal .......................... 12
       TAG-001 Bomba Centrifuga 1 ........................... 13
       TAG-002 Bomba Centrifuga 2 ........................... 18
   5.2 Sistema Electrico .................................... 24
       ...
6. Protocolos FAT ........................................... 87
7. Protocolos SAT ........................................... 134
8. Pruebas de Energizacion .................................. 178
9. Loop Check ............................................... 201
10. Pruebas Funcionales ..................................... 245
11. Punch List .............................................. 289
12. Evidencias Fotograficas ................................. 301
13. Documentacion Tecnica ................................... 356
14. Actas de Entrega ........................................ 401
    Acta Supervisor ......................................... 402
    Acta QA/QC .............................................. 403
    Acta Cliente ............................................ 404
```
