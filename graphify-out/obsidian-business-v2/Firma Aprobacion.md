---
tags: [entidad]
tipo: Firma digital
---

# Firma y Aprobación

Registro digital de la aprobación formal de un [[Protocolo]] por parte de los responsables del proceso de comisionamiento.

## Pertenece a
[[Protocolo]]

## Utilizada en
- [[FAT]] — firma del fabricante + cliente
- [[SAT]] — firma del contratista + supervisor + cliente
- [[Energizacion]] — firma del supervisor eléctrico (obligatoria)
- [[Funcional]] — firma de todos los interesados

## Participantes típicos
`supervisor de comisionamiento`, `representante del cliente`, `inspector QA/QC`, `responsable técnico`

## Metadatos capturados
`usuario`, `rol al momento de firmar`, `imagen de la firma`, `timestamp`, `IP`, `dispositivo`

## Validez legal
La firma digital en [[CommissionPro]] tiene trazabilidad completa: hash del documento + datos del firmante. Cumple con requisitos de [[Fase C Trazabilidad|trazabilidad legal]].

## Contribuye a
[[Dossier Precomisionamiento]] — valida el documento como evidencia legal del proceso
