# Roadmap de Desarrollo — CommissionPro

## Fase 0 — Fundamentos (DONE)
- Documento de arquitectura
- Modelo entidad-relación
- Estructura de carpetas y repositorio

## Fase 1 — Datos (DONE)
- Esquema PostgreSQL completo (tablas, índices, FKs)
- RBAC + permisos
- Auditoría por triggers + borrado lógico
- RLS (Row Level Security) base
- Seeds (roles, permisos, datos demo)

## Fase 2 — Scaffold App
- Next.js 15 + TS + Tailwind
- PWA (manifest + service worker)
- Dexie/IndexedDB y modelo local
- Sistema de diseño (modo claro/oscuro, botones grandes "modo guante")

## Fase 3 — Auth & Roles
- Login / logout, JWT
- Contraseña temporal + cambio obligatorio
- Recuperación de contraseña
- Guards por rol/permiso
- Bitácora de accesos

## Fase 4 — MVP Núcleo
- CRUD Proyectos → Áreas → Sistemas → Subsistemas → Equipos
- Constructor de formularios dinámicos
- Checklists (cumple/no cumple/no aplica)
- Motor de sincronización offline

## Fase 5 — Pruebas, Firmas, Aprobaciones
- Ejecución de protocolos (precom, FAT, SAT, loop, energización, funcionales)
- Firma electrónica
- Flujo de aprobación multinivel

## Fase 6 — Evidencias y Documental
- Captura de fotos con GPS + anotaciones
- Comparativo antes/durante/después
- Repositorio documental con versiones

## Fase 7 — Dashboard y Dossier
- Dashboard ejecutivo (KPI, semáforos, heatmaps, tendencias)
- Generación PDF de protocolos
- Dossier digital final

## Fase 8 — Empresarial
- Notificaciones (push/email)
- Capa de IA (predicción retrasos, cuellos de botella, fallas repetitivas)
- Hardening de seguridad, escalabilidad, observabilidad
- Plan de despliegue, backup/restore, DR
