---
tags: [protocolo]
tipo: Verificación de lazo de control
---

# Loop Check

Verificación de la integridad del lazo de instrumentación: confirma que la señal generada por el instrumento de campo ([[TAG]]) llega correctamente al sistema de control (DCS/PLC/RTU).

## Es un tipo de
[[Protocolo]]

## Ejecutado sobre
[[Equipo]] de instrumentación (transmisores, válvulas de control, detectores)

## Propósito
Confirmar la cadena completa: sensor → cableado → tablero → RTU/PLC → HMI. Sin Loop Check aprobado, no se puede confiar en las lecturas del sistema de control.

## Verificaciones típicas
- Señal 4-20 mA en todo el recorrido
- Calibración del instrumento
- Dirección de acción de válvulas
- Configuración de tag en el DCS/PLC
- Alarmas configuradas y funcionales

## Fuertemente vinculado a
[[TAG]] — cada Loop Check corresponde a un TAG de instrumentación
`io_type` y `rtu_destination` del [[Equipo]] son campos clave

## Prerequisito para
[[Energizacion]] y [[SAT]]

## Contribuye a
[[Dossier Precomisionamiento]]
