# Plataforma de Comisionamiento Industrial — Arquitectura

> Plataforma empresarial para Precomisionamiento, Comisionamiento, Energización,
> Arranque, Puesta en Marcha y Cierre Documental de proyectos PTAR / PTAP,
> estaciones de bombeo, sistemas eléctricos y de automatización.

Nombre de trabajo: **CommissionPro** (provisional).

---

## 1. Principios de diseño

1. **Offline First**: la app funciona 100% sin internet. La nube es un espejo, no la fuente única.
2. **Multiplataforma**: una sola base de código (PWA) para PC, tablets y celulares (Android/iOS).
3. **Configurable sin programar**: formularios, checklists y flujos los define el Administrador.
4. **Auditable por diseño**: nada se borra físicamente; todo deja traza legal.
5. **Seguro por defecto**: RBAC, RLS a nivel de fila, JWT, cifrado en tránsito y reposo.
6. **Escalable**: miles de equipos, decenas de proyectos, cientos de usuarios concurrentes.

---

## 2. Stack tecnológico

### Frontend
- **Next.js 15 (App Router)** + **React 19** + **TypeScript**
- **Tailwind CSS** + sistema de diseño propio (tokens Fluent / Material 3)
- **PWA**: `next-pwa` / service worker propio (Workbox)
- **Estado**: Zustand (UI) + TanStack Query (datos servidor)
- **Offline DB**: IndexedDB vía **Dexie.js**
- **Formularios dinámicos**: JSON Schema + react-hook-form + zod
- **Firma**: signature_pad (canvas táctil/lápiz/mouse)
- **Gráficas**: Recharts / visx
- **PDF**: generación servidor con `@react-pdf/renderer` o Puppeteer

### Backend
- **Supabase** (PostgreSQL gestionado) como BaaS principal:
  - Postgres 16 + **Row Level Security**
  - **Auth** (JWT, recuperación de contraseña)
  - **Storage** (documentos, fotos, videos)
  - **Edge Functions** (Deno) para lógica server (PDF, notificaciones, sync)
  - **Realtime** (suscripciones para dashboards)
- Alternativa self-hosted: PostgreSQL + API REST (PostgREST) + MinIO (storage).

### Infraestructura / DevOps
- **Vercel** para el frontend (CDN global, preview deployments).
- **Supabase Cloud** o instancia self-hosted (Docker) para datos.
- CI/CD: GitHub Actions (lint, test, migrate, deploy).
- Backups: snapshots diarios PITR de Postgres + replicación de Storage.

---

## 3. Arquitectura lógica (capas)

```
┌──────────────────────────────────────────────────────────────┐
│  DISPOSITIVO (PWA instalada)                                   │
│                                                                │
│  UI (React/Next)  ──►  Capa de servicios (TS)                  │
│                          │                                     │
│        ┌─────────────────┼───────────────────┐                │
│        ▼                 ▼                   ▼                 │
│   Dexie/IndexedDB   Sync Engine        Service Worker          │
│   (datos locales)   (cola de cambios)  (cache assets/API)      │
└────────────────────────────┬─────────────────────────────────┘
                             │  (cuando hay red)
                             ▼
┌──────────────────────────────────────────────────────────────┐
│  SUPABASE / POSTGRES                                           │
│  Auth │ RLS │ Tablas │ Storage │ Edge Functions │ Realtime     │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Estrategia Offline First

### Modelo de sincronización
- Cada tabla sincronizable tiene: `id (uuid)`, `updated_at`, `deleted_at`, `version`,
  `sync_status` (`synced|pending|conflict`), `origin_device_id`.
- **Identificadores generados en cliente (UUID v7)** → permite crear offline sin colisiones.
- **Cola de operaciones** (outbox) en IndexedDB: cada cambio se registra como mutación.
- Al recuperar conexión:
  1. Push: enviar mutaciones pendientes (orden causal).
  2. Pull: traer cambios remotos desde `last_pulled_at`.
  3. **Resolución de conflictos**: last-write-wins por campo + cola manual para
     conflictos críticos (firmas, aprobaciones → siempre revisión manual).
  4. Validación de integridad (checksums) + registro en `sync_log`.
  5. Confirmación visual (badge de estado de sincronización).

### Qué funciona offline
Crear/editar registros, ejecutar pruebas, capturar fotos, adjuntar evidencias,
crear punch list, firmar protocolos, consultar lo previamente sincronizado.

### Assets binarios (fotos/videos)
Se guardan en IndexedDB como Blob + metadatos; al sincronizar suben a Storage y
se reemplaza la referencia local por la URL remota.

---

## 5. Seguridad

- **Autenticación**: Supabase Auth (JWT). Contraseña temporal aleatoria al crear
  usuario, envío por email, cambio obligatorio en primer login.
- **Autorización**: RBAC (roles: admin, supervisor, técnico, cliente) + permisos
  granulares configurables, aplicados con **RLS** en Postgres.
- **Auditoría**: tabla `audit_log` poblada por triggers (usuario, fecha, acción,
  IP, dispositivo). Borrado lógico (`deleted_at`) — nunca físico.
- **Sesiones**: control de sesiones activas, expiración y refresh tokens.
- Cifrado: TLS en tránsito; cifrado en reposo (Postgres + Storage).

---

## 6. Jerarquía del dominio

```
Proyecto → Área → Sistema → Subsistema → Equipo → Prueba → Evidencias → Informes
```

Ver modelo entidad-relación en `docs/02-MODELO-DATOS.md` y DDL en `database/`.

---

## 7. Roadmap por fases
Ver `docs/03-ROADMAP.md`.
