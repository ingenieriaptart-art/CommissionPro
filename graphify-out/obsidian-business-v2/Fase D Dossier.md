---
tags: [fase]
tipo: Fase de producto
estado: Planificada
---

# Fase D — Dossier Automático

Generación automática del [[Dossier Precomisionamiento|dossier de precomisionamiento]] en PDF al completar todos los protocolos de un equipo o proyecto.

## Parte de
[[CommissionPro]] — roadmap de producto

## Construye sobre
[[Dossier Precomisionamiento]], [[Protocolo]], [[Evidencia]], [[Firma Aprobacion]]

## Objetivo
Eliminar la generación manual del dossier (actualmente en Excel o Word). El sistema ensambla automáticamente: portada, índice, protocolos, checklists, fotos, firmas.

## Tecnología
Edge Functions en Supabase Deno con librería de generación PDF.
Las imágenes [[Evidencia|de evidencia]] se incrustan directamente en el PDF.

## Formatos de entrega
PDF estándar + PDF/A para archivado legal

## Impacto
Reduce el tiempo de generación del dossier de semanas a minutos. Elimina errores humanos en el armado manual.
