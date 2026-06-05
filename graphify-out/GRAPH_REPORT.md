# Graph Report - .  (2026-06-05)

## Corpus Check
- 137 files · ~65,293 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 567 nodes · 1038 edges · 46 communities (26 shown, 20 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.85)
- Token cost: 31,300 input · 7,000 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Offline Sync Engine|Offline Sync Engine]]
- [[_COMMUNITY_Equipment Dashboard & KPIs|Equipment Dashboard & KPIs]]
- [[_COMMUNITY_Project Dashboard UI|Project Dashboard UI]]
- [[_COMMUNITY_App Shell & Routing|App Shell & Routing]]
- [[_COMMUNITY_Architecture Planning Docs|Architecture Planning Docs]]
- [[_COMMUNITY_Engineering & Excel Import|Engineering & Excel Import]]
- [[_COMMUNITY_Phase Design Specs|Phase Design Specs]]
- [[_COMMUNITY_Core Dependencies|Core Dependencies]]
- [[_COMMUNITY_Dev Tooling & Config|Dev Tooling & Config]]
- [[_COMMUNITY_Equipment CRUD|Equipment CRUD]]
- [[_COMMUNITY_Sync State Management|Sync State Management]]
- [[_COMMUNITY_Excel Parser API|Excel Parser API]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Document Management UI|Document Management UI]]
- [[_COMMUNITY_Document Processing Engine|Document Processing Engine]]
- [[_COMMUNITY_Project Navigation|Project Navigation]]
- [[_COMMUNITY_PWA Manifest|PWA Manifest]]
- [[_COMMUNITY_TAG Search UX Mockups|TAG Search UX Mockups]]
- [[_COMMUNITY_TAG Search Feature|TAG Search Feature]]
- [[_COMMUNITY_DB Cron Jobs|DB Cron Jobs]]
- [[_COMMUNITY_Vercel Config|Vercel Config]]
- [[_COMMUNITY_RTU Data Parser|RTU Data Parser]]
- [[_COMMUNITY_Vercel Project|Vercel Project]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_Claude Settings|Claude Settings]]
- [[_COMMUNITY_Stats Validation|Stats Validation]]
- [[_COMMUNITY_API Proxy|API Proxy]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_Stats Refresh|Stats Refresh]]
- [[_COMMUNITY_Demo Seeder|Demo Seeder]]
- [[_COMMUNITY_pg_cron Setup|pg_cron Setup]]
- [[_COMMUNITY_pg_cron Verify|pg_cron Verify]]
- [[_COMMUNITY_Agents Config|Agents Config]]
- [[_COMMUNITY_App README|App README]]
- [[_COMMUNITY_Waiting Screen Mockup 1|Waiting Screen Mockup 1]]
- [[_COMMUNITY_Waiting Screen Mockup 2|Waiting Screen Mockup 2]]
- [[_COMMUNITY_File Icon SVG|File Icon SVG]]
- [[_COMMUNITY_Globe Icon SVG|Globe Icon SVG]]
- [[_COMMUNITY_Next.js Logo SVG|Next.js Logo SVG]]
- [[_COMMUNITY_Vercel Logo SVG|Vercel Logo SVG]]
- [[_COMMUNITY_Window Icon SVG|Window Icon SVG]]
- [[_COMMUNITY_Vercel Project README|Vercel Project README]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 28 edges
2. `createClient()` - 22 edges
3. `compilerOptions` - 16 edges
4. `Button()` - 14 edges
5. `Card()` - 14 edges
6. `useAuthStore` - 14 edges
7. `Badge()` - 13 edges
8. `CommissionProDB` - 13 edges
9. `useUIStore` - 13 edges
10. `CommissionPro MVP v1.0 Resumen Ejecutivo` - 12 edges

## Surprising Connections (you probably didn't know these)
- `TAG Search Modal — Read-Only Cross-Source Lookup` --semantically_similar_to--> `TAG Search — Inline Bar Always Visible (Option A)`  [INFERRED] [semantically similar]
  .superpowers/brainstorm/1202-1780613590/content/modal-design.html → .superpowers/brainstorm/1202-1780613590/content/tag-search-approaches.html
- `TAG Search Modal — Read-Only Cross-Source Lookup` --semantically_similar_to--> `TAG Search — Row-level Popover (Option C)`  [INFERRED] [semantically similar]
  .superpowers/brainstorm/1202-1780613590/content/modal-design.html → .superpowers/brainstorm/1202-1780613590/content/tag-search-approaches.html
- `Database README — CommissionPro PostgreSQL Schema` --references--> `Data Model — Entity-Relationship Design`  [INFERRED]
  database/README.md → docs/02-MODELO-DATOS.md
- `Architecture Document — CommissionPro Platform` --references--> `Next.js 15 App Router — Frontend PWA`  [EXTRACTED]
  docs/01-ARQUITECTURA.md → app/README.md
- `Next.js 15 App Router — Frontend PWA` --conceptually_related_to--> `Offline First — 100% Functionality Without Internet`  [INFERRED]
  app/README.md → docs/01-ARQUITECTURA.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **TAG Search UX Design Options — Three Alternative Patterns** — tag_search_inline_concept, tag_search_modal_concept, tag_search_popover_concept [EXTRACTED 1.00]
- **Legal Traceability System — Audit Events, Evidence Metadata, Signature Metadata, Protocol History** — trazabilidad_legal_concept, audit_log_concept, arquitectura_fase_c, fk_cascade_risk_a006 [INFERRED 0.85]
- **CommissionPro Core Architecture — Platform, Next.js, Supabase, Offline First** — commissiompro_platform, nextjs_app_concept, supabase_backend_concept, offline_first_principle, sync_engine_concept [INFERRED 0.90]
- **Pipeline TAG Equipo Migracion 0016 0017 API Route Hook UI** — plans_2026_06_04_sprint2_tag_to_equipment_migration_0016, plans_2026_06_04_sprint2_tag_to_equipment_migration_0017, plans_2026_06_04_sprint2_tag_to_equipment_api_create_equipment_from_tags, plans_2026_06_04_sprint2_tag_to_equipment_hook_usecreateequipmentfromtags, plans_2026_06_04_sprint2_tag_to_equipment_tagreviewtable [EXTRACTED 1.00]
- **Pipeline Excel Import Parser API Route Hook UI Panel** — plans_2026_06_04_sprint3_zipaquira_excel_parser_excel_equipment_parser, plans_2026_06_04_sprint3_zipaquira_excel_parser_api_import_excel, plans_2026_06_04_sprint3_zipaquira_excel_parser_hook_useimportequipmentfromexcel, plans_2026_06_04_sprint3_zipaquira_excel_parser_excel_import_panel [EXTRACTED 1.00]
- **TAG Search Modal Hook Modal Integracion Equipment Engineering** — plans_2026_06_04_tag_search_modal_hook_usetaglookup, plans_2026_06_04_tag_search_modal_tagsearchmodal, plans_2026_06_04_tag_search_modal_equipment_page_integration, plans_2026_06_04_tag_search_modal_engineering_page_integration [EXTRACTED 1.00]

## Communities (46 total, 20 thin omitted)

### Community 0 - "Offline Sync Engine"
Cohesion: 0.06
Nodes (42): CommissionProDB, enqueueSync(), LocalBlobStore, localDB, saveBlobLocally(), SyncCursor, EvidenceCaptureProps, useClosePunch() (+34 more)

### Community 1 - "Equipment Dashboard & KPIs"
Cohesion: 0.06
Nodes (38): AVATAR_COLORS, avatarColor(), EQUIP_STATUS, ProjectDashboardPage(), Props, statusColor, statusLabel, TEST_TYPES (+30 more)

### Community 2 - "Project Dashboard UI"
Cohesion: 0.07
Nodes (32): DashboardData, PIE_COLORS, ProjectStats, useCreatePunch(), usePunch(), useCreateTest(), useTests(), Props (+24 more)

### Community 3 - "App Shell & Routing"
Cohesion: 0.11
Nodes (21): metadata, viewport, Providers(), useProject(), DashboardShell(), AVATAR_COLORS, avatarColor(), navItems (+13 more)

### Community 4 - "Architecture Planning Docs"
Cohesion: 0.08
Nodes (38): CommissionPro MVP v1.0 Resumen Ejecutivo, Correcciones Criticas A-001 a A-007 pre-produccion, Edge Functions para generacion PDF Supabase Deno, Fase A Auditoria 14 riesgos tecnicos, Fase B Formularios Dinamicos, Fase C Trazabilidad audit_events evidence_metadata, Fase D Dossier generacion PDF, Fase E Modulo Documental (+30 more)

### Community 5 - "Engineering & Excel Import"
Cohesion: 0.10
Nodes (30): DocumentsPage(), ExcelImportPanel(), ExcelImportPanelProps, EngineeringPage(), Props, STATUS_BADGE, STATUS_LABEL, TagReviewTable() (+22 more)

### Community 6 - "Phase Design Specs"
Cohesion: 0.14
Nodes (29): FASE A — Architecture Audit (14 Risks), FASE B — Dynamic Versioned Forms Design, FASE C — Total Traceability System Design, FASE D — Automatic Commissioning Dossier, FASE E — Technical Document Management, FASE F — Executive Dashboards & KPIs, FASE G — Enterprise Scalability Design, Audit Log — Append-Only Legal Traceability (+21 more)

### Community 7 - "Core Dependencies"
Cohesion: 0.08
Nodes (26): dependencies, clsx, date-fns, dexie, dexie-react-hooks, @hookform/resolvers, idb, lucide-react (+18 more)

### Community 8 - "Dev Tooling & Config"
Cohesion: 0.09
Nodes (21): devDependencies, eslint, eslint-config-next, eslint-plugin-import, @playwright/test, prettier, prettier-plugin-tailwindcss, tailwindcss (+13 more)

### Community 9 - "Equipment CRUD"
Cohesion: 0.13
Nodes (14): EquipmentPage(), Props, useCreateEquipment(), useEquipment(), EquipmentLookup, ExtractedTagLookup, TagLookupResult, useTagLookup() (+6 more)

### Community 10 - "Sync State Management"
Cohesion: 0.17
Nodes (16): SyncOperation, SyncProvider(), SyncStore, useSyncStore, getLocalTable(), getPullCursor(), pullChanges(), pushPendingOps() (+8 more)

### Community 11 - "Excel Parser API"
Cohesion: 0.16
Nodes (19): POST(), serviceClient, buildHeaderIndex(), ColMap, detectSheetType(), EQUIPMENT_LIST_MAP, INSTRUMENT_MAP, listSheets() (+11 more)

### Community 12 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 13 - "Document Management UI"
Cohesion: 0.15
Nodes (15): DocumentRow(), fileIcon(), fmtSize(), Props, STATUS_CONFIG, ACCEPTED_EXTENSIONS, ACCEPTED_MIME, DocumentUploader() (+7 more)

### Community 14 - "Document Processing Engine"
Cohesion: 0.26
Nodes (12): calcConfidence(), extractDescription(), extractFromDXF(), extractFromExcel(), extractFromPDF(), extractTags(), extractText(), POST() (+4 more)

### Community 15 - "Project Navigation"
Cohesion: 0.24
Nodes (4): ProjectSelector(), Props, statusColor, statusLabel

### Community 16 - "PWA Manifest"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 17 - "TAG Search UX Mockups"
Cohesion: 0.32
Nodes (8): Modal Design — Buscar TAG (mockup HTML), Modal with Navigation Options — Buscar TAG, TAG Search Approach Options (Inline / Modal / Popover), Modal Navigation — Per-Section Link (Option A), Modal Navigation — Footer Buttons (Option B), TAG Search — Inline Bar Always Visible (Option A), TAG Search Modal — Read-Only Cross-Source Lookup, TAG Search — Row-level Popover (Option C)

### Community 18 - "TAG Search Feature"
Cohesion: 0.43
Nodes (8): Integracion TagSearchModal en engineering page, Integracion TagSearchModal en equipment page, Hook useTagLookup Queries paralelas equipment extracted_tags, TAG Search Modal Implementation Plan, Componente TagSearchModal Busqueda read-only con navegacion, TAG Search Modal Comportamiento y estados ESC clic overlay busqueda parcial, Acceso RLS client-side useTagLookup usa anon JWT sin API route, TAG Search Modal Design Spec

### Community 19 - "DB Cron Jobs"
Cohesion: 0.40
Nodes (3): sb, sqlJob, t0

### Community 20 - "Vercel Config"
Cohesion: 0.50
Nodes (3): functions, src/app/api/process-document/route.ts, maxDuration

### Community 21 - "RTU Data Parser"
Cohesion: 0.67
Nodes (3): extractRtu(), IO_TYPE_MAP, POST()

### Community 22 - "Vercel Project"
Cohesion: 0.50
Nodes (3): orgId, projectId, projectName

## Knowledge Gaps
- **216 isolated node(s):** `allow`, `projectId`, `orgId`, `projectName`, `eslintConfig` (+211 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `Equipment Dashboard & KPIs` to `Offline Sync Engine`, `Project Dashboard UI`, `App Shell & Routing`, `Engineering & Excel Import`, `Equipment CRUD`, `Sync State Management`, `Document Management UI`, `Project Navigation`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `cn()` connect `App Shell & Routing` to `Offline Sync Engine`, `Equipment Dashboard & KPIs`, `Project Dashboard UI`, `Engineering & Excel Import`, `Document Management UI`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `useUIStore` connect `App Shell & Routing` to `Equipment Dashboard & KPIs`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `allow`, `projectId`, `orgId` to the rest of the system?**
  _221 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Offline Sync Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.05888376856118792 - nodes in this community are weakly interconnected._
- **Should `Equipment Dashboard & KPIs` be split into smaller, more focused modules?**
  _Cohesion score 0.061016949152542375 - nodes in this community are weakly interconnected._
- **Should `Project Dashboard UI` be split into smaller, more focused modules?**
  _Cohesion score 0.06755260243632337 - nodes in this community are weakly interconnected._